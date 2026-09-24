from pydantic import BaseModel, ConfigDict, Field


class VideoMetadata(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    filename: str
    duration: float = Field(ge=0)
    width: int = Field(gt=0)
    height: int = Field(gt=0)
    fps: float = Field(gt=0)
    video_codec: str = Field(alias="videoCodec")
    audio_codec: str | None = Field(default=None, alias="audioCodec")
    has_audio: bool = Field(alias="hasAudio")
    size_bytes: int = Field(ge=0, alias="sizeBytes")


class UploadResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    project_id: str = Field(alias="projectId")
    video: VideoMetadata
    video_url: str = Field(alias="videoUrl")
