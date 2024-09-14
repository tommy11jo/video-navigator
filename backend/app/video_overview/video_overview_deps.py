from typing import Optional
from openai import OpenAI
from dotenv import load_dotenv
from .video_overview_schemas import ChatRole
import os
from googleapiclient.discovery import build
from supabase import create_client
import logging
from fireworks.client import Fireworks
import anthropic

load_dotenv()


def get_openai_client():
    openai_client = OpenAI()
    return openai_client


def get_fireworks_client():
    fireworks_client = Fireworks(api_key=os.getenv("FIREWORKS_API_KEY"))
    return fireworks_client


def get_anthropic_client(api_key: Optional[str] = None):
    return anthropic.Anthropic(api_key=api_key or os.getenv("ANTROPIC_API_KEY"))


def get_supabase_client():
    return create_client(
        os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_API_KEY")
    )


def get_youtube_client():
    # yt_api_key = os.getenv("YOUTUBE_API_KEY")
    # return build("youtube", "v3", developerKey=yt_api_key)
    return build("youtube", "v3")


def get_logger():
    logging.basicConfig(level=logging.WARNING)
    logger = logging.getLogger(__name__)
    if os.getenv("ENVIRONMENT") == "dev":
        logger.setLevel(logging.DEBUG)
    return logger


def assistant(content: str):
    return {"role": ChatRole.ASSISTANT, "content": content}


def user(content: str):
    return {"role": ChatRole.USER, "content": content}


def system(content: str):
    return {"role": ChatRole.SYSTEM, "content": content}
