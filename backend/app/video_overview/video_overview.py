from fastapi import APIRouter, Depends, Request
from pydantic import ValidationError, BaseModel

from .video_overview_deps import (
    assistant,
    get_anthropic_client,
    user,
)
from .video_overview_schemas import (
    Chapter,
    ChapterData,
    KeyPoint,
    Transcript,
    VideoOverview,
    VideoOverviewFunctionCallResponse,
)
from typing import List, Optional
from .video_overview_deps import get_supabase_client
from fastapi import HTTPException
from .video_overview_services import (
    get_claude_completion,
    get_transcript,
    get_video_metadata,
    incr_rate_limit,
    rate_limit_exceeded,
)
from .video_overview_deps import get_logger

logger = get_logger()

router = APIRouter()

testing = False
chapter_min_range = 3 if testing else 5
chapter_max_range = 5 if testing else 30


def get_system_prompt(existing_chapters: List[str] | None = None):
    chapters_str = "\n".join(existing_chapters)
    chapters_info = (
        f"""The existing chapters are:
 {chapters_str}"""
        if existing_chapters
        else ""
    )
    return f"""Your job is to generate a video overview for the provided transcript. 
The transcript might contain typos. Do your best to infer the correct text.
Output about {chapter_min_range}-{chapter_max_range} chapters depending on the length and density of the transcript.
For each chapter, output the following:
- a chapter title that encapsulates the current section
- 2-8 key points to provide an overview of the chapter. Each key point is a sentence that is either a direct quote or an essential fact / detail.
    - Quotes are clear and information dense.
    - Key points are concise and entity dense, with concrete examples when relevant.
    - Key points can be a paraphrase or summary of a few sentences.
- for each key point, output the start time of the beginning of the key point in the transcript.
- 2-4 associations that a user might search or associate with this chapter. Each association should be a specific keyword or phrase.

{chapters_info}"""


def get_example_output():
    # TODO: test formatting of key points and times
    return VideoOverviewFunctionCallResponse(
        chapters=[
            ChapterData(
                title="How to Build an Minimum Viable Product (MVP)?",
                key_points=[
                    '"The best advice is to actually launch something quickly and iterate get a product into the hands of your customers and then learn whether it helps them or doesn\'t and then iterate it improve it over time"',
                    '"You\'d only really start learning about your user when you put a product in front of it"',
                ],
                key_point_start_times=[
                    34,
                    55,
                ],
                associations=[
                    "MVP",
                    "Iteration over theoretical planning",
                ],
            ),
            ChapterData(
                title="Pre-launch Startup Goals",
                key_points=[
                    "Focus on rapid product launch and iteration",
                    "Engage with initial customers to improve product usefulness",
                    '"More often than not after three four five six iterations your VP is going to be very different you have learned so much"',
                ],
                key_point_start_times=[
                    150,
                    162,
                    251,
                ],
                associations=[
                    "Iterative product development",
                ],
            ),
            ChapterData(
                title="Founders Biggest Fear",
                key_points=[
                    "Fear of negative user reactions to imperfect products is often unfounded",
                    "\"In most cases the people who are interested in talking to a startup are early adopters they're used to using products that don't work very well\"",
                    '"It is bad to spend one year building your MVP because you\'re afraid the first customer might not like it"',
                ],
                key_point_start_times=[
                    249,
                    275,
                    340,
                ],
                associations=[
                    "Fear of negative user reactions",
                    "Early adopters",
                    "Imperfect products",
                ],
            ),
            ChapterData(
                title="Examples - Software MVP",
                key_points=[
                    "Successful companies often start with limited functionality MVPs",
                    "MVPs are typically fast to build and appeal to a small set of users",
                    '"All of these products were fast to build they could get out of the market quickly"',
                ],
                key_point_start_times=[
                    370,
                    378,
                    400,
                ],
                associations=[
                    "limited functionality MVPs",
                    "stripe",
                    "airbnb",
                ],
            ),
        ]
    )


