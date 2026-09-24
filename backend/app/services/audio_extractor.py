import subprocess
from pathlib import Path

from app.errors import AppError
from app.services.media_probe import find_media_executable


def extract_audio(video_path: Path, audio_path: Path) -> Path:
    executable = find_media_executable("ffmpeg")
    if executable is None:
        raise AppError(
            "FFmpeg was not found. Install FFmpeg, restart the app, and try again.",
            code="ffmpeg_missing",
            status_code=503,
        )
    command = [
        executable,
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        str(video_path),
        "-vn",
        "-ac",
        "1",
        "-ar",
        "16000",
        "-c:a",
        "pcm_s16le",
        "-y",
        str(audio_path),
    ]
    try:
        subprocess.run(command, capture_output=True, text=True, check=True, timeout=180)
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired) as exc:
        detail = exc.stderr.strip() if isinstance(exc, subprocess.CalledProcessError) else ""
        raise AppError(
            f"Audio extraction failed{': ' + detail[-240:] if detail else '.'}",
            code="audio_extraction_failed",
            status_code=422,
        ) from exc
    if not audio_path.exists() or audio_path.stat().st_size == 0:
        raise AppError(
            "Audio extraction produced an empty file. The video may not contain audio.",
            code="missing_audio",
            status_code=422,
        )
    return audio_path

