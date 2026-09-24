# Caption Studio

Caption Studio is a local-first short-form caption editor. It supports upload, CPU transcription with word timestamps, live caption styling and transcript edits, Remotion preview, and MP4 export.

For the installable website, see [DEPLOY.md](DEPLOY.md). The Vercel frontend alone cannot transcribe or render videos; it needs the separate processing API.

## Current milestone

Implemented:

- React 18 + Vite + strict TypeScript frontend
- Tailwind CSS design system and responsive upload screen
- FastAPI backend with structured errors and CORS
- streamed MP4, MOV, and M4V uploads (2 GB hard limit, 5 minute duration limit)
- `ffprobe` metadata extraction for duration, dimensions, FPS, codec, and audio presence
- per-project local upload directories
- frontend/backend connectivity indicator
- FFmpeg mono 16 kHz audio extraction
- faster-whisper `base` model on CPU/int8 with word timestamps
- cached transcript JSON and heuristic emphasis/segmentation
- real project processing states and retryable errors
- Remotion Player editor with the Big Bold caption preset
- live word text and emphasis editing
- MP4 export with the current caption styling and audio


## Prerequisites (Windows)

1. Install [Node.js](https://nodejs.org/) 20 or newer. The installer includes npm.
2. Install [Python](https://www.python.org/downloads/windows/) 3.10–3.12 and select **Add Python to PATH**.
3. Install FFmpeg, for example with `winget install Gyan.FFmpeg`, then open a new terminal.
4. Confirm all tools are available:

```powershell
node --version
npm --version
python --version
ffmpeg -version
ffprobe -version
```

## First-time setup

From this directory:

```powershell
npm install
npm --prefix frontend install
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt
```

If PowerShell blocks activation, run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, or call `.venv\Scripts\python.exe` directly.

## Run

Start both apps:

```powershell
npm run dev
```

Or use separate terminals:

```powershell
npm run dev:backend
npm run dev:frontend
```

Open <http://localhost:5173>. The API runs at <http://127.0.0.1:8000>; interactive API docs are at <http://127.0.0.1:8000/docs>.

## Export a video

Keep both the frontend and FastAPI running. Open a finished project in the editor and select **Export MP4**. The button shows progress while the video renders; once it says **Download MP4**, select it to save the file. A one-minute video can take several minutes to render on a CPU. You can refresh the editor without losing the current export's progress. The exported file is also saved in `outputs/<project-id>/<job-id>/caption-studio.mp4`.

The API server must be able to find `node` on its PATH. If export fails, the editor displays the renderer error and lets you retry.

## Phase 1 verification

```powershell
npm run build
npm test
```

Then upload an MP4, MOV, or M4V file under five minutes. The UI shows actual processing stages and opens `/editor/<project-id>` when captions are ready. Uploaded originals remain unchanged under `uploads/<project-id>/`, extracted audio is stored beside the video, and final caption data is cached under `transcripts/<project-id>.json`.

## Transcription configuration

Defaults are configured centrally in `backend/app/config.py`: `base`, CPU, int8, and four CPU threads. Override them with environment variables such as `CAPTION_STUDIO_WHISPER_MODEL=small` before starting the backend.

WhisperX is intentionally deferred. It can improve forced alignment, but adds PyTorch/alignment-model complexity and larger downloads. Faster Whisper's word timestamps are the right first implementation; alignment quality will be measured on real clips before adding WhisperX as an optional adapter.
