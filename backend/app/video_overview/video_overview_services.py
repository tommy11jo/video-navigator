from youtube_transcript_api import YouTubeTranscriptApi
from typing import Tuple
from functools import lru_cache
import re
from .video_overview_deps import get_youtube_client
from .video_overview_schemas import Transcript, VideoMetadata, Moment
from .video_overview_deps import get_logger

logger = get_logger()


def normalize_spacing(text: str) -> str:
    # Remove leading and trailing whitespace
    text = text.strip()
    # Replace multiple spaces with a single space
    text = re.sub(r"\s+", " ", text)
    # Remove newlines
    text = text.replace("\n", " ")
    return text


async def get_transcript(video_id: str) -> Transcript:
    transcript = YouTubeTranscriptApi.get_transcript(video_id)
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


def timestamp_to_seconds(timestamp: str) -> int:
    hours, minutes, seconds = map(int, timestamp.split(":"))
    return hours * 3600 + minutes * 60 + seconds


def get_video_metadata(video_id) -> VideoMetadata:
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


@lru_cache(maxsize=None)
def get_index_to_time_in_secs(moments: Tuple[Tuple[str, int, int]]):
    # returns a map from char index in transcript to associated chunk timestamp in seconds
    index_to_time_in_secs = {}
    index = 0
    for text, start, _ in moments:
        for _ in text:
            index_to_time_in_secs[index] = start
            index += 1
    return index_to_time_in_secs


def get_approximate_timestamp(
    quote: str, transcript_text: str, transcript: Transcript
) -> int:
    # must add space to ensure proper indexing in transcript_text which has these spaces
    index_to_time_in_secs = get_index_to_time_in_secs(
        tuple(
            [
                (moment.text + " ", moment.start, moment.duration)
                for moment in transcript.moments
            ]
        )
    )

    quote_index = transcript_text.find(quote)
    if quote_index not in index_to_time_in_secs:
        return -1
    return index_to_time_in_secs[quote_index]
