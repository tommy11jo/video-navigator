from anthropic import (
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
    RateLimitError,
)
from youtube_transcript_api import YouTubeTranscriptApi
import re
from .video_overview_deps import get_youtube_client
from .video_overview_schemas import Transcript, VideoMetadata, Moment
from .video_overview_deps import get_logger, get_supabase_client
from fastapi import Depends, HTTPException, Request

logger = get_logger()
RATE_LIMIT = 2


def normalize_spacing(text: str) -> str:
    # Remove leading and trailing whitespace
    text = text.strip()
    # Replace multiple spaces with a single space
    text = re.sub(r"\s+", " ", text)
    # Remove newlines
    text = text.replace("\n", " ")
    return text


async def get_transcript(video_id: str) -> Transcript | None:
    try:
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
        truncated_error = str(e)[:100] + "..." if len(str(e)) > 100 else str(e)
        raise HTTPException(
            status_code=422,
            detail=f"Failed to fetch transcript for video {video_id}: {truncated_error}",
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
    # TODO: Make sure this work with cloudflare tunnel setup
    cf_connecting_ip = request.headers.get("cf-connecting-ip")
    # When running locally where the cf-connecting-ip is not set, assume rate limit is exceeded
    if not cf_connecting_ip:
        return True
    result = (
        supabase.table("rate_limits")
        .select("count")
        .eq("ip", cf_connecting_ip)
        .execute()
    )
    count = result.data[0]["count"]
    return count >= RATE_LIMIT


async def incr_user_rate_limit(request: Request, supabase=Depends(get_supabase_client)):
    # Assumption: this header is guaranteed to exist when request comes from cloudflare tunnel
    cf_connecting_ip = request.headers.get("cf-connecting-ip")
    if not cf_connecting_ip:
        return
    supabase.table("rate_limits").upsert(
        {"ip": cf_connecting_ip, "count": 1},
        on_conflict="ip",
        update_columns=["count"],
        count_column="count",
    ).execute()


async def check_and_update_api_usage(supabase, limit: int = 2):
    response = supabase.table("api_usage").select("total_hits").eq("id", 1).execute()

    if response.data:
        total_hits = response.data[0]["total_hits"]

        if total_hits >= limit:
            return False

        total_hits += 1
        supabase.table("api_usage").update({"total_hits": total_hits}).eq(
            "id", 1
        ).execute()
    else:
        supabase.table("api_usage").insert({"id": 1, "total_hits": 1}).execute()

    return True


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
    except (APIStatusError, APITimeoutError, APIConnectionError) as e:
        logger.error(f"API error: {str(e)}")
        raise HTTPException(status_code=e.status_code, detail=f"API error: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

    content = completion.content[0].text
    return content
