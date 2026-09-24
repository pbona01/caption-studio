import { useEffect, useMemo, useRef, useState, type PointerEvent, type RefObject } from 'react'
import { Player, type PlayerRef } from '@remotion/player'
import { Grid3X3, ShieldCheck } from 'lucide-react'
import { resolveCaptionStyle } from './styleResolver'
import type { EditorProjectDocument, SelectionState, TransformStyle } from './types'
import type { CaptionDocument, CaptionSegment, ProjectResponse } from '../types/video'
import { BigBoldComposition } from '../remotion/BigBoldComposition'
import { resolveApiUrl } from '../lib/api'

interface CanvasStageProps {
  project: ProjectResponse
  captions: CaptionDocument
  editorState: EditorProjectDocument
  selection: SelectionState
  currentFrame: number
  playerRef: RefObject<PlayerRef>
  onSelectSegment: (segment: CaptionSegment) => void
  onSelectWord: (segment: CaptionSegment, wordId: string, wordStart: number) => void
  onTransformChange: (segmentId: string, transform: TransformStyle) => void
  onTransformCommit: (segmentId: string, transform: TransformStyle) => void
  onSettingsChange: (changes: Partial<EditorProjectDocument['settings']>) => void
}

type InteractionMode = 'drag' | 'resize' | 'rotate'
type Guides = { x?: number; y?: number }

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value))
const snapTargets = { x: [0.08, 0.5, 0.86], y: [0.1, 0.5, 0.82] }

function closestSnap(value: number, targets: number[]) {
  const candidate = targets.reduce((closest, target) => Math.abs(target - value) < Math.abs(closest - value) ? target : closest)
  return Math.abs(candidate - value) <= 0.018 ? candidate : undefined
}

