from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


ROOT_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    app_name: str = "Caption Studio API"
    api_prefix: str = "/api"
    uploads_dir: Path = ROOT_DIR / "uploads"
    outputs_dir: Path = ROOT_DIR / "outputs"
    transcripts_dir: Path = ROOT_DIR / "transcripts"
    max_upload_bytes: int = 2 * 1024 * 1024 * 1024
    max_duration_seconds: float = 300.0
    whisper_model: str = "base"
    whisper_device: str = "cpu"
    whisper_compute_type: str = "int8"
    whisper_cpu_threads: int = 4
    caption_target_words: int = 3
    caption_max_words: int = 5
    caption_max_duration: float = 1.6
    caption_pause_break: float = 0.35
    allowed_origins: tuple[str, ...] = (
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "capacitor://localhost",
        "http://localhost",
        "https://localhost",
        "ionic://localhost",
    )
    public_api_url: str | None = None

    model_config = SettingsConfigDict(env_prefix="CAPTION_STUDIO_")


settings = Settings()
