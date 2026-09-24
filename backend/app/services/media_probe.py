import json
import os
import shutil
import subprocess
from fractions import Fraction
from pathlib import Path
from typing import Any

from app.errors import AppError
from app.schemas.video import VideoMetadata


def _parse_fps(value: str | None) -> float:
    if not value or value == "0/0":
        return 0.0
    try:
        return round(float(Fraction(value)), 3)
    except (ValueError, ZeroDivisionError):
        return 0.0


def find_media_executable(name: str) -> str | None:
    executable = shutil.which(name)
    if executable:
        return executable

    local_app_data = os.environ.get("LOCALAPPDATA")
    if local_app_data:
        winget_root = Path(local_app_data) / "Microsoft" / "WinGet"
        winget_alias = winget_root / "Links" / f"{name}.exe"
        if winget_alias.exists():
            return str(winget_alias)
        packages_dir = winget_root / "Packages"
        for package_dir in packages_dir.glob("Gyan.FFmpeg_*"):
            installed_binary = next(package_dir.glob(f"ffmpeg-*/bin/{name}.exe"), None)
            if installed_binary:
                return str(installed_binary)
    return None


def probe_media(video_path: Path) -> VideoMetadata:
    executable = find_media_executable("ffprobe")
    if executable is None:
        raise AppError(
            "FFmpeg was not found. Install FFmpeg, restart the app, and try again.",
            code="ffmpeg_missing",
            status_code=503,
        )

    command = [
        executable,
        "-v",
        "error",
        "-show_entries",
        "format=duration:stream=index,codec_type,codec_name,width,height,avg_frame_rate,r_frame_rate",
        "-of",
        "json",
        str(video_path),
    ]
    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            check=True,
            timeout=30,
        )
        payload: dict[str, Any] = json.loads(result.stdout)
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired, json.JSONDecodeError) as exc:
        raise AppError(
            "The video could not be read. It may be corrupted or use an unsupported codec.",
            code="invalid_media",
            status_code=422,
        ) from exc

    streams = payload.get("streams", [])
    video_stream = next(
        (stream for stream in streams if stream.get("codec_type") == "video"),
        None,
    )
    audio_stream = next(
        (stream for stream in streams if stream.get("codec_type") == "audio"),
        None,
    )
    if video_stream is None:
        raise AppError(
            "No video stream was found in this file.",
            code="missing_video_stream",
            status_code=422,
        )

    duration_value = payload.get("format", {}).get("duration")
    fps = _parse_fps(
        video_stream.get("avg_frame_rate") or video_stream.get("r_frame_rate")
    )
    try:
        duration = round(float(duration_value), 3)
        width = int(video_stream.get("width", 0))
        height = int(video_stream.get("height", 0))
    except (TypeError, ValueError) as exc:
        raise AppError(
            "The video metadata is incomplete or invalid.",
            code="invalid_media_metadata",
            status_code=422,
        ) from exc

    if duration <= 0 or width <= 0 or height <= 0 or fps <= 0:
        raise AppError(
            "The video metadata is incomplete or invalid.",
            code="invalid_media_metadata",
            status_code=422,
        )

    return VideoMetadata(
        filename=video_path.name,
        duration=duration,
        width=width,
        height=height,
        fps=fps,
        videoCodec=str(video_stream.get("codec_name") or "unknown"),
        audioCodec=(str(audio_stream.get("codec_name")) if audio_stream else None),
        hasAudio=audio_stream is not None,
        sizeBytes=video_path.stat().st_size,
    )
