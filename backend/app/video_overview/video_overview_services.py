import os
from anthropic import RateLimitError
import re
from openai import OpenAI

from ..config import is_prod

from .video_overview_deps import get_youtube_client
from .video_overview_schemas import Moment, Transcript, VideoMetadata
from .video_overview_deps import get_supabase_client
from fastapi import Depends, HTTPException, Request
from youtube_transcript_api import YouTubeTranscriptApi
import logging
import random

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


TOTAL_API_USAGE_LIMIT = 500 
USER_RATE_LIMIT = 10


def normalize_spacing(text: str) -> str:
    # Remove leading and trailing whitespace
    text = text.strip()
    # Replace multiple spaces with a single space
    text = re.sub(r"\s+", " ", text)
    # Remove newlines
    text = text.replace("\n", " ")
    return text


def build_webshare_proxy_from_env() -> dict | None:
    """Build Webshare proxy configuration from environment variables.
    
    Returns a proxies dict for use with requests/youtube_transcript_api,
    or None if required env vars are not set.
    """
    
    username = os.getenv("WEBSHARE_PROXY_USERNAME")
    password = os.getenv("WEBSHARE_PROXY_PASSWORD")
    
    # Support multiple proxy servers - try rotating through them
    proxy_list_str = os.getenv("WEBSHARE_PROXY_LIST")
    if proxy_list_str:
        # Format: "host1:port1,host2:port2,host3:port3"
        proxies = [p.strip() for p in proxy_list_str.split(",")]
        selected = random.choice(proxies)
        host, port = selected.split(":")
        logger.info(f"Using random proxy from list: {host}:{port}")
    else:
        # Fallback to single proxy
        host = os.getenv("WEBSHARE_PROXY_HOST")
        port = os.getenv("WEBSHARE_PROXY_PORT")
    
    logger.info(f"Proxy env vars - username: {'set' if username else 'missing'}, password: {'set' if password else 'missing'}, host: {'set' if host else 'missing'}, port: {'set' if port else 'missing'}")
    
    if not all([username, password, host, port]):
        logger.error("Missing required Webshare proxy environment variables")
        return None
    
    proxy_url = f"http://{username}:{password}@{host}:{port}"
    return {"http": proxy_url, "https": proxy_url}


async def get_transcript(video_id: str) -> Transcript | None:
    # youtube transcript api works locally but not in cloud envs
    # https://github.com/jdepoix/youtube-transcript-api/issues/303
    try:
        logger.info(f"Fetching transcript for video {video_id}")
        if is_prod():
            proxy = build_webshare_proxy_from_env()
            if not proxy:
                logger.warning("Production environment detected but Webshare proxy env vars not set. Transcript fetching may fail.")
            
            transcript = YouTubeTranscriptApi.get_transcript(
                video_id,
                proxies=proxy if proxy else None,
            )
        else:
            transcript = YouTubeTranscriptApi.get_transcript(video_id)

        if not transcript:
            return None

        return Transcript(
            moments=[
                Moment(
                    text=normalize_spacing(i["text"]),
                    start=i["start"],
                    duration=i["duration"],
                )
                for i in transcript
            ]
        )
    except Exception as e:
        logger.error(f"Error fetching transcript for video {video_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching transcript for video {video_id}: {str(e)}",
        )


def timestamp_to_seconds(timestamp: str) -> int:
    hours, minutes, seconds = map(int, timestamp.split(":"))
    return hours * 3600 + minutes * 60 + seconds


