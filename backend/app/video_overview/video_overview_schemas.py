from pydantic import BaseModel
from typing import List, Optional
from enum import Enum


class ChatRole(str, Enum):
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"


class ModelChoice(str, Enum):
    HAIKU_4_5 = "haiku-4-5"
    SONNET_4_5 = "sonnet-4-5"
    OPUS_4_5 = "opus-4-5"


MODEL_IDS = {
    ModelChoice.HAIKU_4_5: "claude-haiku-4-5",
    ModelChoice.SONNET_4_5: "claude-sonnet-4-5",
    ModelChoice.OPUS_4_5: "claude-opus-4-5",
}


class KeyPoint(BaseModel):
    text: str
    time: float


class Chapter(BaseModel):
    title: str
    key_points: List[KeyPoint]


class ChapterData(BaseModel):
    title: str
    key_points: List[str]
    key_point_start_times: List[float]


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


class TranscriptEntry(BaseModel):
    timestamp: str
    content: str


class ChatRequest(BaseModel):
    question: str
    user_api_key: Optional[str] = None
    model: Optional[ModelChoice] = None


class ChatResponse(BaseModel):
    answer: str
