from googleapiclient.discovery import build
from dotenv import load_dotenv
import os
import re

load_dotenv()

yt_api_key = os.getenv("YOUTUBE_API_KEY")
youtube = build("youtube", "v3", developerKey=yt_api_key)


def get_video_chapters(video_id):
    try:
        request = youtube.videos().list(part="snippet", id=video_id)
        response = request.execute()

        if "items" in response and len(response["items"]) > 0:
            description = response["items"][0]["snippet"]["description"]

            # Find the "Chapters:" section
            chapters_section = re.search(r"Chapters:\n(.*)$", description, re.DOTALL)

            if chapters_section:
                chapters_text = chapters_section.group(1).strip()
                chapter_pattern = r"(\d{2}:\d{2}:\d{2})\s(.+)"
                chapters = re.findall(chapter_pattern, chapters_text)

                chapters_array = [
                    {"timestamp": timestamp, "title": title.strip()}
                    for timestamp, title in chapters
                ]

                print(chapters_array)
                return chapters_array
            else:
                print("No chapters found in the description.")
                return []
        else:
            print("Video not found or no description available.")
            return []
    except Exception as e:
        print(f"An error occurred: {str(e)}")
        return []


video_id = "VMj-3S1tku0"
get_video_chapters(video_id)
