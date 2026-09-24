from threading import Lock

from app.errors import AppError
from app.schemas.captions import CaptionDocument, ProcessingStatus, ProjectProcessingState
from app.services.audio_extractor import extract_audio
from app.services.caption_segmenter import create_segments
from app.services.project_files import project_dir, project_video, transcript_path, write_json
from app.services.transcription import transcribe_audio

_active_projects: set[str] = set()
_active_lock = Lock()


def _status_path(project_id: str):
    return project_dir(project_id) / "processing.json"


def set_status(
    project_id: str,
    status: ProcessingStatus,
    message: str,
    error: str | None = None,
) -> ProjectProcessingState:
    state = ProjectProcessingState(
        projectId=project_id,
        status=status,
        message=message,
        error=error,
    )
    write_json(_status_path(project_id), state.model_dump(mode="json", by_alias=True))
    return state


def start_project(project_id: str) -> bool:
    with _active_lock:
        if project_id in _active_projects:
            return False
        _active_projects.add(project_id)
        return True


def process_project(project_id: str) -> None:
    try:
        cached = transcript_path(project_id)
        if cached.exists():
            set_status(project_id, ProcessingStatus.READY, "Editor ready")
            return

        video = project_video(project_id)
        audio = project_dir(project_id) / "audio.wav"
        set_status(project_id, ProcessingStatus.EXTRACTING_AUDIO, "Preparing audio...")
        print("[FFMPEG] Extracting audio", flush=True)
        extract_audio(video, audio)
        print("[FFMPEG] Complete", flush=True)

        set_status(project_id, ProcessingStatus.PREPARING_MODEL, "Preparing transcription model...")

        def transcription_status(message: str) -> None:
            stage = (
                ProcessingStatus.PREPARING_MODEL
                if message.startswith("Preparing")
                else ProcessingStatus.TRANSCRIBING
            )
            set_status(project_id, stage, message)

        language, duration, words = transcribe_audio(str(audio), transcription_status)
        set_status(project_id, ProcessingStatus.SEGMENTING, "Creating captions...")
        segments = create_segments(words)
        document = CaptionDocument(
            projectId=project_id,
            language=language,
            duration=duration,
            words=words,
            segments=segments,
        )
        write_json(cached, document.model_dump(mode="json", by_alias=True))
        print(f"[CAPTIONS] Created {len(segments)} segments", flush=True)
        set_status(project_id, ProcessingStatus.READY, "Editor ready")
        print(f"[PROJECT] Ready {project_id}", flush=True)
    except AppError as exc:
        print(f"[PROJECT] Failed {project_id}: {exc.message}", flush=True)
        set_status(project_id, ProcessingStatus.ERROR, "Transcription failed", exc.message)
    except Exception as exc:
        print(f"[PROJECT] Failed {project_id}: {exc}", flush=True)
        set_status(
            project_id,
            ProcessingStatus.ERROR,
            "Transcription failed",
            "An unexpected processing error occurred. Check the backend log for details.",
        )
    finally:
        with _active_lock:
            _active_projects.discard(project_id)

