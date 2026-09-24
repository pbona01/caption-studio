import type { ReactNode } from 'react'
import { RotateCcw } from 'lucide-react'
import { resolveCaptionStyle } from './styleResolver'
import type { EditorProjectDocument, SelectionState } from './types'
import type { CaptionDocument } from '../types/video'

interface InspectorProps {
  captions: CaptionDocument
  editorState: EditorProjectDocument
  selection: SelectionState
  onResetTransform: (segmentId: string) => void
  activeTool: string
  children?: ReactNode
}

export function Inspector({ captions, editorState, selection, onResetTransform, activeTool, children }: InspectorProps) {
  const segment = selection.type === 'none' ? null : captions.segments.find((item) => item.id === selection.segmentId)
  const word = selection.type === 'word' ? segment?.words.find((item) => item.id === selection.wordId) : null
  const style = resolveCaptionStyle(editorState, segment?.id, word?.id)
  const context = word ? `Word — ${word.text}` : segment ? `Caption — ${segment.id.replace('segment-', '')}` : 'Project defaults'

  return (
    <aside className="editor-inspector min-h-0 overflow-y-auto border border-l-0 border-white/10 bg-panel p-5">
      <div className="flex items-center justify-between gap-3"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">Inspector</p><span className="rounded border border-white/10 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.13em] text-accent">{activeTool}</span></div>
      <p className="mt-2 truncate text-xs font-semibold text-zinc-200">{context}</p>
      {(activeTool === 'Media' || activeTool === 'Layout') && <details open className="mt-5 border-t border-white/[0.07] pt-4">
        <summary className="cursor-pointer list-none text-[10px] font-semibold uppercase tracking-[0.13em] text-zinc-500">Transform</summary>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {[['X', `${Math.round(style.transform.x * 100)}%`], ['Y', `${Math.round(style.transform.y * 100)}%`], ['Scale', `${Math.round(style.transform.scaleX * 100)}%`], ['Rotate', `${style.transform.rotation.toFixed(1)}°`]].map(([label, value]) => (
            <div key={label} className="border border-white/[0.07] bg-black/20 px-2.5 py-2">
              <p className="text-[8px] uppercase tracking-[0.12em] text-zinc-700">{label}</p>
              <p className="mt-1 font-mono text-[11px] text-zinc-300">{value}</p>
            </div>
          ))}
        </div>
        {segment && (
          <button type="button" onClick={() => onResetTransform(segment.id)} className="mt-3 inline-flex items-center gap-1.5 text-[10px] text-zinc-500 hover:text-white"><RotateCcw className="size-3" /> Reset transform</button>
        )}
      </details>}
      {children && <div className="inspector-tool-panel border-t border-white/[0.07] pt-4">{children}</div>}
    </aside>
  )
}
