from functools import lru_cache
from fastapi import APIRouter, Depends
from .video_overview_deps import get_openai_client, system, user
from .video_overview_schemas import (
    Chapter,
    Moment,
    Quote,
    Transcript,
    VideoMetadata,
    VideoOverview,
    VideoOverviewFunctionCallResponse,
)
from youtube_transcript_api import YouTubeTranscriptApi
from typing import List, Tuple
import re
from .video_overview_deps import get_youtube_client, get_supabase_client
from fastapi import HTTPException


router = APIRouter()

testing = True


chapter_max_range = 5 if testing else 10


def get_video_overview_prompt(chapters: List[str]):
    chapter_dne_str = f"- Create between 3-{chapter_max_range} chapters depending on the density / complexity of the transcript."

    chapters_str = "\n".join([f"{i}: {chapter}" for i, chapter in enumerate(chapters)])
    chapter_exist_str = f"- Use the following chapters: \n{chapters_str}"
    video_overview_prompt = f"""
Be concise.
Your job is to generate a video overview given a video transcript.
The video overview should help the user understand the video contents at a glance and navigate the video while watching.
Note that the transcript is not perfect, so you may need to assume where sentences start and end.
Follow these guidelines:
{chapter_dne_str if len(chapters) == 0 else chapter_exist_str}
- Output 2-4 key points per chapter. Each key point should be an informational key detail or takeaway.
- Output 2-4 key quotes per chapter. Key quotes must be short and exact, including bad grammar, typos,and fluff. Do NOT wrap each quote in quotes.
"""
    return video_overview_prompt


async def get_transcript(video_id: str) -> Transcript:
    transcript = YouTubeTranscriptApi.get_transcript(video_id)
    return Transcript(
        moments=[
            Moment(text=i["text"], start=i["start"], duration=i["duration"])
            for i in transcript
        ]
    )


def get_video_metadata(video_id) -> VideoMetadata:
    try:
        youtube = get_youtube_client()
        request = youtube.videos().list(part="snippet", id=video_id)
        response = request.execute()
        title = response["items"][0]["snippet"]["title"]

        if "items" in response and len(response["items"]) > 0:
            description = response["items"][0]["snippet"]["description"]

            # Find the "Chapters:" section
            chapters_section = re.search(r"Chapters:\n(.*)$", description, re.DOTALL)

            if chapters_section:
                chapters_text = chapters_section.group(1).strip()
                chapter_pattern = r"(\d{2}:\d{2}:\d{2})\s(.+)"
                chapters = re.findall(chapter_pattern, chapters_text)

                chapters_list = [
                    {"timestamp": timestamp, "title": title.strip()}
                    for timestamp, title in chapters
                ]

                return VideoMetadata(title=title, chapters=chapters_list)
            else:
                return VideoMetadata(title=title, chapters=[])
        else:
            print("Video not found or no description available.")
            return VideoMetadata(title=title, chapters=[])
    except Exception as e:
        print(f"An error occurred: {str(e)}")
        return VideoMetadata(title=title, chapters=[])


@lru_cache(maxsize=None)
def get_index_to_timestamp(moments: Tuple[Tuple[str, int, int]]):
    # returns a map from char index in transcript to associated chunk timestamp in seconds
    index_to_timestamp = {}
    index = 0
    for text, start, duration in moments:
        for _ in text:
            index_to_timestamp[index] = start
            index += 1
    return index_to_timestamp


def get_approximate_timestamp(
    quote: str, transcript_text: str, transcript: Transcript
) -> int:
    index_to_timestamp = get_index_to_timestamp(
        tuple(
            [
                (moment.text, moment.start, moment.duration)
                for moment in transcript.moments
            ]
        )
    )

    quote_index = transcript_text.find(quote)
    if quote_index not in index_to_timestamp:
        return -1
    return index_to_timestamp[quote_index]


# testing video id: VMj-3S1tku0
@router.post("/generate-overview/{video_id}")
async def generate_video_overview(video_id: str, supabase=Depends(get_supabase_client)):
    openai_client = get_openai_client()

    transcript = await get_transcript(video_id)
    transcript_text = " ".join([i.text for i in transcript.moments])

    video_metadata = get_video_metadata(video_id)
    chapters = [data.title for data in video_metadata.chapters]
    if testing:
        chapters = chapters[:chapter_max_range]

    max_transcript_length = 4_000 if testing else 20_000
    if len(transcript_text) > max_transcript_length:
        print(
            f"transcript length is {len(transcript_text)}, truncating to {max_transcript_length}"
        )
        transcript_text = transcript_text[:max_transcript_length]

    messages = [
        system(get_video_overview_prompt(chapters)),
        user(f"Here is the transcript: \n{transcript_text}"),
    ]
    completion = openai_client.beta.chat.completions.parse(
        # model="gpt-4o-2024-08-06",
        model="gpt-4o-mini",
        messages=messages,
        response_format=VideoOverviewFunctionCallResponse,
    )
    # TODO: generate screenshots for each chapter and store them

    response = completion.choices[0].message
    raw_chapters = response.parsed.chapters
    video_title = video_metadata.title

    chapters = []
    for chapter in raw_chapters:
        title = chapter.title
        key_points = chapter.key_points
        quotes: List[Quote] = []
        for quote in chapter.key_quotes:
            # TODO: refactor to avoid recomputing the internal map
            time_in_s = get_approximate_timestamp(quote, transcript_text, transcript)
            quotes.append(Quote(text=quote, time=time_in_s))
        chapters.append(Chapter(title=title, key_points=key_points, key_quotes=quotes))

    video_overview = VideoOverview(
        video_title=video_title, chapters=chapters, screenshots=[]
    )
    video_overview_dict = video_overview.model_dump()

    try:
        supabase.table("video_overviews").insert(
            {"video_id": video_id, "overview": video_overview_dict}
        ).execute()
        print(f"Video overview saved for video_id: {video_id}")
    except Exception as e:
        print(f"Error saving video overview: {str(e)}")

    return video_overview


@router.get("/get-overview/{video_id}")
async def get_video_overview(video_id: str, supabase=Depends(get_supabase_client)):
    try:
        result = (
            supabase.table("video_overviews")
            .select("overview")
            .eq("video_id", video_id)
            .execute()
        )
        if result.data:
            return result.data[0]["overview"]["chapters"]
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
