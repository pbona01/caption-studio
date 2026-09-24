import json
import re
from pathlib import Path
from typing import Any

from app.config import settings
from app.errors import AppError

PROJECT_ID_PATTERN = re.compile(r"^[a-f0-9]{12}$")


def project_dir(project_id: str) -> Path:
    if not PROJECT_ID_PATTERN.fullmatch(project_id):
        raise AppError("Project not found.", code="project_not_found", status_code=404)
    directory = settings.uploads_dir / project_id
    if not directory.is_dir():
        raise AppError("Project not found.", code="project_not_found", status_code=404)
    return directory


def project_video(project_id: str) -> Path:
    directory = project_dir(project_id)
    videos = [
        path
        for path in directory.iterdir()
        if path.is_file() and path.suffix.lower() in {".mp4", ".mov", ".m4v"}
    ]
    if not videos:
        raise AppError("The original video is missing.", code="video_missing", status_code=404)
    return videos[0]


def transcript_path(project_id: str) -> Path:
    project_dir(project_id)
    return settings.transcripts_dir / f"{project_id}.json"


def editor_state_path(project_id: str) -> Path:
    return project_dir(project_id) / "editor.json"


def read_json(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as exc:
        raise AppError(
            "Stored project data could not be read.",
            code="project_data_invalid",
            status_code=500,
        ) from exc


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(f"{path.suffix}.tmp")
    temporary.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    temporary.replace(path)