export function CanvasStage({
  project,
  captions,
  editorState,
  selection,
  currentFrame,
  playerRef,
  onSelectSegment,
  onSelectWord,
  onTransformChange,
  onTransformCommit,
  onSettingsChange,
}: CanvasStageProps) {
  const [guides, setGuides] = useState<Guides>({})
  const currentTime = currentFrame / project.video.fps
  const activeSegment = useMemo(
    () => captions.segments.find((segment) => currentTime >= segment.start - 0.04 && currentTime <= segment.end + 0.06),
    [captions.segments, currentTime],
  )
  const activeStyle = activeSegment ? resolveCaptionStyle(editorState, activeSegment.id) : null
  const selected = activeSegment && selection.type !== 'none' && selection.segmentId === activeSegment.id
  const previouslyActiveSegmentId = useRef<string | undefined>()
  const playerInputProps = useMemo(() => ({
    videoSrc: resolveApiUrl(project.videoUrl),
    segments: captions.segments,
    fps: project.video.fps,
    editorState,
    selectedWordId: selection.type === 'word' ? selection.wordId : undefined,
    isEditorPreview: true,
  }), [project.videoUrl, project.video.fps, captions.segments, editorState, selection])

  useEffect(() => {
    if (!activeSegment || activeSegment.id === previouslyActiveSegmentId.current) return
    previouslyActiveSegmentId.current = activeSegment.id
    if (selection.type === 'word' && selection.segmentId === activeSegment.id) return
    onSelectSegment(activeSegment)
  }, [activeSegment, onSelectSegment, selection])

  const startInteraction = (
    event: PointerEvent<HTMLElement>,
    mode: InteractionMode,
    resizeDirection: [number, number] = [1, 1],
  ) => {
    if (!activeSegment || !activeStyle) return
    event.preventDefault()
    event.stopPropagation()
    onSelectSegment(activeSegment)
    playerRef.current?.pause()

    const canvas = event.currentTarget.closest('[data-video-canvas]') as HTMLDivElement | null
    if (!canvas) return
    const bounds = canvas.getBoundingClientRect()
    const origin = activeStyle.transform
    const startX = event.clientX
    const startY = event.clientY
    const centerX = bounds.left + origin.x * bounds.width
    const centerY = bounds.top + origin.y * bounds.height
    const startAngle = Math.atan2(event.clientY - centerY, event.clientX - centerX) * 180 / Math.PI
    let latest = origin
    let changed = false

    const move = (moveEvent: globalThis.PointerEvent) => {
      const dx = moveEvent.clientX - startX
      const dy = moveEvent.clientY - startY
      let next: TransformStyle = { ...origin }
      if (mode === 'drag') {
        let normalizedX = dx / bounds.width
        let normalizedY = dy / bounds.height
        if (moveEvent.shiftKey) {
          if (Math.abs(normalizedX) > Math.abs(normalizedY)) normalizedY = 0
          else normalizedX = 0
        }
        let x = clamp(origin.x + normalizedX, 0.06, 0.94)
        let y = clamp(origin.y + normalizedY, 0.06, 0.94)
        const snappedX = closestSnap(x, snapTargets.x)
        const snappedY = closestSnap(y, snapTargets.y)
        if (snappedX !== undefined) x = snappedX
        if (snappedY !== undefined) y = snappedY
        setGuides({ x: snappedX, y: snappedY })
        next = { ...origin, x, y }
      } else if (mode === 'resize') {
        const delta = ((dx / bounds.width) * resizeDirection[0] + (dy / bounds.height) * resizeDirection[1]) * 1.5
        const scale = clamp(origin.scaleX + delta, 0.45, 2.5)
        next = { ...origin, scaleX: scale, scaleY: scale }
      } else {
        const angle = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX) * 180 / Math.PI
        let rotation = origin.rotation + angle - startAngle
        if (moveEvent.shiftKey) rotation = Math.round(rotation / 15) * 15
        next = { ...origin, rotation: Math.round(rotation * 10) / 10 }
      }
      latest = next
      changed = true
      onTransformChange(activeSegment.id, next)
    }

    const stop = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
      setGuides({})
      if (changed) {
        onTransformChange(activeSegment.id, latest)
        onTransformCommit(activeSegment.id, latest)
      }
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop, { once: true })
  }

  const transform = activeStyle?.transform
  const boxStyle: React.CSSProperties | undefined = transform && activeStyle ? {
    left: `${transform.x * 100}%`,
    top: `${transform.y * 100}%`,
    width: `${activeStyle.typography.maxWidth * transform.scaleX * 100}%`,
    height: `${Math.min(42, 25 * transform.scaleY)}%`,
    transform: `translate(-50%, -50%) rotate(${transform.rotation}deg)`,
  } : undefined

  return (
    <section className="editor-canvas flex h-full min-h-0 flex-col border-y border-white/10 bg-[#0d0d0e]">
      <div className="flex h-11 items-center justify-between border-b border-white/[0.07] px-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">Video canvas</p>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onSettingsChange({ showGuides: !editorState.settings.showGuides })} className={`inline-flex h-7 items-center gap-1.5 border px-2 text-[10px] ${editorState.settings.showGuides ? 'border-white/20 text-white' : 'border-white/[0.08] text-zinc-600'}`}><Grid3X3 className="size-3" /> Guides</button>
          <button type="button" onClick={() => onSettingsChange({ showSafeAreas: !editorState.settings.showSafeAreas })} className={`inline-flex h-7 items-center gap-1.5 border px-2 text-[10px] ${editorState.settings.showSafeAreas ? 'border-accent/40 text-accent' : 'border-white/[0.08] text-zinc-600'}`}><ShieldCheck className="size-3" /> Safe areas</button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-8 py-5">
        <div data-video-canvas className="relative w-full max-w-[380px] overflow-hidden border border-white/10 bg-black shadow-lift" style={{ aspectRatio: `${project.video.width} / ${project.video.height}` }}>
          <Player
            ref={playerRef}
            component={BigBoldComposition}
            inputProps={playerInputProps}
            durationInFrames={Math.max(1, Math.ceil(project.video.duration * project.video.fps))}
            compositionWidth={project.video.width}
            compositionHeight={project.video.height}
            fps={project.video.fps}
            controls
            clickToPlay
            acknowledgeRemotionLicense
            style={{ width: '100%', height: '100%' }}
          />

          {editorState.settings.showSafeAreas && (
            <div className="pointer-events-none absolute inset-0 z-10">
              <div className="absolute inset-x-[6%] bottom-[18%] top-[9%] border border-dashed border-white/25" />
              <div className="absolute bottom-0 right-0 top-0 w-[14%] bg-red-400/[0.035]" />
              <div className="absolute inset-x-0 bottom-0 h-[18%] bg-red-400/[0.035]" />
              <span className="absolute left-[7%] top-[10%] text-[7px] font-semibold uppercase tracking-[0.14em] text-white/35">Safe</span>
            </div>
          )}

          {editorState.settings.showGuides && guides.x !== undefined && <div className="pointer-events-none absolute inset-y-0 z-30 w-px bg-accent/80" style={{ left: `${guides.x * 100}%` }} />}
          {editorState.settings.showGuides && guides.y !== undefined && <div className="pointer-events-none absolute inset-x-0 z-30 h-px bg-accent/80" style={{ top: `${guides.y * 100}%` }} />}

          {activeSegment && boxStyle && (
            <div
              data-caption-bounds
              onPointerDown={(event) => {
                const hit = document.elementsFromPoint(event.clientX, event.clientY)
                  .find((element) => element instanceof HTMLElement && element.dataset.captionWordId) as HTMLElement | undefined
                const word = activeSegment.words.find((item) => item.id === hit?.dataset.captionWordId)
                if (word) {
                  event.preventDefault()
                  event.stopPropagation()
                  playerRef.current?.pause()
                  onSelectWord(activeSegment, word.id, word.start)
                  return
                }
                startInteraction(event, 'drag')
              }}
              onDoubleClick={(event) => {
                const hit = document.elementsFromPoint(event.clientX, event.clientY)
                  .find((element) => element instanceof HTMLElement && element.dataset.captionWordId) as HTMLElement | undefined
                const word = activeSegment.words.find((item) => item.id === hit?.dataset.captionWordId)
                  ?? activeSegment.words.find((item) => item.emphasis) ?? activeSegment.words[0]
                onSelectWord(activeSegment, word.id, word.start)
              }}
              className={`absolute z-20 cursor-move ${selected ? 'border border-accent' : 'border border-transparent hover:border-white/40'}`}
              style={boxStyle}
            >
              {selected && (
                <>
                  {([[-1, -1], [1, -1], [-1, 1], [1, 1]] as Array<[number, number]>).map(([x, y]) => (
                    <button
                      key={`${x}-${y}`}
                      type="button"
                      aria-label="Resize caption"
                      onPointerDown={(event) => startInteraction(event, 'resize', [x, y])}
                      className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 border border-black bg-accent"
                      style={{ left: x < 0 ? 0 : '100%', top: y < 0 ? 0 : '100%', cursor: `${x === y ? 'nwse' : 'nesw'}-resize` }}
                    />
                  ))}
                  <div className="absolute left-1/2 top-0 h-5 w-px -translate-x-1/2 -translate-y-full bg-accent" />
                  <button type="button" aria-label="Rotate caption" onPointerDown={(event) => startInteraction(event, 'rotate')} className="absolute left-1/2 top-[-24px] size-3 -translate-x-1/2 rounded-full border border-black bg-accent cursor-grab" />
                  <span className="absolute -top-6 left-0 bg-accent px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.1em] text-black">Caption</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
