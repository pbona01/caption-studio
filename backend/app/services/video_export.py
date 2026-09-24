import json
import os
import re
import shutil
import subprocess
from pathlib import Path
from uuid import uuid4

from app.config import ROOT_DIR, settings
from app.errors import AppError
from app.services.project_files import project_dir, read_json, write_json


JOB_ID_PATTERN = re.compile(r"^[a-f0-9]{12}$")


def export_directory(project_id: str, job_id: str) -> Path:
    project_dir(project_id)
    if not JOB_ID_PATTERN.fullmatch(job_id):
        raise AppError("Export not found.", code="export_not_found", status_code=404)
    return settings.outputs_dir / project_id / job_id


def export_status(project_id: str, job_id: str) -> dict:
    directory = export_directory(project_id, job_id)
    payload = read_json(directory / "status.json")
    if payload is None:
        raise AppError("Export not found.", code="export_not_found", status_code=404)
    return payload


def start_export(project_id: str, input_props: dict) -> dict:
    project_dir(project_id)
    job_id = uuid4().hex[:12]
    directory = export_directory(project_id, job_id)
    directory.mkdir(parents=True, exist_ok=False)
    write_json(directory / "input.json", input_props)
    status = {"projectId": project_id, "jobId": job_id, "status": "queued", "progress": 0, "message": "Preparing export"}
    write_json(directory / "status.json", status)
    return status


def render_export(project_id: str, job_id: str) -> None:
    directory = export_directory(project_id, job_id)
    status_path = directory / "status.json"
    script = ROOT_DIR / "frontend" / "scripts" / "render-export.mjs"
    node = shutil.which("node")
    if not node:
        write_json(status_path, {"projectId": project_id, "jobId": job_id, "status": "failed", "progress": 0, "message": "Node.js was not found on the API server. Install Node.js and restart FastAPI."})
        return

    try:
        for attempt in range(2):
            diagnostics: list[str] = []
            environment = os.environ.copy()
            environment["REMOTION_CONCURRENCY"] = "1" if attempt else "2"
            process = subprocess.Popen(
                [node, str(script), str(directory / "input.json"), str(directory / "caption-studio.mp4")],
                cwd=ROOT_DIR / "frontend",
                env=environment,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding="utf-8",
                errors="replace",
            )
            assert process.stdout is not None
            for line in process.stdout:
                line = line.strip()
                if not line:
                    continue
                try:
                    update = json.loads(line)
                except json.JSONDecodeError:
                    diagnostics.append(line)
                    diagnostics = diagnostics[-200:]
                    continue
                if isinstance(update, dict) and update.get("status") in {"bundling", "preparing", "rendering", "ready"}:
                    write_json(status_path, {"projectId": project_id, "jobId": job_id, "status": update["status"], "progress": update.get("progress", 0), "message": "Rendering MP4" if update["status"] == "rendering" else "Preparing export"})
            exit_code = process.wait()
            video = directory / "caption-studio.mp4"
            if exit_code == 0 and video.is_file() and video.stat().st_size > 0:
                write_json(status_path, {"projectId": project_id, "jobId": job_id, "status": "ready", "progress": 100, "message": "MP4 ready", "downloadUrl": f"/api/projects/{project_id}/exports/{job_id}/download"})
                return
            (directory / "render.log").write_text("\n".join(diagnostics), encoding="utf-8")
            if attempt == 0:
                write_json(status_path, {"projectId": project_id, "jobId": job_id, "status": "preparing", "progress": 0, "message": "Retrying export with fewer renderer workers"})
                continue
            meaningful = next((line for line in diagnostics if not line.startswith("    at ") and not line.startswith("at ")), None)
            raise RuntimeError((meaningful or f"Video renderer exited with code {exit_code}; see render.log.")[:400])
    except Exception as exc:
        write_json(status_path, {"projectId": project_id, "jobId": job_id, "status": "failed", "progress": 0, "message": str(exc)[-400:]})
