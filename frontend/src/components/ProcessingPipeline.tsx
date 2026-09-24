import { Check, LoaderCircle, RotateCcw, X } from 'lucide-react'
import type { ProcessingStatus } from '../types/video'

interface ProcessingPipelineProps {
  status: ProcessingStatus
  message: string
  error: string | null
  onRetry: () => void
}

const steps: Array<{ status: ProcessingStatus[]; label: string }> = [
  { status: ['uploaded'], label: 'Video ready' },
  { status: ['extracting_audio'], label: 'Preparing audio' },
  { status: ['preparing_model', 'transcribing'], label: 'Transcribing speech' },
  { status: ['segmenting'], label: 'Creating captions' },
  { status: ['ready'], label: 'Preparing editor' },
]

const order: ProcessingStatus[] = [
  'uploaded',
  'extracting_audio',
  'preparing_model',
  'transcribing',
  'segmenting',
  'ready',
]

export function ProcessingPipeline({ status, message, error, onRetry }: ProcessingPipelineProps) {
  const activeOrder = order.indexOf(status)

  return (
    <section className="mt-4 border border-white/10 bg-panel px-6 py-6 sm:px-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">Caption pipeline</p>
          <p className="mt-1.5 text-sm text-zinc-500">{status === 'error' ? 'Processing stopped' : message}</p>
        </div>
        {status !== 'error' && status !== 'ready' && <LoaderCircle className="size-4 animate-spin text-accent" />}
      </div>

      <div className="space-y-1">
        {steps.map((step) => {
          const stepOrder = Math.min(...step.status.map((item) => order.indexOf(item)).filter((item) => item >= 0))
          const active = step.status.includes(status)
          const complete = status === 'ready' || (activeOrder > stepOrder && activeOrder >= 0)
          return (
            <div key={step.label} className="grid grid-cols-[24px_1fr] items-center gap-3 py-2.5">
              <span
                className={`grid size-5 place-items-center border text-[10px] ${
                  complete
                    ? 'border-accent bg-accent text-black'
                    : active
                      ? 'border-accent/70 text-accent'
                      : 'border-white/10 text-zinc-700'
                }`}
              >
                {complete ? <Check className="size-3" strokeWidth={3} /> : active ? <span className="size-1.5 animate-pulse rounded-full bg-current" /> : null}
              </span>
              <div>
                <p className={`text-sm ${complete || active ? 'text-zinc-200' : 'text-zinc-600'}`}>{step.label}</p>
                {active && status === 'preparing_model' && (
                  <p className="mt-1 text-xs text-zinc-600">First run may download the local speech model.</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {status === 'error' && (
        <div className="mt-5 border border-red-400/20 bg-red-400/[0.05] p-4">
          <div className="flex gap-3 text-sm text-red-100/80">
            <X className="mt-0.5 size-4 shrink-0" />
            <p>{error ?? 'Processing failed. Check the backend log for details.'}</p>
          </div>
          <button type="button" onClick={onRetry} className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-white hover:text-accent">
            <RotateCcw className="size-3.5" /> Retry processing
          </button>
        </div>
      )}
    </section>
  )
}
