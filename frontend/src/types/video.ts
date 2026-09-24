export interface VideoMetadata {
  filename: string
  duration: number
  width: number
  height: number
  fps: number
  videoCodec: string
  audioCodec: string | null
  hasAudio: boolean
  sizeBytes: number
}

export interface UploadResponse {
  projectId: string
  video: VideoMetadata
  videoUrl: string
}

export type ProcessingStatus =
  | 'idle'
  | 'uploading'
  | 'uploaded'
  | 'extracting_audio'
  | 'preparing_model'
  | 'transcribing'
  | 'segmenting'
  | 'ready'
  | 'error'

export interface ProjectProcessingState {
  projectId: string
  status: ProcessingStatus
  message: string
  error: string | null
}

export interface TranscriptWord {
  id: string
  text: string
  start: number
  end: number
  confidence: number | null
  emphasis: boolean
}

export interface CaptionSegment {
  id: string
  start: number
  end: number
  words: TranscriptWord[]
}

export interface CaptionDocument {
  projectId: string
  language: string
  duration: number
  words: TranscriptWord[]
  segments: CaptionSegment[]
}

export interface ProjectResponse extends UploadResponse {
  captions: CaptionDocument | null
}

export interface ApiErrorPayload {
  error?: {
    code?: string
    message?: string
  }
}
