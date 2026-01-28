import os
from anthropic import RateLimitError
import re
from openai import OpenAI

from ..config import is_prod

from .video_overview_deps import get_youtube_client, get_anthropic_client
from .video_overview_schemas import Moment, Transcript, VideoMetadata, ModelChoice, MODEL_IDS
from .video_overview_deps import get_supabase_client
from fastapi import Depends, HTTPException, Request
from youtube_transcript_api import YouTubeTranscriptApi
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


GLOBAL_FREE_TIER_LIMIT = 250
# ~1000 chars per minute of speech, 2 hours = 120 minutes = 120,000 chars
MAX_FREE_TIER_TRANSCRIPT_LENGTH = 120_000


def normalize_spacing(text: str) -> str:
    # Remove leading and trailing whitespace
    text = text.strip()
    # Replace multiple spaces with a single space
    text = re.sub(r"\s+", " ", text)
    # Remove newlines
    text = text.replace("\n", " ")
    return text


def build_decodo_proxy_from_env() -> dict | None:
    """Build Decodo (Smartproxy) residential proxy configuration from environment variables.

    Returns a proxies dict for use with requests/youtube_transcript_api,
    or None if required env vars are not set.
    """
    username = os.getenv("DECODO_PROXY_USERNAME")
    password = os.getenv("DECODO_PROXY_PASSWORD")

    # Decodo residential proxy endpoint
    host = "gate.decodo.com"
    port = "10001"

    logger.info(f"Decodo proxy env vars - username: {'set' if username else 'missing'}, password: {'set' if password else 'missing'}")

    if not all([username, password]):
        logger.error("Missing required Decodo proxy environment variables")
        return None

    proxy_url = f"http://{username}:{password}@{host}:{port}"
    return {"http": proxy_url, "https": proxy_url}


async def get_transcript(video_id: str) -> Transcript | None:
    # youtube transcript api works locally but not in cloud envs
    # https://github.com/jdepoix/youtube-transcript-api/issues/303
    try:
        logger.info(f"Fetching transcript for video {video_id}")
        if is_prod():
            proxy = build_decodo_proxy_from_env()
            if not proxy:
                logger.warning("Production environment detected but Decodo proxy env vars not set. Transcript fetching may fail.")
            
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


async def global_free_tier_limit_reached(supabase) -> bool:
    """Check if global free tier limit (100 summaries) has been reached."""
    response = supabase.table("api_usage").select("total_hits").eq("id", 1).execute()
    if len(response.data) == 0:
        return False
    return response.data[0]["total_hits"] >= GLOBAL_FREE_TIER_LIMIT


async def incr_api_usage(supabase):
    total_hits = supabase.table("api_usage").select("total_hits").eq("id", 1).execute()
    total_hits = total_hits.data[0]["total_hits"]
    supabase.table("api_usage").update({"total_hits": total_hits + 1}).eq(
        "id", 1
    ).execute()


async def get_claude_completion(messages, system_prompt, anthropic_client, model_choice=None) -> str:
    # Default to Haiku if no model specified
    if model_choice is None:
        model_id = MODEL_IDS[ModelChoice.HAIKU_4_5]
    else:
        model_id = MODEL_IDS[model_choice]

    try:
        completion = anthropic_client.messages.create(
            model=model_id,
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
        tuple: (anthropic_client, should_increment_usage)
    """
    # If user has their own API key, use it directly (no limits)
    if user_api_key:
        return get_anthropic_client(True, user_api_key), False

    # Check global free tier limit
    limit_reached = await global_free_tier_limit_reached(supabase)
    if limit_reached:
        raise HTTPException(
            status_code=429,
            detail="All 250 free video summaries have been used. Please add your Claude API key to continue.",
        )

    return get_anthropic_client(False), True
