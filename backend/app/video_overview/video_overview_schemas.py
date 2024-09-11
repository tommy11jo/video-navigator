from pydantic import BaseModel
from typing import List, Optional
from enum import Enum


class ChatRole(str, Enum):
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"


class KeyPoint(BaseModel):
    text: str
    time: float


class Chapter(BaseModel):
    title: str
    key_points: List[KeyPoint]
    associations: List[str]


class ChapterData(BaseModel):
    title: str
    key_points: List[str]
    key_point_start_times: List[float]
    associations: List[str]


class VideoOverviewFunctionCallResponse(BaseModel):
    chapters: List[ChapterData]


class VideoOverview(BaseModel):
    video_title: str
    chapters: List[Chapter]
    published_iso: str
    duration_iso: str
    channel_title: str


class Message(BaseModel):
    role: Optional[ChatRole] = None
    name: Optional[str] = None
    content: str


class YTChapterData(BaseModel):
    time_in_secs: int
    title: str


class VideoMetadata(BaseModel):
    title: str
    chapters: List[YTChapterData]
    published_iso: str
    duration_iso: str
    channel_title: str


class Moment(BaseModel):
    text: str
    start: float  # in seconds
    duration: float  # in seconds


class Transcript(BaseModel):
    moments: List[Moment]
