from enum import Enum

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.video import VideoMetadata


class ProcessingStatus(str, Enum):
    IDLE = "idle"
    UPLOADED = "uploaded"
    EXTRACTING_AUDIO = "extracting_audio"
    PREPARING_MODEL = "preparing_model"
    TRANSCRIBING = "transcribing"
    SEGMENTING = "segmenting"
    READY = "ready"
    ERROR = "error"


class TranscriptWord(BaseModel):
    id: str
    text: str
    start: float
    end: float
    confidence: float | None = None
    emphasis: bool = False


class CaptionSegment(BaseModel):
    id: str
    start: float
    end: float
    words: list[TranscriptWord]


class CaptionDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    project_id: str = Field(alias="projectId")
    language: str
    duration: float
    words: list[TranscriptWord]
    segments: list[CaptionSegment]


class ProjectProcessingState(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    project_id: str = Field(alias="projectId")
    status: ProcessingStatus
    message: str
    error: str | None = None


class ProjectResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    project_id: str = Field(alias="projectId")
    video: VideoMetadata
    video_url: str = Field(alias="videoUrl")
    captions: CaptionDocument | None = None

