from collections.abc import Callable
from threading import Lock

from app.config import settings
from app.errors import AppError
from app.schemas.captions import TranscriptWord

StatusCallback = Callable[[str], None]

_model = None
_model_lock = Lock()


def _get_model(status_callback: StatusCallback):
    global _model
    if _model is not None:
        return _model
    with _model_lock:
        if _model is not None:
            return _model
        status_callback("Preparing transcription model...")
        print(f"[WHISPER] Loading {settings.whisper_model} model", flush=True)
        try:
            from faster_whisper import WhisperModel

            _model = WhisperModel(
                settings.whisper_model,
                device=settings.whisper_device,
                compute_type=settings.whisper_compute_type,
                cpu_threads=settings.whisper_cpu_threads,
            )
        except Exception as exc:
            raise AppError(
                f"Whisper model failed to load: {exc}",
                code="whisper_model_failed",
                status_code=500,
            ) from exc
    return _model


def transcribe_audio(
    audio_path: str,
    status_callback: StatusCallback,
) -> tuple[str, float, list[TranscriptWord]]:
    model = _get_model(status_callback)
    status_callback("Transcribing speech...")
    print("[WHISPER] Transcribing", flush=True)
    try:
        segments, info = model.transcribe(
            audio_path,
            beam_size=5,
            word_timestamps=True,
            vad_filter=True,
            vad_parameters={"min_silence_duration_ms": 300},
        )
        words: list[TranscriptWord] = []
        for segment in segments:
            for item in segment.words or []:
                text = item.word.strip()
                if not text:
                    continue
                words.append(
                    TranscriptWord(
                        id=f"word-{len(words) + 1}",
                        text=text,
                        start=round(float(item.start), 3),
                        end=round(float(item.end), 3),
                        confidence=(
                            round(float(item.probability), 4)
                            if item.probability is not None
                            else None
                        ),
                    )
                )
    except AppError:
        raise
    except Exception as exc:
        raise AppError(
            f"Transcription failed: {exc}",
            code="transcription_failed",
            status_code=500,
        ) from exc
    if not words:
        raise AppError(
            "No speech was detected in this video.",
            code="no_speech_detected",
            status_code=422,
        )
    print(f"[WHISPER] {len(words)} words detected", flush=True)
    return str(info.language), round(float(info.duration), 3), words

