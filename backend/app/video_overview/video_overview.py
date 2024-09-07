from fastapi import APIRouter
from .video_overview_deps import get_openai_client, system, user
from .video_overview_schemas import VideoMetadata, VideoOverviewFunctionCallResponse
from youtube_transcript_api import YouTubeTranscriptApi
from typing import List
import re
from .video_overview_deps import get_youtube_client

router = APIRouter()

testing = True


chapter_max_range = 5 if testing else 10


def get_video_overview_prompt(chapters: List[str]):
    chapter_dne_str = f"- Create between 3-{chapter_max_range} chapters depending on the density / complexity of the transcript."

    chapters_str = "\n".join([f"{i}: {chapter}" for i, chapter in enumerate(chapters)])
    chapter_exist_str = f"- Use the following chapters: \n{chapters_str}"
    video_overview_prompt = f"""
Be concise. Your job is to generate a video overview given a video transcript. 
Note that the transcript is not perfect, so you may need to assume where sentences start and end.
Follow these guidelines:
{chapter_dne_str if len(chapters) == 0 else chapter_exist_str}
- Output 2-4 key points per chapter. Each key point should be a clear short sentence, like a takeaway.
- Output 2-4 key quotes per chapter. Key quotes must be short and exact.
"""
    return video_overview_prompt


def get_transcript(video_id: str):
    transcript = YouTubeTranscriptApi.get_transcript(video_id)
    return transcript


def get_video_chapters(video_id) -> VideoMetadata:
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

                return chapters_list
            else:
                return VideoMetadata(title=title, chapters=[])
        else:
            print("Video not found or no description available.")
            return VideoMetadata(title=title, chapters=[])
    except Exception as e:
        print(f"An error occurred: {str(e)}")
        return VideoMetadata(title=title, chapters=[])


# testing video id: VMj-3S1tku0
@router.get("/generate-overview/{video_id}")
async def generate_video_overview(video_id: str):
    openai_client = get_openai_client()

    transcript = get_transcript(video_id)
    transcript_text = " ".join([i["text"] for i in transcript])

    chapter_datas = get_video_chapters(video_id)
    chapters = [data["title"] for data in chapter_datas]
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
        model="gpt-4o-2024-08-06",
        messages=messages,
        response_format=VideoOverviewFunctionCallResponse,
    )
    # TODO: identify timestamps for key quotes
    # TODO: generate screenshots for each chapter and store them

    video_overview = completion.choices[0].message
    return video_overview


@router.post("/get-overview/{video_id}")
async def get_video_overview(video_id: str):
    openai_client = get_openai_client()
    return {"message": f"Hello world {video_id}"}
