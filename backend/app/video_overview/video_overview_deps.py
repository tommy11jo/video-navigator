from openai import OpenAI
from dotenv import load_dotenv
from .video_overview_schemas import ChatRole
import os
from googleapiclient.discovery import build

load_dotenv()
ai = OpenAI()


def get_openai_client():
    return ai


def assistant(content: str):
    return {"role": ChatRole.ASSISTANT, "content": content}


def user(content: str):
    return {"role": ChatRole.USER, "content": content}


def system(content: str):
    return {"role": ChatRole.SYSTEM, "content": content}


def get_youtube_client():
    yt_api_key = os.getenv("YOUTUBE_API_KEY")
    return build("youtube", "v3", developerKey=yt_api_key)
