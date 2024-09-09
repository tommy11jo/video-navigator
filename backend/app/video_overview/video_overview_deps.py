from openai import OpenAI
from dotenv import load_dotenv
from .video_overview_schemas import ChatRole
import os
from googleapiclient.discovery import build
from supabase import create_client
import logging

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


def get_supabase_client():
    return create_client(
        os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_API_KEY")
    )


def get_logger():
    logging.basicConfig(level=logging.WARNING)
    logger = logging.getLogger(__name__)
    # uncomment for dev mode
    logger.setLevel(logging.DEBUG)
    return logger
