from fastapi import APIRouter, Depends

from .video_overview_deps import get_openai_client, system, user
from .video_overview_schemas import (
    Chapter,
    Quote,
    VideoOverview,
    VideoOverviewFunctionCallResponse,
)
from typing import List, Optional
from .video_overview_deps import get_supabase_client
from fastapi import HTTPException
from .video_overview_services import (
    get_transcript,
    get_video_metadata,
    get_approximate_timestamp,
)
from .video_overview_deps import get_logger
import re

logger = get_logger()

router = APIRouter()

testing = True
chapter_max_range = 5 if testing else 10


def get_video_overview_prompt(chapters: List[str]):
    chapter_dne_str = f"- Create between 3-{chapter_max_range} chapters depending on the density / complexity of the transcript."

    chapters_str = "\n".join([f"{i}: {chapter}" for i, chapter in enumerate(chapters)])
    chapter_exist_str = f"- Use the following chapters: \n{chapters_str}"
    video_overview_prompt = f"""
Your job is to generate a video overview given a video transcript.
The video overview should help the user understand the video contents at a glance and navigate the video while watching.
Note that the transcript is not perfect, so you may need to assume where sentences start and end.
Follow these guidelines:
{chapter_dne_str if len(chapters) == 0 else chapter_exist_str}
- Output 2-4 points per chapter. Each point should be an informational key detail or takeaway.
- Output 2-4 quotes per chapter. 
    - Each quote must be self-contained and short.
    - Each quote must be an EXACT segment from the transcript. 
    - Do not add extra punctations. 
    - Do not fix typos.
    - Do not change the capitalization.
    - Also, do not wrap each quote in quotes.
"""
    return video_overview_prompt


def normalize_spacing(text: str) -> str:
    # Remove leading and trailing whitespace
    text = text.strip()
    # Replace multiple spaces with a single space
    text = re.sub(r"\s+", " ", text)
    # Remove newlines
    text = text.replace("\n", " ")
    return text


# testing video id: VMj-3S1tku0
@router.post("/generate-overview/{video_id}")
async def generate_video_overview(video_id: str, supabase=Depends(get_supabase_client)):
    openai_client = get_openai_client()

    transcript = await get_transcript(video_id)
    transcript_text = " ".join([normalize_spacing(i.text) for i in transcript.moments])

    video_metadata = get_video_metadata(video_id)
    chapters = [data.title for data in video_metadata.chapters]
    chapter_times = [data.time_in_secs for data in video_metadata.chapters]
    if testing:
        chapters = chapters[:chapter_max_range]
        chapter_times = chapter_times[:chapter_max_range]
    max_transcript_length = 10_000 if testing else 40_000
    if len(transcript_text) > max_transcript_length:
        logger.warning(
            f"transcript length is {len(transcript_text)}, truncating to {max_transcript_length}"
        )
        transcript_text = transcript_text[:max_transcript_length]

    messages = [
        system(get_video_overview_prompt(chapters)),
        user(f"Here is the transcript: \n{transcript_text}"),
    ]
    completion = openai_client.beta.chat.completions.parse(
        model="gpt-4o-2024-08-06",
        # model="gpt-4o-mini",
        messages=messages,
        response_format=VideoOverviewFunctionCallResponse,
    )

    response = completion.choices[0].message
    raw_chapters = response.parsed.chapters
    video_title = video_metadata.title

    chapters: List[Chapter] = []
    for i, chapter in enumerate(raw_chapters):
        title = chapter.title
        key_points = chapter.key_points
        quotes: List[Quote] = []
        for quote in chapter.key_quotes:
            time_in_secs = get_approximate_timestamp(quote, transcript_text, transcript)
            quotes.append(Quote(text=quote, time=time_in_secs))
        time_in_secs = chapter_times[i] if len(chapter_times) > 0 else -1
        chapters.append(
            Chapter(
                title=title,
                key_points=key_points,
                key_quotes=quotes,
                time_in_secs=time_in_secs,
            )
        )

    video_overview = VideoOverview(
        video_title=video_title,
        chapters=chapters,
        published_iso=video_metadata.published_iso,
        duration_iso=video_metadata.duration_iso,
        channel_title=video_metadata.channel_title,
    )
    video_overview_dict = video_overview.model_dump()

    try:
        supabase.table("video_overviews").insert(
            {
                "video_id": video_id,
                "overview": video_overview_dict,
                "screenshot_urls": [],
            }
        ).execute()
        logger.info(f"Video overview saved for video_id: {video_id}")
    except Exception as e:
        logger.error(f"Error saving video overview: {str(e)}")

    return video_overview


@router.get("/get-overview/{video_id}")
async def get_video_overview(
    video_id: str, supabase=Depends(get_supabase_client)
) -> Optional[VideoOverview]:
    try:
        result = (
            supabase.table("video_overviews")
            .select("overview")
            .eq("video_id", video_id)
            .execute()
        )
        if result.data:
            return VideoOverview(**result.data[0]["overview"])
        else:
            return None
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error retrieving video overview: {str(e)}"
        )


@router.get("/get-transcript/{video_id}")
async def get_transcript_by_video_id(video_id: str):
    transcript = await get_transcript(video_id)
    return transcript


@router.get("/get-video-metadata/{video_id}")
async def get_video_metadata_by_video_id(video_id: str):
    metadata = get_video_metadata(video_id)
    return metadata
