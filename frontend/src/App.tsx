import { useEffect, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { Route, Routes, useNavigate } from 'react-router-dom'
import { Brand } from './components/Brand'
import { Editor } from './components/Editor'
import { ProcessingPipeline } from './components/ProcessingPipeline'
import { UploadDropzone } from './components/UploadDropzone'
import { UploadResult } from './components/UploadResult'
import { beginProcessing, checkApiHealth, getApiBaseUrl, getProcessingStatus, setApiBaseUrl, uploadVideo } from './lib/api'
import type { ProcessingStatus, UploadResponse } from './types/video'

type ApiStatus = 'checking' | 'online' | 'offline'

function UploadPage() {
  const navigate = useNavigate()
  const [apiStatus, setApiStatus] = useState<ApiStatus>('checking')
  const [apiAddress, setApiAddress] = useState(getApiBaseUrl)
  const [apiSetupError, setApiSetupError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<UploadResponse | null>(null)
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>('idle')
  const [processingMessage, setProcessingMessage] = useState('')
  const [processingError, setProcessingError] = useState<string | null>(null)
  const pollRef = useRef<number | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    void checkApiHealth(controller.signal).then((online) => {
      if (!controller.signal.aborted) setApiStatus(online ? 'online' : 'offline')
    })
    return () => controller.abort()
  }, [])

  useEffect(() => () => {
    if (pollRef.current !== null) window.clearInterval(pollRef.current)
  }, [])

  const testEngine = async () => {
    setApiSetupError(null)
    try {
      setApiBaseUrl(apiAddress)
      setApiStatus('checking')
      const online = await checkApiHealth()
      setApiStatus(online ? 'online' : 'offline')
      if (!online) setApiSetupError('Could not reach the Caption Studio engine. Check the address and open its /api/health page on this phone.')
    } catch (cause) {
      setApiStatus('offline')
      setApiSetupError(cause instanceof Error ? cause.message : 'Invalid server address.')
    }
  }

  const pollProcessing = (projectId: string) => {
    if (pollRef.current !== null) window.clearInterval(pollRef.current)
    pollRef.current = window.setInterval(() => {
      void getProcessingStatus(projectId)
        .then((state) => {
          setProcessingStatus(state.status)
          setProcessingMessage(state.message)
          setProcessingError(state.error)
          if (state.status === 'ready') {
            if (pollRef.current !== null) window.clearInterval(pollRef.current)
            void navigate(`/editor/${projectId}`)
          }
          if (state.status === 'error' && pollRef.current !== null) {
            window.clearInterval(pollRef.current)
          }
        })
        .catch((statusError) => {
          if (pollRef.current !== null) window.clearInterval(pollRef.current)
          setProcessingStatus('error')
          setProcessingMessage('Processing stopped')
          setProcessingError(statusError instanceof Error ? statusError.message : 'Could not read processing status.')
        })
    }, 750)
  }

  const processProject = async (projectId: string) => {
    setProcessingError(null)
    try {
      const state = await beginProcessing(projectId)
      setProcessingStatus(state.status)
      setProcessingMessage(state.message)
      if (state.status === 'ready') {
        void navigate(`/editor/${projectId}`)
        return
      }
      pollProcessing(projectId)
    } catch (processingFailure) {
      setProcessingStatus('error')
      setProcessingMessage('Transcription failed')
      setProcessingError(processingFailure instanceof Error ? processingFailure.message : 'Processing failed.')
    }
  }

  const handleUpload = async (file: File) => {
    setError(null)
    setIsUploading(true)
    try {
      const response = await uploadVideo(file)
      setResult(response)
      setProcessingStatus('uploaded')
      setProcessingMessage('Video ready')
      setApiStatus('online')
      await processProject(response.projectId)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'The upload failed.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-canvas text-white">
      <header className="border-b border-white/[0.07]">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 sm:px-8">
          <Brand />
          <div className="flex items-center gap-2 text-[11px] text-zinc-500">
            <span
              className={`size-1.5 rounded-full ${
                apiStatus === 'online'
                  ? 'bg-accent'
                  : apiStatus === 'offline'
                    ? 'bg-red-400'
                    : 'animate-pulse bg-zinc-600'
              }`}
            />
            {apiStatus === 'online'
              ? 'Engine online'
              : apiStatus === 'offline'
                ? 'Engine offline'
                : 'Connecting'}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1120px] px-5 pb-14 pt-14 sm:px-8 sm:pt-20">
        <div className="mb-10 max-w-2xl">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
            Caption Studio
          </p>
          <h1 className="text-4xl font-medium leading-[1.03] tracking-[-0.055em] text-white sm:text-6xl">
            Make every word
            <br />
            land with intent.
          </h1>
          <p className="mt-5 max-w-lg text-sm leading-6 text-zinc-500 sm:text-base">
            Turn short-form video into precisely timed, editorial captions. Edit each word and export a finished MP4.
          </p>
        </div>

        {(Capacitor.isNativePlatform() || apiStatus === 'offline') && (
          <div className="mb-5 rounded-xl border border-white/10 bg-panel p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-white">Processing engine</h2>
            <p className="mt-1 text-xs leading-5 text-zinc-400">{Capacitor.isNativePlatform() ? 'For a Wi-Fi test, run FastAPI on your computer and enter its LAN address. The phone and computer must be on the same Wi-Fi.' : 'Video processing needs a separate online API. Enter its HTTPS address, or configure VITE_API_URL in Vercel for everyone.'}</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input aria-label="Engine address" type="url" value={apiAddress} onChange={(event) => setApiAddress(event.target.value)} placeholder={Capacitor.isNativePlatform() ? 'http://192.168.1.100:8000' : 'https://your-api.up.railway.app'} className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-accent" />
              <button type="button" onClick={() => void testEngine()} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black">Save & test</button>
            </div>
            {apiSetupError && <p role="alert" className="mt-2 text-xs text-amber-200">{apiSetupError}</p>}
          </div>
        )}
        {error && (
          <div role="alert" className="mb-4 border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm text-red-100/80">
            {error}
          </div>
        )}

        {result ? (
          <>
            <UploadResult result={result} />
            <ProcessingPipeline
              status={processingStatus}
              message={processingMessage}
              error={processingError}
              onRetry={() => void processProject(result.projectId)}
            />
          </>
        ) : (
          <UploadDropzone isUploading={isUploading} onUpload={handleUpload} />
        )}

        <div className="mt-6 flex flex-col gap-2 text-[11px] text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
          <span>01 / Upload & process</span>
          <span>Word-level timing · Animated captions</span>
        </div>
      </main>
    </div>
  )
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<UploadPage />} />
      <Route path="/editor/:projectId" element={<Editor />} />
    </Routes>
  )
}