def get_timestamped_transcript_text(transcript: Transcript):
    result = ""
    for moment in transcript.moments:
        time = moment.start
        text = moment.text
        result += f"{time}: {text}\n"
    return result


class GenerateOverviewRequest(BaseModel):
    user_api_key: Optional[str] = None


# test url: https://www.youtube.com/watch?v=C27RVio2rOs
# testing video id: VMj-3S1tku0
@router.post("/generate-overview/{video_id}")
async def generate_video_overview(
    video_id: str,
    request: Request,
    body: GenerateOverviewRequest,
    supabase=Depends(get_supabase_client),
):
    user_api_key = body.user_api_key
    existing_overview = await get_video_overview(video_id, supabase)
    if existing_overview:
        return existing_overview

    if await rate_limit_exceeded(request, supabase):
        # TODO: allow user to use their token in this case
        if not user_api_key:
            raise HTTPException(
                status_code=429,
                detail="Free tier quota exceeded. Please use your API key to continue.",
            )
        anthropic_client = get_anthropic_client(user_api_key)
    else:
        anthropic_client = get_anthropic_client()
    logger.info(f"Generate new video overview for video_id: {video_id}")

    transcript = await get_transcript(video_id)
    if not transcript:
        raise HTTPException(
            status_code=422,
            detail="Unable to process request. Transcript not available for the given video ID.",
        )
    transcript_text = get_timestamped_transcript_text(transcript)

    video_metadata = get_video_metadata(video_id)
    chapters = [data.title for data in video_metadata.chapters]
    if testing:
        chapters = chapters[:chapter_max_range]
    max_transcript_length = 20_000 if testing else 200_000
    if len(transcript_text) > max_transcript_length:
        logger.warning(
            f"transcript length is {len(transcript_text)}, truncating to {max_transcript_length}"
        )
        transcript_text = transcript_text[:max_transcript_length]

    example_output = get_example_output()
    messages = [
        user(
            "Here is the transcript: \n<REDACTED transcript for 'How to Build An MVP'>"
        ),
        assistant(example_output.model_dump_json()),
        user(f"Here is the transcript: \n{transcript_text}"),
        assistant("Here is the JSON overview:\n{"),
    ]
    system_prompt = get_system_prompt(existing_chapters=chapters)
    content = get_claude_completion(messages, system_prompt, anthropic_client)

    result = "{" + content

    json_end = result.rfind("}")

    if json_end == -1:
        raise ValueError("No valid JSON found in the response")

    json_content = result[: json_end + 1]

    try:
        response = VideoOverviewFunctionCallResponse.model_validate_json(json_content)
        formatted_chapters = [
            Chapter(
                title=chapter.title,
                key_points=[
                    KeyPoint(text=point, time=time)
                    for point, time in zip(
                        chapter.key_points, chapter.key_point_start_times
                    )
                ],
                associations=chapter.associations,
            )
            for chapter in response.chapters
        ]
    except ValidationError as e:
        logger.error(f"JSON validation error: {str(e)}")
        raise ValueError("Invalid JSON structure in the response")

    video_overview = VideoOverview(
        video_title=video_metadata.title,
        chapters=formatted_chapters,
        published_iso=video_metadata.published_iso,
        duration_iso=video_metadata.duration_iso,
        channel_title=video_metadata.channel_title,
    )
    video_overview_dict = video_overview.model_dump()

    try:
        supabase.table("video_overviews").insert(
            {
                "video_id": video_id,
                "video_title": video_metadata.title,
                "overview": video_overview_dict,
            }
        ).execute()
        await incr_rate_limit(request, supabase)
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


# used for testing
@router.get("/get-transcript-text/{video_id}")
async def get_transcript_text_by_video_id(video_id: str):
    transcript = await get_transcript(video_id)
    transcript_text = " ".join([i.text for i in transcript.moments])
    return transcript_text


# used for testing
@router.get("/get-video-metadata/{video_id}")
async def get_video_metadata_by_video_id(video_id: str):
    metadata = get_video_metadata(video_id)
    return metadata
