from pathlib import Path

from fastapi.testclient import TestClient

from app.config import settings
from app.main import app
from app.schemas.video import VideoMetadata
from app.schemas.editor import default_editor_document
from app.services.project_files import write_json
from app.services import video_export


def test_health() -> None:
    with TestClient(app) as client:
        response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_rejects_unsupported_extension() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/api/videos/upload",
            files={"file": ("notes.txt", b"not a video", "text/plain")},
        )
    assert response.status_code == 415
    assert response.json()["error"]["code"] == "unsupported_format"


def test_upload_returns_metadata(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setattr(settings, "uploads_dir", tmp_path)

    def fake_probe(path: Path) -> VideoMetadata:
        return VideoMetadata(
            filename=path.name,
            duration=15.25,
            width=1080,
            height=1920,
            fps=30,
            videoCodec="h264",
            audioCodec="aac",
            hasAudio=True,
            sizeBytes=path.stat().st_size,
        )

    monkeypatch.setattr("app.routers.videos.probe_media", fake_probe)
    with TestClient(app) as client:
        response = client.post(
            "/api/videos/upload",
            files={"file": ("clip.mp4", b"mock-video", "video/mp4")},
        )

    assert response.status_code == 201
    payload = response.json()
    assert len(payload["projectId"]) == 12
    assert payload["video"]["width"] == 1080
    assert payload["video"]["hasAudio"] is True
    assert (tmp_path / payload["projectId"] / "clip.mp4").exists()


def test_editor_state_is_versioned_and_persists(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setattr(settings, "uploads_dir", tmp_path)
    project_id = "a1b2c3d4e5f6"
    (tmp_path / project_id).mkdir()

    with TestClient(app) as client:
        initial = client.get(f"/api/projects/{project_id}/editor-state")
        assert initial.status_code == 200
        document = initial.json()
        assert document["schemaVersion"] == 1
        assert document["projectOverrides"]["transform"]["x"] == 0.5

        document["segmentOverrides"]["segment-1"] = {
            "transform": {"x": 0.25, "y": 0.4, "scaleX": 1.2, "scaleY": 1.2, "rotation": 12}
        }
        saved = client.put(
            f"/api/projects/{project_id}/editor-state",
            json=document,
        )
        loaded = client.get(f"/api/projects/{project_id}/editor-state")

    assert saved.status_code == 200
    assert loaded.json()["segmentOverrides"]["segment-1"]["transform"]["x"] == 0.25


def test_export_job_can_be_started_checked_and_downloaded(monkeypatch, tmp_path: Path) -> None:
    project_id = "a1b2c3d4e5f6"
    monkeypatch.setattr(settings, "uploads_dir", tmp_path / "uploads")
    monkeypatch.setattr(settings, "outputs_dir", tmp_path / "outputs")
    directory = settings.uploads_dir / project_id
    directory.mkdir(parents=True)
    (directory / "clip.mp4").write_bytes(b"video")
    write_json(directory / "project.json", {
        "projectId": project_id, "videoUrl": f"/api/projects/{project_id}/video",
        "video": {"filename": "clip.mp4", "duration": 1, "width": 720, "height": 1280, "fps": 30,
                  "videoCodec": "h264", "audioCodec": "aac", "hasAudio": True, "sizeBytes": 5},
    })

    def fake_render(project: str, job: str) -> None:
        export_dir = settings.outputs_dir / project / job
        (export_dir / "caption-studio.mp4").write_bytes(b"rendered")
        write_json(export_dir / "status.json", {"projectId": project, "jobId": job, "status": "ready", "progress": 100, "message": "MP4 ready"})

    monkeypatch.setattr("app.routers.projects.render_export", fake_render)
    captions = {"projectId": project_id, "language": "en", "duration": 1, "words": [], "segments": []}
    with TestClient(app) as client:
        started = client.post(f"/api/projects/{project_id}/exports", json={"captions": captions, "editorState": default_editor_document(project_id).model_dump(mode="json")})
        assert started.status_code == 200
        job_id = started.json()["jobId"]
        status = client.get(f"/api/projects/{project_id}/exports/{job_id}")
        download = client.get(f"/api/projects/{project_id}/exports/{job_id}/download")

    assert status.json()["status"] == "ready"
    assert download.status_code == 200
    assert download.content == b"rendered"


def test_renderer_retries_with_one_worker_after_failure(monkeypatch, tmp_path: Path) -> None:
    project_id = "a1b2c3d4e5f6"
    monkeypatch.setattr(settings, "uploads_dir", tmp_path / "uploads")
    monkeypatch.setattr(settings, "outputs_dir", tmp_path / "outputs")
    (settings.uploads_dir / project_id).mkdir(parents=True)
    job = video_export.start_export(project_id, {})
    concurrency: list[str] = []

    class FakeProcess:
        def __init__(self, output: Path, attempt: int) -> None:
            self.output = output
            self.attempt = attempt
            self.stdout = iter(["Error: transient renderer failure\n"] if attempt == 1 else ['{"status":"ready","progress":100}\n'])

        def wait(self) -> int:
            if self.attempt == 2:
                self.output.write_bytes(b"rendered")
                return 0
            return 1

    def fake_popen(args, **kwargs):
        concurrency.append(kwargs["env"]["REMOTION_CONCURRENCY"])
        return FakeProcess(Path(args[-1]), len(concurrency))

    monkeypatch.setattr(video_export.shutil, "which", lambda _: "node")
    monkeypatch.setattr(video_export.subprocess, "Popen", fake_popen)
    video_export.render_export(project_id, job["jobId"])

    assert concurrency == ["2", "1"]
    assert video_export.export_status(project_id, job["jobId"])["status"] == "ready"
