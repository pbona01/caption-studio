import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import type { PlayerRef } from '@remotion/player'
import { Check, ChevronDown, ChevronLeft, ChevronUp, LoaderCircle, Redo2, Save, Undo2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { CanvasStage } from '../editor/CanvasStage'
import { Inspector } from '../editor/Inspector'
import { LayoutControls } from '../editor/LayoutControls'
import { PresetBrowser } from '../editor/PresetBrowser'
import { RevealControls } from '../editor/RevealControls'
import { getCaptionPreset } from '../editor/presets'
import { resolveCaptionReveal, resolveCaptionStyle } from '../editor/styleResolver'
import { Timeline } from '../editor/Timeline'
import { AnimationControls, EffectsControls, StyleControls, TextControls, WordAnimationControls } from '../editor/ToolControls'
import type { CaptionComposition, CaptionRevealSettings, CaptionStyleOverrides, EditorProjectDocument, SelectionState, TransformStyle, WordOverride } from '../editor/types'
import { createExport, exportDownloadUrl, getEditorState, getExportStatus, getProject, saveCaptions, saveEditorState, type ExportJob } from '../lib/api'
import { saveOrShareVideo } from '../lib/saveVideo'
import type { CaptionDocument, CaptionSegment, ProjectResponse } from '../types/video'
import { Brand } from './Brand'

const toolTabs = ['Media', 'Style', 'Reveal', 'Text', 'Effects', 'Animation', 'Layout', 'Templates']

function withoutPatchedFields(base: CaptionStyleOverrides, patch: CaptionStyleOverrides): CaptionStyleOverrides {
  const cleaned: Record<string, unknown> = { ...base }
  for (const [group, fields] of Object.entries(patch)) {
    const existing = cleaned[group]
    if (!fields || typeof fields !== 'object' || !existing || typeof existing !== 'object') continue
    cleaned[group] = Object.fromEntries(Object.entries(existing).filter(([field]) => !(field in fields)))
  }
  return cleaned as CaptionStyleOverrides
}

export function Editor() {
  const { projectId = '' } = useParams()
  const playerRef = useRef<PlayerRef>(null)
  const editorStateRef = useRef<EditorProjectDocument | null>(null)
  const [project, setProject] = useState<ProjectResponse | null>(null)
  const [captions, setCaptions] = useState<CaptionDocument | null>(null)
  const [editorState, setEditorState] = useState<EditorProjectDocument | null>(null)
  const [selection, setSelection] = useState<SelectionState>({ type: 'none' })
  const [currentFrame, setCurrentFrame] = useState(0)
  const [activeTool, setActiveTool] = useState('Media')
  const [editScope, setEditScope] = useState<'all' | 'caption' | 'word'>('all')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(true)
  const [exportJob, setExportJob] = useState<ExportJob | null>(() => {
    try {
      const stored = window.localStorage.getItem(`caption-studio-export-${projectId}`)
      return stored ? JSON.parse(stored) as ExportJob : null
    } catch { return null }
  })
  const [exportStarting, setExportStarting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const compactViewport = typeof window !== 'undefined' && window.innerHeight < 760
  const [leftPaneWidth, setLeftPaneWidth] = useState(272)
  const [rightPaneWidth, setRightPaneWidth] = useState(480)
  const [timelineHeight, setTimelineHeight] = useState(compactViewport ? 122 : 184)
  const [transcriptHeight, setTranscriptHeight] = useState(compactViewport ? 126 : 196)
  const [transcriptOpen, setTranscriptOpen] = useState(true)

  const resizePane = (kind: 'left' | 'right' | 'timeline' | 'transcript', event: PointerEvent) => {
    event.preventDefault()
    const startX = event.clientX
    const startY = event.clientY
    const initial = kind === 'left' ? leftPaneWidth : kind === 'right' ? rightPaneWidth : kind === 'timeline' ? timelineHeight : transcriptHeight
    const move = (moveEvent: globalThis.PointerEvent) => {
      const delta = kind === 'timeline' || kind === 'transcript' ? startY - moveEvent.clientY : moveEvent.clientX - startX
      const next = Math.max(110, Math.min(kind === 'left' || kind === 'right' ? 560 : 360, initial + (kind === 'right' ? -delta : delta)))
      if (kind === 'left') setLeftPaneWidth(next)
      else if (kind === 'right') setRightPaneWidth(next)
      else if (kind === 'timeline') setTimelineHeight(next)
      else setTranscriptHeight(next)
    }
    const stop = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', stop) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop, { once: true })
  }

  useEffect(() => {
    void Promise.all([getProject(projectId), getEditorState(projectId)])
      .then(([projectResponse, stateResponse]) => {
        if (!projectResponse.captions) throw new Error('Captions are not ready yet.')
        setProject(projectResponse)
        setCaptions(projectResponse.captions)
        setEditorState(stateResponse)
        editorStateRef.current = stateResponse
        const firstSegment = projectResponse.captions.segments[0]
        if (firstSegment) setSelection({ type: 'segment', segmentId: firstSegment.id })
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Editor failed to load.'))
  }, [projectId])

  useEffect(() => {
    const player = playerRef.current
    if (!player || !project) return
    const listener = (event: { detail: { frame: number } }) => setCurrentFrame(event.detail.frame)
    player.addEventListener('frameupdate', listener)
    player.addEventListener('seeked', listener)
    return () => {
      player.removeEventListener('frameupdate', listener)
      player.removeEventListener('seeked', listener)
    }
  }, [project])

  useEffect(() => {
    const stored = window.localStorage.getItem(`caption-studio-export-${projectId}`)
    if (!stored) return
    try {
      const job = JSON.parse(stored) as ExportJob
      void getExportStatus(projectId, job.jobId).then((current) => {
        setExportError(null)
        setExportJob(current)
      }).catch(() => { /* Keep the saved job visible while the API is unavailable. */ })
    } catch { window.localStorage.removeItem(`caption-studio-export-${projectId}`) }
  }, [projectId])

  useEffect(() => {
    if (!exportJob || exportJob.status === 'ready' || exportJob.status === 'failed') return
    const timer = window.setInterval(() => {
      void getExportStatus(projectId, exportJob.jobId).then((job) => {
        setExportError(null)
        setExportJob(job)
      }).catch((cause) => {
        setExportError(cause instanceof Error ? cause.message : 'Could not check export progress.')
      })
    }, 1200)
    return () => window.clearInterval(timer)
  }, [projectId, exportJob?.jobId, exportJob?.status])

  useEffect(() => {
    const key = `caption-studio-export-${projectId}`
    if (exportJob) window.localStorage.setItem(key, JSON.stringify(exportJob))
    else window.localStorage.removeItem(key)
  }, [projectId, exportJob])

  const words = useMemo(() => captions?.segments.flatMap((segment) => segment.words) ?? [], [captions])
  const selectedWord = selection.type === 'word' ? words.find((word) => word.id === selection.wordId) ?? null : null
  const mutateEditorState = (mutator: (current: EditorProjectDocument) => EditorProjectDocument) => {
    setEditorState((current) => {
      if (!current) return current
      const next = mutator(current)
      editorStateRef.current = next
      setSaved(false)
      setExportJob((current) => current?.status === 'ready' ? null : current)
      return next
    })
  }

  const persistEditorState = async (document = editorStateRef.current) => {
    if (!document) return
    try {
      const response = await saveEditorState(document)
      setEditorState(response)
      editorStateRef.current = response
      setSaved(true)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save editor state.')
    }
  }

  const persistAll = async () => {
    if (!captions || !editorStateRef.current) return
    try {
      const [captionResponse, stateResponse] = await Promise.all([
        saveCaptions(captions),
        saveEditorState(editorStateRef.current),
      ])
      setCaptions(captionResponse)
      setEditorState(stateResponse)
      editorStateRef.current = stateResponse
      setSaved(true)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save project.')
    }
  }

  const beginVideoExport = async () => {
    if (!captions || !editorStateRef.current || exportStarting) return
    setExportError(null)
    setExportJob(null)
    setExportStarting(true)
    try {
      const job = await createExport(projectId, captions, editorStateRef.current)
      setExportJob(job)
    } catch (cause) {
      setExportError(cause instanceof Error ? cause.message : 'Could not start video export.')
    } finally {
      setExportStarting(false)
    }
  }

  const selectSegmentById = (segmentId: string) => setSelection({ type: 'segment', segmentId })
  const selectSegment = (segment: CaptionSegment) => setSelection({ type: 'segment', segmentId: segment.id })
  const selectWord = (segmentId: string, wordId: string, start: number) => {
    setSelection({ type: 'word', segmentId, wordId })
    setEditScope('word')
    setActiveTool((current) => ['Text', 'Effects', 'Animation'].includes(current) ? current : 'Text')
    if (project) playerRef.current?.seekTo(Math.round(start * project.video.fps))
  }

  const updateWord = (wordId: string, changes: { text?: string; emphasis?: boolean }) => {
    setCaptions((current) => {
      if (!current) return current
      const update = (word: (typeof current.words)[number]) => word.id === wordId ? { ...word, ...changes } : word
      setSaved(false)
      setExportJob((current) => current?.status === 'ready' ? null : current)
      return {
        ...current,
        words: current.words.map(update),
        segments: current.segments.map((segment) => ({ ...segment, words: segment.words.map(update) })),
      }
    })
  }

  const deleteWord = (wordId: string) => {
    setCaptions((current) => {
      if (!current) return current
      const segment = current.segments.find((item) => item.words.some((item) => item.id === wordId))
      if (!segment || segment.words.length === 1) return current
      setSaved(false)
      setExportJob((current) => current?.status === 'ready' ? null : current)
      return {
        ...current,
        words: current.words.filter((word) => word.id !== wordId),
        segments: current.segments.map((item) => item.id === segment.id ? { ...item, words: item.words.filter((word) => word.id !== wordId) } : item),
      }
    })
    if (selection.type === 'word' && selection.wordId === wordId) setSelection({ type: 'segment', segmentId: selection.segmentId })
  }

  const patchStyle = (patch: CaptionStyleOverrides) => mutateEditorState((current) => {
    const merge = (base: CaptionStyleOverrides = {}): CaptionStyleOverrides => ({
      ...base,
      typography: { ...base.typography, ...patch.typography },
      fill: { ...base.fill, ...patch.fill },
      stroke: { ...base.stroke, ...patch.stroke },
      shadow: { ...base.shadow, ...patch.shadow },
      glow: { ...base.glow, ...patch.glow },
      transform: { ...base.transform, ...patch.transform },
      layout: { ...base.layout, ...patch.layout },
      animation: { ...base.animation, ...patch.animation },
    })
    if (editScope === 'word' && selection.type === 'word') return { ...current, wordOverrides: { ...current.wordOverrides, [selection.wordId]: { ...current.wordOverrides[selection.wordId], style: merge(current.wordOverrides[selection.wordId]?.style) } } }
    if (editScope === 'caption' && selection.type !== 'none') return { ...current, segmentOverrides: { ...current.segmentOverrides, [selection.segmentId]: merge(current.segmentOverrides[selection.segmentId]) } }
    const segmentOverrides = Object.fromEntries(Object.entries(current.segmentOverrides).map(([id, override]) => [id, withoutPatchedFields(override, patch)]))
    const wordOverrides = Object.fromEntries(Object.entries(current.wordOverrides).map(([id, override]) => {
      if (!override.style) return [id, override]
      return [id, { ...override, style: withoutPatchedFields(override.style, patch) }]
    }))
    return { ...current, projectOverrides: merge(current.projectOverrides), segmentOverrides, wordOverrides }
  })

  const patchWordAnimation = (wordId: string, patch: CaptionStyleOverrides) => mutateEditorState((current) => ({
    ...current,
    wordOverrides: {
      ...current.wordOverrides,
      [wordId]: {
        ...current.wordOverrides[wordId],
        style: {
          ...current.wordOverrides[wordId]?.style,
          animation: { ...current.wordOverrides[wordId]?.style?.animation, ...patch.animation },
        },
      },
    },
  }))

  const patchWordOverride = (wordId: string, patch: Partial<WordOverride>) => mutateEditorState((current) => ({
    ...current,
    wordOverrides: { ...current.wordOverrides, [wordId]: { ...current.wordOverrides[wordId], ...patch } },
  }))

  const patchReveal = (patch: Partial<CaptionRevealSettings>) => mutateEditorState((current) => ({
    ...current,
    reveal: { ...resolveCaptionReveal(current), ...patch },
  }))

  const regroupCaptions = (wordsPerPage: number) => mutateEditorState((current) => ({
    ...current,
    reveal: { ...resolveCaptionReveal(current), wordsPerPage },
    wordOverrides: Object.fromEntries(Object.entries(current.wordOverrides).map(([id, override]) => [id, { ...override, manualBreakBefore: false }])),
  }))

  const applyPreset = (presetId: string) => mutateEditorState((current) => ({ ...current, presetId, reveal: (current.customPresets?.find((preset) => preset.id === presetId) ?? getCaptionPreset(presetId)).reveal, projectOverrides: {}, segmentOverrides: {}, recentPresetIds: [presetId, ...(current.recentPresetIds ?? []).filter((id) => id !== presetId)].slice(0, 8) }))

  const toggleFavorite = (presetId: string) => mutateEditorState((current) => ({ ...current, favoritePresetIds: (current.favoritePresetIds ?? []).includes(presetId) ? current.favoritePresetIds?.filter((id) => id !== presetId) : [...(current.favoritePresetIds ?? []), presetId] }))

  const saveCustomStyle = (name: string) => mutateEditorState((current) => {
    const presetId = `custom-${Date.now()}`
    return { ...current, presetId, reveal: resolveCaptionReveal(current), projectOverrides: {}, segmentOverrides: {}, customPresets: [...(current.customPresets ?? []), { id: presetId, name, category: 'clean', description: 'Saved by you', style: resolveCaptionStyle(current), reveal: resolveCaptionReveal(current) }] }
  })

  const resetTransform = (_segmentId: string) => mutateEditorState((current) => {
    const projectOverrides = { ...current.projectOverrides }
    delete projectOverrides.transform
    const segmentOverrides = Object.fromEntries(Object.entries(current.segmentOverrides).map(([id, override]) => { const cleaned = { ...override }; delete cleaned.transform; return [id, cleaned] }))
    return { ...current, projectOverrides, segmentOverrides }
  })

  const updateLayoutPosition = (x: number, y: number) => mutateEditorState((current) => {
    const transform = { ...resolveCaptionStyle(current).transform, x, y }
    const segmentOverrides = Object.fromEntries(Object.entries(current.segmentOverrides).map(([id, override]) => { const cleaned = { ...override }; delete cleaned.transform; return [id, cleaned] }))
    return { ...current, projectOverrides: { ...current.projectOverrides, transform }, segmentOverrides }
  })

  const updateComposition = (composition: CaptionComposition) => mutateEditorState((current) => {
    const segmentOverrides = Object.fromEntries(Object.entries(current.segmentOverrides).map(([id, override]) => { const cleaned = { ...override }; delete cleaned.layout; return [id, cleaned] }))
    return { ...current, projectOverrides: { ...current.projectOverrides, layout: { ...current.projectOverrides.layout, composition } }, segmentOverrides }
  })

  const updateGlobalTransform = (current: EditorProjectDocument, transform: TransformStyle) => ({
    ...current,
    projectOverrides: { ...current.projectOverrides, transform },
    segmentOverrides: Object.fromEntries(Object.entries(current.segmentOverrides).map(([id, override]) => { const cleaned = { ...override }; delete cleaned.transform; return [id, cleaned] })),
  })

  if (error) return <div className="grid min-h-screen place-items-center bg-canvas px-6 text-sm text-red-200">{error}</div>
  if (!project || !captions || !editorState) return <div className="grid min-h-screen place-items-center bg-canvas"><LoaderCircle className="size-5 animate-spin text-accent" /></div>

  const selectedSegment = selection.type === 'none' ? null : captions.segments.find((segment) => segment.id === selection.segmentId) ?? null
  const activeStyle = resolveCaptionStyle(editorState, editScope === 'all' ? undefined : selectedSegment?.id, editScope === 'word' ? selectedWord?.id : undefined)
  const activeReveal = resolveCaptionReveal(editorState)

  return (
    <div className="editor-shell h-screen overflow-hidden bg-canvas text-white">
      <header className="border-b border-white/[0.07]">
        <div className="mx-auto flex h-16 max-w-[1680px] items-center justify-between px-5">
          <div className="flex min-w-0 items-center gap-5">
            <Brand />
            <div className="hidden h-5 w-px bg-white/10 lg:block" />
            <p className="hidden max-w-[260px] truncate text-xs text-zinc-500 lg:block">{project.video.filename}</p>
            <Link to="/" className="inline-flex items-center gap-1 text-[10px] text-zinc-600 hover:text-white"><ChevronLeft className="size-3" /> New</Link>
          </div>
          <div className="flex items-center gap-2">
            <span className="mr-2 hidden items-center gap-1.5 text-[10px] text-zinc-600 sm:inline-flex">{saved && <Check className="size-3 text-accent" />}{saved ? 'Saved locally' : 'Unsaved changes'}</span>
            <button type="button" disabled className="grid size-8 place-items-center border border-white/[0.07] text-zinc-700" aria-label="Undo"><Undo2 className="size-3.5" /></button>
            <button type="button" disabled className="grid size-8 place-items-center border border-white/[0.07] text-zinc-700" aria-label="Redo"><Redo2 className="size-3.5" /></button>
            <button type="button" onClick={() => void persistAll()} disabled={saved} className="inline-flex h-8 items-center gap-1.5 border border-white/15 px-3 text-[10px] font-medium text-zinc-300 hover:border-white/30 disabled:opacity-40"><Save className="size-3" /> Save</button>
            {exportJob?.status === 'ready' ? <><button type="button" onClick={() => void beginVideoExport()} className="h-8 rounded-lg border border-white/15 px-3 text-[10px] text-zinc-300">Export again</button><button type="button" onClick={() => void saveOrShareVideo(exportDownloadUrl(projectId, exportJob.jobId), `caption-studio-${projectId}.mp4`).catch((cause) => setExportError(cause instanceof Error ? cause.message : 'Could not save the MP4.'))} className="inline-flex h-8 items-center rounded-lg bg-accent px-4 text-[10px] font-bold text-black">Save / share MP4</button></> : <button type="button" onClick={() => void beginVideoExport()} disabled={exportStarting || Boolean(exportJob && exportJob.status !== 'failed')} className="h-8 rounded-lg bg-white px-4 text-[10px] font-semibold text-black transition hover:bg-accent disabled:opacity-50">{exportStarting ? 'Preparing…' : exportJob && exportJob.status !== 'failed' ? `Exporting ${exportJob.progress}%` : 'Export MP4'}</button>}
          </div>
        </div>
      </header>
      {(exportError || exportJob?.status === 'failed') && <div role="alert" className="fixed right-4 top-[70px] z-50 max-w-sm rounded-lg border border-red-400/40 bg-zinc-950 p-3 text-xs text-red-200 shadow-xl">{exportError ?? exportJob?.message}<button type="button" onClick={() => { setExportError(null); setExportJob(null) }} className="ml-3 text-white underline">Dismiss</button></div>}

      <main className="editor-main mx-auto grid h-[calc(100vh-4rem)] max-w-[1680px] grid-rows-[minmax(0,1fr)_auto_auto] overflow-hidden px-5 py-4" style={{ gridTemplateRows: `minmax(0, 1fr) ${timelineHeight}px ${transcriptOpen ? transcriptHeight : 40}px`, '--right-pane': `${rightPaneWidth}px` } as CSSProperties}>
        <div className="editor-workspace grid min-h-0 grid-cols-[220px_minmax(440px,1fr)_280px]" style={{ gridTemplateColumns: `${leftPaneWidth}px minmax(320px, 1fr) ${rightPaneWidth}px`, '--left-pane': `${leftPaneWidth}px`, '--right-pane': `${rightPaneWidth}px` } as CSSProperties}>
        <aside className="editor-tools min-h-0 overflow-y-auto border border-r-0 border-white/10 bg-panel">
          <div className="border-b border-white/[0.07] p-2">
            {toolTabs.map((tool) => <button key={tool} type="button" onClick={() => setActiveTool(tool)} className={`flex h-9 w-full items-center border-l-2 px-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] ${activeTool === tool ? 'border-accent bg-white/[0.04] text-white' : 'border-transparent text-zinc-600 hover:text-zinc-300'}`}>{tool}</button>)}
          </div>
        </aside>

        <CanvasStage
          project={project}
          captions={captions}
          editorState={editorState}
          selection={selection}
          currentFrame={currentFrame}
          playerRef={playerRef}
          onSelectSegment={selectSegment}
          onSelectWord={(segment, wordId, wordStart) => selectWord(segment.id, wordId, wordStart)}
          onTransformChange={(_segmentId: string, transform: TransformStyle) => mutateEditorState((current) => updateGlobalTransform(current, transform))}
          onTransformCommit={(_segmentId, transform) => {
            const current = editorStateRef.current
            if (!current) return
            const next = updateGlobalTransform(current, transform)
            editorStateRef.current = next
            setEditorState(next)
            void persistEditorState(next)
          }}
          onSettingsChange={(changes) => mutateEditorState((current) => ({ ...current, settings: { ...current.settings, ...changes } }))}
        />

        <Inspector captions={captions} editorState={editorState} selection={selection} onResetTransform={resetTransform} activeTool={activeTool}>
          {['Text', 'Effects', 'Animation'].includes(activeTool) && <div className="mt-4"><p className="text-[9px] font-semibold uppercase tracking-[.13em] text-zinc-500">Apply changes to</p><div role="group" aria-label="Apply changes to" className="mt-2 grid grid-cols-3 gap-1 rounded-lg bg-black/30 p-1">{([['all', 'All captions'], ['caption', 'Caption'], ['word', 'Word']] as const).map(([scope, label]) => <button key={scope} type="button" disabled={scope === 'caption' ? !selectedSegment : scope === 'word' ? !selectedWord : false} aria-pressed={editScope === scope} onClick={() => setEditScope(scope)} className={`min-h-8 rounded-md px-1 text-[9px] font-semibold transition disabled:opacity-30 ${editScope === scope ? 'bg-accent text-black' : 'text-zinc-400 hover:bg-white/10 hover:text-white'}`}>{label}</button>)}</div>{editScope === 'word' && selectedWord && <p className="mt-2 text-[10px] text-accent">Editing only “{selectedWord.text}”</p>}{editScope === 'all' && <p className="mt-2 text-[10px] text-zinc-500">Changes apply throughout the video.</p>}</div>}
          {activeTool === 'Media' && <div className="mt-3 space-y-3"><div className="border border-accent/30 bg-accent/[0.06] p-3"><p className="text-[10px] font-bold uppercase text-white">{project.video.filename}</p><p className="mt-1 text-[9px] text-zinc-500">{project.video.width}×{project.video.height} · {project.video.duration.toFixed(1)}s</p></div><p className="text-[10px] leading-5 text-zinc-500">Your uploaded video is ready for caption editing.</p></div>}
          {activeTool === 'Style' && <PresetBrowser customPresets={editorState.customPresets} activeId={editorState.presetId} favorites={editorState.favoritePresetIds} recent={editorState.recentPresetIds} onApply={applyPreset} onFavorite={toggleFavorite} onSaveStyle={saveCustomStyle} />}
          {activeTool === 'Reveal' && <RevealControls reveal={activeReveal} onPatch={patchReveal} />}
          {activeTool === 'Templates' && <PresetBrowser customPresets={editorState.customPresets} activeId={editorState.presetId} favorites={editorState.favoritePresetIds} recent={editorState.recentPresetIds} onApply={applyPreset} onFavorite={toggleFavorite} onSaveStyle={saveCustomStyle} />}
          {activeTool === 'Text' && <><TextControls segment={selectedSegment} word={selectedWord} wordOverride={selectedWord ? editorState.wordOverrides[selectedWord.id] : undefined} onSelectWord={(word) => selectWord(selectedSegment!.id, word.id, word.start)} onWordText={(wordId, text) => updateWord(wordId, { text })} onDeleteWord={deleteWord} onWordOverride={patchWordOverride} onEmphasis={(wordId, emphasis) => updateWord(wordId, { emphasis })} onRegroup={regroupCaptions} /><StyleControls style={activeStyle} onPatch={patchStyle} /></>}
          {activeTool === 'Effects' && <EffectsControls style={activeStyle} onPatch={patchStyle} wordMode={editScope === 'word' && Boolean(selectedWord)} />}
          {activeTool === 'Animation' && <><AnimationControls style={activeStyle} onPatch={patchStyle} />{editScope === 'word' && selectedWord && <WordAnimationControls onPatch={(patch) => patchWordAnimation(selectedWord.id, patch)} />}</>}
          {activeTool === 'Layout' && <LayoutControls editorState={editorState} style={activeStyle} onPosition={updateLayoutPosition} onTransformPatch={(transform) => patchStyle({ transform })} onComposition={updateComposition} />}
        </Inspector>
        <button type="button" aria-label="Resize media panel" className="pane-resizer pane-resizer-left" onPointerDown={(event) => resizePane('left', event)} />
        <button type="button" aria-label="Resize canvas panel" className="pane-resizer pane-resizer-right" onPointerDown={(event) => resizePane('right', event)} />
        </div>

        <div className="editor-timeline-wrap relative min-h-0" onPointerDown={(event) => { if ((event.target as HTMLElement).closest('[data-resize-handle]')) resizePane('timeline', event) }}><span data-resize-handle className="section-resizer section-resizer-top" /><Timeline captions={captions} fps={project.video.fps} duration={project.video.duration} currentFrame={currentFrame} selection={selection} playerRef={playerRef} onSelectSegment={selectSegmentById} onSelectWord={selectWord} /></div>

        <section className={`editor-transcript relative min-h-0 border border-t-0 border-white/10 bg-panel px-5 py-3 ${transcriptOpen ? '' : 'transcript-collapsed'}`}><span data-resize-handle className="section-resizer section-resizer-top" onPointerDown={(event) => resizePane('transcript', event)} />
          <div className="flex items-center justify-between gap-4"><button type="button" onClick={() => setTranscriptOpen((open) => !open)} className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500 hover:text-white"><span>Transcript</span>{transcriptOpen && <ChevronDown className="size-3" />}{!transcriptOpen && <ChevronUp className="size-3" />}</button>{transcriptOpen && <p className="text-[9px] text-zinc-700">Click a word on the video or here to edit it</p>}</div>
          {transcriptOpen && <><div className="mt-3 flex max-h-24 flex-wrap gap-1 overflow-y-auto">
            {captions.segments.map((segment) => segment.words.map((word) => <button key={word.id} type="button" onClick={() => selectWord(segment.id, word.id, word.start)} className={`border px-2 py-1 text-[10px] transition ${selection.type === 'word' && selection.wordId === word.id ? 'border-accent text-accent' : word.emphasis ? 'border-white/20 bg-white/[0.05] font-bold text-white' : 'border-white/[0.07] text-zinc-500 hover:border-white/20'}`}>{word.text}</button>))}
          </div>
          {selectedWord && <div className="mt-4 flex items-end gap-3 border-t border-white/[0.07] pt-3"><label className="block flex-1 max-w-sm text-[9px] uppercase tracking-[0.13em] text-zinc-600">Word text<input value={selectedWord.text} onChange={(event) => updateWord(selectedWord.id, { text: event.target.value })} className="mt-1.5 h-8 w-full border border-white/10 bg-black/30 px-3 text-xs normal-case tracking-normal text-white outline-none focus:border-accent/60" /></label><button type="button" onClick={() => updateWord(selectedWord.id, { emphasis: !selectedWord.emphasis })} className={`h-8 border px-3 text-[10px] font-semibold ${selectedWord.emphasis ? 'border-accent bg-accent text-black' : 'border-white/15 text-zinc-300'}`}>Emphasis {selectedWord.emphasis ? 'on' : 'off'}</button></div>}</>}
        </section>
      </main>
    </div>
  )
}
