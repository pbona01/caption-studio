import shutil
import json
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, UploadFile, status

from app.config import settings
from app.errors import AppError
from app.schemas.video import UploadResponse
from app.services.media_probe import probe_media

router = APIRouter(prefix="/videos", tags=["videos"])

ALLOWED_EXTENSIONS = {".mp4", ".mov", ".m4v"}
CHUNK_SIZE = 1024 * 1024


def _safe_filename(filename: str | None) -> str:
    candidate = Path(filename or "video").name
    return candidate.replace("\x00", "") or "video"


@router.post(
    "/upload",
    response_model=UploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_video(file: UploadFile = File(...)) -> UploadResponse:
    filename = _safe_filename(file.filename)
    extension = Path(filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise AppError(
            "Unsupported video format. Choose an MP4, MOV, or M4V file.",
            code="unsupported_format",
            status_code=415,
        )

    project_id = uuid4().hex[:12]
    project_dir = settings.uploads_dir / project_id
    destination = project_dir / filename
    project_dir.mkdir(parents=True, exist_ok=False)

    written = 0
    try:
        with destination.open("wb") as output:
            while chunk := await file.read(CHUNK_SIZE):
                written += len(chunk)
                if written > settings.max_upload_bytes:
                    raise AppError(
                        "This file is too large. The local V1 limit is 2 GB.",
                        code="file_too_large",
                        status_code=413,
                    )
                output.write(chunk)

        metadata = probe_media(destination)
        if metadata.duration > settings.max_duration_seconds:
            raise AppError(
                "This video is longer than five minutes. Choose a shorter clip for V1.",
                code="duration_limit_exceeded",
                status_code=413,
            )
        response = UploadResponse(
            project_id=project_id,
            video=metadata,
            video_url=f"/api/projects/{project_id}/video",
        )
        (project_dir / "project.json").write_text(
            json.dumps(response.model_dump(by_alias=True), indent=2),
            encoding="utf-8",
        )
        print(f"[PROJECT] Uploaded {project_id}", flush=True)
        return response
    except Exception:
        shutil.rmtree(project_dir, ignore_errors=True)
        raise
    finally:
        await file.close()
