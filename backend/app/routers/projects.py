from fastapi import APIRouter, BackgroundTasks, Request
from fastapi.responses import FileResponse
from app.config import settings
from pydantic import BaseModel

from app.errors import AppError
from app.schemas.captions import (
    CaptionDocument,
    ProcessingStatus,
    ProjectProcessingState,
    ProjectResponse,
)
from app.schemas.editor import EditorProjectDocument, default_editor_document
from app.schemas.video import UploadResponse
from app.services.media_probe import probe_media
from app.services.project_files import (
    project_dir,
    project_video,
    editor_state_path,
    read_json,
    transcript_path,
    write_json,
)
from app.services.project_processor import process_project, set_status, start_project
from app.services.video_export import export_directory, export_status, render_export, start_export

router = APIRouter(prefix="/projects", tags=["projects"])


class ExportRequest(BaseModel):
    captions: CaptionDocument
    editorState: EditorProjectDocument


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str) -> ProjectResponse:
    directory = project_dir(project_id)
    manifest = read_json(directory / "project.json")
    if manifest is None:
        video = probe_media(project_video(project_id))
        manifest = UploadResponse(
            projectId=project_id,
            video=video,
            videoUrl=f"/api/projects/{project_id}/video",
        ).model_dump(by_alias=True)
        write_json(directory / "project.json", manifest)
    caption_payload = read_json(transcript_path(project_id))
    return ProjectResponse(
        **manifest,
        captions=(CaptionDocument(**caption_payload) if caption_payload else None),
    )


@router.get("/{project_id}/video")
async def get_video(project_id: str) -> FileResponse:
    video = project_video(project_id)
    media_type = "video/quicktime" if video.suffix.lower() == ".mov" else "video/mp4"
    return FileResponse(video, media_type=media_type, filename=video.name)


@router.post("/{project_id}/process", response_model=ProjectProcessingState)
async def begin_processing(
    project_id: str,
    background_tasks: BackgroundTasks,
) -> ProjectProcessingState:
    project_dir(project_id)
    if transcript_path(project_id).exists():
        return set_status(project_id, ProcessingStatus.READY, "Editor ready")
    state = set_status(project_id, ProcessingStatus.UPLOADED, "Video ready")
    if start_project(project_id):
        background_tasks.add_task(process_project, project_id)
    return state


@router.get("/{project_id}/status", response_model=ProjectProcessingState)
async def processing_status(project_id: str) -> ProjectProcessingState:
    payload = read_json(project_dir(project_id) / "processing.json")
    if payload is None:
        return ProjectProcessingState(
            projectId=project_id,
            status=ProcessingStatus.UPLOADED,
            message="Video ready",
        )
    return ProjectProcessingState(**payload)


@router.get("/{project_id}/captions", response_model=CaptionDocument)
async def get_captions(project_id: str) -> CaptionDocument:
    payload = read_json(transcript_path(project_id))
    if payload is None:
        raise AppError("Captions are not ready yet.", code="captions_not_ready", status_code=409)
    return CaptionDocument(**payload)


@router.put("/{project_id}/captions", response_model=CaptionDocument)
async def update_captions(project_id: str, captions: CaptionDocument) -> CaptionDocument:
    if captions.project_id != project_id:
        raise AppError("Project ID does not match caption data.", code="project_mismatch", status_code=400)
    write_json(transcript_path(project_id), captions.model_dump(mode="json", by_alias=True))
    return captions


@router.get("/{project_id}/editor-state", response_model=EditorProjectDocument)
async def get_editor_state(project_id: str) -> EditorProjectDocument:
    payload = read_json(editor_state_path(project_id))
    if payload is None:
        document = default_editor_document(project_id)
        write_json(editor_state_path(project_id), document.model_dump(mode="json", by_alias=True))
        return document
    return EditorProjectDocument(**payload)


@router.put("/{project_id}/editor-state", response_model=EditorProjectDocument)
async def update_editor_state(
    project_id: str,
    document: EditorProjectDocument,
) -> EditorProjectDocument:
    project_dir(project_id)
    if document.projectId != project_id:
        raise AppError("Project ID does not match editor data.", code="project_mismatch", status_code=400)
    write_json(editor_state_path(project_id), document.model_dump(mode="json", by_alias=True))
    return document


@router.post("/{project_id}/exports")
async def begin_export(project_id: str, payload: ExportRequest, request: Request, background_tasks: BackgroundTasks) -> dict:
    if payload.captions.project_id != project_id or payload.editorState.projectId != project_id:
        raise AppError("Project ID does not match export data.", code="project_mismatch", status_code=400)
    manifest = await get_project(project_id)
    video = manifest.video
    job = start_export(project_id, {
        "videoSrc": (settings.public_api_url.rstrip('/') + f"/api/projects/{project_id}/video") if settings.public_api_url else str(request.url_for("get_video", project_id=project_id)),
        "segments": [segment.model_dump(mode="json", by_alias=True) for segment in payload.captions.segments],
        "editorState": payload.editorState.model_dump(mode="json", by_alias=True),
        "fps": video.fps,
        "width": video.width,
        "height": video.height,
        "duration": video.duration,
    })
    background_tasks.add_task(render_export, project_id, job["jobId"])
    return job


@router.get("/{project_id}/exports/{job_id}")
async def get_export_status(project_id: str, job_id: str) -> dict:
    return export_status(project_id, job_id)


@router.get("/{project_id}/exports/{job_id}/download")
async def download_export(project_id: str, job_id: str) -> FileResponse:
    status = export_status(project_id, job_id)
    if status["status"] != "ready":
        raise AppError("Export is not ready yet.", code="export_not_ready", status_code=409)
    return FileResponse(export_directory(project_id, job_id) / "caption-studio.mp4", media_type="video/mp4", filename=f"caption-studio-{project_id}.mp4")