async def get_video_metadata(video_id) -> VideoMetadata:
    try:
        youtube = get_youtube_client()
        request = youtube.videos().list(part="snippet,contentDetails", id=video_id)
        response = request.execute()
        item = response["items"][0]
        title = item["snippet"]["title"]
        metadata = item["snippet"]
        published_iso = metadata["publishedAt"]
        channel_title = metadata["channelTitle"]
        content_details = item["contentDetails"]
        duration_iso = content_details["duration"]
        chapters_list = []
        if "items" in response and len(response["items"]) > 0:
            description = response["items"][0]["snippet"]["description"]

            # Find the "Chapters:" section
            chapters_section = re.search(r"Chapters:\n(.*)$", description, re.DOTALL)

            if chapters_section:
                chapters_text = chapters_section.group(1).strip()
                chapter_pattern = r"(\d{2}:\d{2}:\d{2})\s(.+)"
                chapters = re.findall(chapter_pattern, chapters_text)

                chapters_list = [
                    {
                        "time_in_secs": timestamp_to_seconds(timestamp),
                        "title": title.strip(),
                    }
                    for timestamp, title in chapters
                ]

        else:
            logger.error(
                f"Video not found or no description available for video_id: {video_id}"
            )
    except Exception as e:
        logger.error(f"An error occurred: {str(e)}")
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
    return VideoMetadata(
        title=title,
        chapters=chapters_list,
        duration_iso=duration_iso,
        channel_title=channel_title,
        published_iso=published_iso,
    )


async def user_rate_limit_exceeded(
    request: Request, supabase=Depends(get_supabase_client)
):
    # Get client IP from request
    client_ip = request.client.host if request.client else None
    if not client_ip:
        # If no client IP available, don't enforce rate limit
        logger.warning("No client IP available for rate limiting")
        return False
    
    result = (
        supabase.table("rate_limits")
        .select("count")
        .eq("ip", client_ip)
        .execute()
    )
    if not result.data:
        return False
    count = result.data[0]["count"]
    return count >= USER_RATE_LIMIT


async def incr_user_rate_limit(request: Request, supabase=Depends(get_supabase_client)):
    # Get client IP from request
    client_ip = request.client.host if request.client else None
    if not client_ip:
        # If no client IP available, skip rate limit increment
        logger.warning("No client IP available for rate limit increment")
        return
    
    result = (
        supabase.table("rate_limits")
        .select("count")
        .eq("ip", client_ip)
        .execute()
    )
    new_count = result.data[0]["count"] + 1 if len(result.data) > 0 else 1
    supabase.table("rate_limits").update({"count": new_count}).eq(
        "ip", client_ip
    ).execute()


async def net_api_limit_reached(supabase, limit: int = TOTAL_API_USAGE_LIMIT):
    response = supabase.table("api_usage").select("total_hits").eq("id", 1).execute()
    if len(response.data) == 0:
        return False
    return response.data[0]["total_hits"] >= limit


async def incr_api_usage(supabase):
    total_hits = supabase.table("api_usage").select("total_hits").eq("id", 1).execute()
    total_hits = total_hits.data[0]["total_hits"]
    supabase.table("api_usage").update({"total_hits": total_hits + 1}).eq(
        "id", 1
    ).execute()


async def get_claude_completion(messages, system_prompt, anthropic_client) -> str:
    try:
        completion = anthropic_client.messages.create(
            # model="claude-sonnet-4-5-20250929",
            model="claude-haiku-4-5-20251001",
            system=system_prompt,
            messages=messages,
            max_tokens=20_000,
            temperature=0.2,
        )

    except RateLimitError as e:
        logger.error(f"Rate limit exceeded: {str(e)}")
        raise HTTPException(
            status_code=429, detail="Rate limit exceeded. Please try again later."
        )
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

    content = completion.content[0].text
    return content


async def get_anthropic_client_with_rate_limiting(
    request: Request, user_api_key: str | None, supabase
) -> tuple[object, bool]:
    """
    Determine which Anthropic client to use based on rate limits and API key availability.

    Returns:
        tuple: (anthropic_client, should_increment_user_rate_limit)
    """
    from .video_overview_deps import get_anthropic_client

    user_api_limit_reached = await user_rate_limit_exceeded(request, supabase)
    if user_api_limit_reached:
        if not user_api_key:
            raise HTTPException(
                status_code=429,
                detail="Free tier quota exceeded. Please use your API key to continue.",
            )
        else:
            return get_anthropic_client(True, user_api_key), False

    else:
        api_limit_reached = await net_api_limit_reached(supabase)
        if not api_limit_reached:
            return get_anthropic_client(False), True
        else:
            if not user_api_key:
                raise HTTPException(
                    status_code=429,
                    detail="Total API limit reached right now. Please use your API key.",
                )
            else:
                return get_anthropic_client(True, user_api_key), False
