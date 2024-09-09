from pydantic import BaseModel
from typing import List, Optional
from enum import Enum


class ChatRole(str, Enum):
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"


class ChapterForFunctionCall(BaseModel):
    title: str
    key_quotes: List[str]
    key_points: List[str]


class VideoOverviewFunctionCallResponse(BaseModel):
    chapters: List[ChapterForFunctionCall]


class Quote(BaseModel):
    text: str
    time: float


class Chapter(BaseModel):
    title: str
    key_quotes: List[Quote]
    key_points: List[str]
    time_in_secs: float


class VideoOverview(BaseModel):
    video_title: str
    chapters: List[Chapter]
    # screenshot urls are treated as extra data, not part of the core schema
    # because they take much longer to generate


class Message(BaseModel):
    role: Optional[ChatRole] = None
    name: Optional[str] = None
    content: str


class ChapterData(BaseModel):
    time_in_secs: int
    title: str


class VideoMetadata(BaseModel):
    title: str
    chapters: List[ChapterData]


class Moment(BaseModel):
    text: str
    start: float  # in seconds
    duration: float  # in seconds


class Transcript(BaseModel):
    moments: List[Moment]
