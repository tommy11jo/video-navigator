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
    time: int


class Chapter(BaseModel):
    title: str
    key_quotes: List[Quote]
    key_points: List[str]


class VideoOverview(BaseModel):
    video_title: str
    chapters: List[Chapter]
    screenshots: List[str]


class Message(BaseModel):
    role: Optional[ChatRole] = None
    name: Optional[str] = None
    content: str


class ChapterData(BaseModel):
    timestamp: str
    title: str


class VideoMetadata(BaseModel):
    title: str
    chapters: List[ChapterData]
