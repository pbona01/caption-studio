import type {
  ApiErrorPayload,
  CaptionDocument,
  ProjectProcessingState,
  ProjectResponse,
  UploadResponse,
} from '../types/video'
import type { EditorProjectDocument } from '../editor/types'

// In the browser, relative `/api` requests are proxied by Vite. In a
// Capacitor build they must point at the machine running FastAPI. Keep a
// runtime override so a packaged app can be configured without rebuilding.
const runtimeApiUrl = typeof window !== 'undefined'
  ? (window as Window & { __CAPTION_API_URL__?: string }).__CAPTION_API_URL__
  : undefined
const API_URL_KEY = 'caption-studio-api-url'

export function getApiBaseUrl(): string {
  const stored = typeof window !== 'undefined' ? window.localStorage.getItem(API_URL_KEY) : null
  return (stored || runtimeApiUrl || import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')
}

export function setApiBaseUrl(value: string): string {
  const address = value.trim()
  if (!address) throw new Error('Enter your processing engine’s HTTPS address first. This is the Railway domain, not the Vercel website address.')
  let url: URL
  try {
    url = new URL(address)
  } catch {
    throw new Error('Enter a full address such as https://your-api.up.railway.app (without /api).')
  }
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Enter a server address like http://192.168.1.100:8000 (no /api path).')
  }
  if (window.location.protocol === 'https:' && url.protocol !== 'https:') {
    throw new Error('This website requires an HTTPS engine address. HTTP connections are blocked by the browser.')
  }
  const normalized = url.origin
  window.localStorage.setItem(API_URL_KEY, normalized)
  return normalized
}

export function resolveApiUrl(path: string): string {
  return /^https?:\/\//i.test(path) ? path : `${getApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`
}

export async function checkApiHealth(signal?: AbortSignal): Promise<boolean> {
  try {
    const response = await fetch(resolveApiUrl('/api/health'), { signal, cache: 'no-store' })
    if (!response.ok || !(response.headers.get('content-type') ?? '').includes('application/json')) return false
    const data = await response.json() as { status?: string; service?: string }
    return data.status === 'ok' && data.service === 'caption-studio-api'
  } catch {
    return false
  }
}

export async function uploadVideo(file: File): Promise<UploadResponse> {
  const form = new FormData()
  form.append('file', file)
  const response = await fetch(resolveApiUrl('/api/videos/upload'), {
    method: 'POST',
    body: form,
  })

  if (!response.ok) {
    throw new Error(await responseErrorMessage(response, 'The upload failed. Please try again.'))
  }
  return parseJson<UploadResponse>(response, 'The upload service returned an invalid response.')
}

async function responseErrorMessage(response: Response, fallback: string): Promise<string> {
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload
    if (payload.error?.message) return payload.error.message
  }
  const body = await response.text().catch(() => '')
  if (body && !body.trim().startsWith('<')) return `${fallback} (${response.status}: ${body.slice(0, 160)})`
  return `${fallback} (server returned ${response.status})`
}

async function parseJson<T>(response: Response, fallback: string): Promise<T> {
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    throw new Error(`${fallback} (server returned ${response.status})`)
  }
  try {
    return (await response.json()) as T
  } catch {
    throw new Error(fallback)
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(await responseErrorMessage(response, 'The local engine could not complete this request.'))
  }
  return parseJson<T>(response, 'The local engine returned an invalid response.')
}

export async function beginProcessing(projectId: string): Promise<ProjectProcessingState> {
  const response = await fetch(resolveApiUrl(`/api/projects/${projectId}/process`), {
    method: 'POST',
  })
  return parseResponse<ProjectProcessingState>(response)
}

export async function getProcessingStatus(projectId: string): Promise<ProjectProcessingState> {
  const response = await fetch(resolveApiUrl(`/api/projects/${projectId}/status`))
  return parseResponse<ProjectProcessingState>(response)
}

export async function getProject(projectId: string): Promise<ProjectResponse> {
  const response = await fetch(resolveApiUrl(`/api/projects/${projectId}`))
  return parseResponse<ProjectResponse>(response)
}

export async function saveCaptions(captions: CaptionDocument): Promise<CaptionDocument> {
  const response = await fetch(resolveApiUrl(`/api/projects/${captions.projectId}/captions`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(captions),
  })
  return parseResponse<CaptionDocument>(response)
}

export async function getEditorState(projectId: string): Promise<EditorProjectDocument> {
  const response = await fetch(resolveApiUrl(`/api/projects/${projectId}/editor-state`))
  return parseResponse<EditorProjectDocument>(response)
}

export async function saveEditorState(document: EditorProjectDocument): Promise<EditorProjectDocument> {
  const response = await fetch(resolveApiUrl(`/api/projects/${document.projectId}/editor-state`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(document),
  })
  return parseResponse<EditorProjectDocument>(response)
}

export interface ExportJob {
  projectId: string
  jobId: string
  status: 'queued' | 'bundling' | 'preparing' | 'rendering' | 'ready' | 'failed'
  progress: number
  message: string
  downloadUrl?: string
}

export async function createExport(projectId: string, captions: CaptionDocument, editorState: EditorProjectDocument): Promise<ExportJob> {
  const response = await fetch(resolveApiUrl(`/api/projects/${projectId}/exports`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ captions, editorState }),
  })
  return parseResponse<ExportJob>(response)
}

export async function getExportStatus(projectId: string, jobId: string): Promise<ExportJob> {
  const response = await fetch(resolveApiUrl(`/api/projects/${projectId}/exports/${jobId}`))
  return parseResponse<ExportJob>(response)
}

export function exportDownloadUrl(projectId: string, jobId: string): string {
  return resolveApiUrl(`/api/projects/${projectId}/exports/${jobId}/download`)
}
