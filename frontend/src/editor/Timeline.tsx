import type { PlayerRef } from '@remotion/player'
import type { RefObject } from 'react'
import type { CaptionDocument } from '../types/video'
import type { SelectionState } from './types'

interface TimelineProps {
  captions: CaptionDocument
  fps: number
  duration: number
  currentFrame: number
  selection: SelectionState
  playerRef: RefObject<PlayerRef>
  onSelectSegment: (segmentId: string) => void
  onSelectWord: (segmentId: string, wordId: string, start: number) => void
}

export function Timeline({ captions, fps, duration, currentFrame, selection, playerRef, onSelectSegment, onSelectWord }: TimelineProps) {
  const playhead = Math.min(100, (currentFrame / fps / duration) * 100)
  const selectedSegmentId = selection.type === 'none' ? null : selection.segmentId

  return (
    <section className="border border-t-0 border-white/10 bg-panel px-5 py-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">Timeline</p>
        <p className="font-mono text-[10px] text-zinc-600">{(currentFrame / fps).toFixed(2)}s / {duration.toFixed(2)}s</p>
      </div>
      <div className="mt-3 grid grid-cols-[72px_1fr] gap-x-3 gap-y-2 text-[9px] uppercase tracking-[0.12em] text-zinc-700">
        <span className="pt-2">Captions</span>
        <div className="relative h-9 border-y border-white/[0.06] bg-black/20">
          {captions.segments.map((segment) => (
            <button
              key={segment.id}
              type="button"
              aria-label={`Select ${segment.words.map((word) => word.text).join(' ')}`}
              onClick={() => {
                onSelectSegment(segment.id)
                playerRef.current?.seekTo(Math.round(segment.start * fps))
              }}
              className={`absolute inset-y-1 min-w-[6px] border ${selectedSegmentId === segment.id ? 'border-accent bg-accent/20' : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.08]'}`}
              style={{ left: `${segment.start / duration * 100}%`, width: `${Math.max(0.45, (segment.end - segment.start) / duration * 100)}%` }}
            />
          ))}
          <div className="pointer-events-none absolute inset-y-0 z-20 w-px bg-white" style={{ left: `${playhead}%` }} />
        </div>
        <span className="pt-1.5">Words</span>
        <div className="flex min-h-8 items-center gap-1 overflow-x-auto pb-1">
          {(captions.segments.find((segment) => segment.id === selectedSegmentId)?.words ?? captions.segments[0]?.words ?? []).map((word) => (
            <button
              key={word.id}
              type="button"
              onClick={() => selectedSegmentId && onSelectWord(selectedSegmentId, word.id, word.start)}
              className={`shrink-0 border px-2 py-1 text-[9px] normal-case tracking-normal ${selection.type === 'word' && selection.wordId === word.id ? 'border-accent text-accent' : 'border-white/[0.08] text-zinc-500'}`}
            >
              {word.text}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
