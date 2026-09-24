import { Check, RotateCcw, Volume2, VolumeX } from 'lucide-react'
import type { UploadResponse } from '../types/video'

interface UploadResultProps {
  result: UploadResponse
  onReset?: () => void
}

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${minutes}:${remainder.toFixed(1).padStart(4, '0')}`
}

const formatBytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`

export function UploadResult({ result, onReset }: UploadResultProps) {
  const { video } = result
  const details = [
    ['Duration', formatDuration(video.duration)],
    ['Frame', `${video.width} × ${video.height}`],
    ['Frame rate', `${video.fps} fps`],
    ['Video', video.videoCodec.toUpperCase()],
    ['Size', formatBytes(video.sizeBytes)],
  ]

  return (
    <section className="border border-white/10 bg-panel shadow-lift">
      <div className="flex flex-col gap-5 border-b border-white/10 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex items-center gap-4">
          <span className="grid size-10 place-items-center bg-accent text-black">
            <Check className="size-5" strokeWidth={2.5} />
          </span>
          <div>
            <p className="text-sm font-semibold text-white">Video ready</p>
            <p className="mt-1 max-w-[430px] truncate text-xs text-zinc-500">{video.filename}</p>
          </div>
        </div>
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 transition hover:text-white"
          >
            <RotateCcw className="size-3.5" />
            Choose another
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 divide-x divide-y divide-white/10 sm:grid-cols-5 sm:divide-y-0">
        {details.map(([label, value]) => (
          <div key={label} className="px-5 py-5">
            <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-600">{label}</p>
            <p className="mt-2 text-sm font-medium text-zinc-200">{value}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-6 py-4 text-xs sm:px-8">
        <span className="inline-flex items-center gap-2 text-zinc-400">
          {video.hasAudio ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
          {video.hasAudio ? `${video.audioCodec?.toUpperCase()} audio detected` : 'No audio stream detected'}
        </span>
        <span className="font-mono text-[11px] text-zinc-600">Project {result.projectId}</span>
      </div>
    </section>
  )
}
