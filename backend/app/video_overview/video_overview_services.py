import os
from anthropic import RateLimitError
import re

from ..config import is_prod

from .video_overview_deps import get_youtube_client
from .video_overview_schemas import Moment, Transcript, VideoMetadata
from .video_overview_deps import get_supabase_client
from fastapi import Depends, HTTPException, Request
from youtube_transcript_api import YouTubeTranscriptApi
import logging

logger = logging.getLogger(__name__)


TOTAL_API_USAGE_LIMIT = 100
USER_RATE_LIMIT = 10


def normalize_spacing(text: str) -> str:
    # Remove leading and trailing whitespace
    text = text.strip()
    # Replace multiple spaces with a single space
    text = re.sub(r"\s+", " ", text)
    # Remove newlines
    text = text.replace("\n", " ")
    return text


async def get_transcript(video_id: str) -> Transcript | None:
    # youtube transcript api works locally but not in cloud envs
    # https://github.com/jdepoix/youtube-transcript-api/issues/303
    try:
        if is_prod():
            username = os.getenv("PROXY_USERNAME")
            password = os.getenv("PROXY_PASSWORD")
            proxy_url = f"http://{username}:{password}@gate.smartproxy.com:10001"
            proxy = {"http": proxy_url, "https": proxy_url}
            transcript = YouTubeTranscriptApi.get_transcript(video_id, proxies=proxy)

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
    cf_connecting_ip = request.headers.get("cf-connecting-ip")
    if not cf_connecting_ip:
        if is_prod():
            raise HTTPException(
                status_code=500, detail="Unexpected error: no cf-connecting-ip"
            )
        else:
            # When running locally, assume rate limit is exceeded
            return True
    result = (
        supabase.table("rate_limits")
        .select("count")
        .eq("ip", cf_connecting_ip)
        .execute()
    )
    if not result.data:
        return False
    count = result.data[0]["count"]
    return count >= USER_RATE_LIMIT


async def incr_user_rate_limit(request: Request, supabase=Depends(get_supabase_client)):
    # Assumption: this header is guaranteed to exist when request comes from cloudflare tunnel
    cf_connecting_ip = request.headers.get("cf-connecting-ip")
    if not cf_connecting_ip:
        if is_prod():
            raise HTTPException(
                status_code=500, detail="Unexpected error: no cf-connecting-ip"
            )
        else:
            return
    result = (
        supabase.table("rate_limits")
        .select("count")
        .eq("ip", cf_connecting_ip)
        .execute()
    )
    new_count = result.data[0]["count"] + 1
    supabase.table("rate_limits").update({"count": new_count}).eq(
        "ip", cf_connecting_ip
    ).execute()


async def net_api_limit_reached(supabase, limit: int = TOTAL_API_USAGE_LIMIT):
    response = supabase.table("api_usage").select("total_hits").eq("id", 1).execute()
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
            model="claude-3-5-sonnet-20240620",
            system=system_prompt,
            messages=messages,
            max_tokens=3000,
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
