import type { CaptionComposition, CaptionStyle, EditorProjectDocument, TransformStyle } from './types'

interface LayoutControlsProps {
  editorState: EditorProjectDocument
  style: CaptionStyle
  onPosition: (x: number, y: number) => void
  onTransformPatch: (transform: Partial<TransformStyle>) => void
  onComposition: (composition: CaptionComposition) => void
}

const positions = [
  { label: 'Top left', glyph: '↖', x: 0.14, y: 0.17 },
  { label: 'Top center', glyph: '↑', x: 0.5, y: 0.17 },
  { label: 'Top right', glyph: '↗', x: 0.86, y: 0.17 },
  { label: 'Middle left', glyph: '←', x: 0.14, y: 0.5 },
  { label: 'Center', glyph: '●', x: 0.5, y: 0.5 },
  { label: 'Middle right', glyph: '→', x: 0.86, y: 0.5 },
  { label: 'Bottom left', glyph: '↙', x: 0.14, y: 0.8 },
  { label: 'Bottom center', glyph: '↓', x: 0.5, y: 0.8 },
  { label: 'Bottom right', glyph: '↘', x: 0.86, y: 0.8 },
]

const compositions: Array<{ id: CaptionComposition; label: string; lines: string[]; align: 'left' | 'center' | 'right'; hero: number }> = [
  { id: 'big-hero', label: 'Big hero', lines: ['CHANGE', 'their lives'], align: 'center', hero: 0 },
  { id: 'left-stack', label: 'Left stack', lines: ['LOT OF', 'HEADACHE'], align: 'left', hero: 1 },
  { id: 'right-stack', label: 'Right stack', lines: ['LOT', 'OF TIME'], align: 'right', hero: 1 },
  { id: 'number-hero', label: 'Number hero', lines: ['I MADE', '$10,000'], align: 'center', hero: 1 },
  { id: 'lower-third', label: 'Lower third', lines: ['your message', 'starts here'], align: 'left', hero: 1 },
  { id: 'karaoke', label: 'Karaoke', lines: ['SAY IT', 'WITH ENERGY'], align: 'center', hero: 1 },
]

export function LayoutControls({ editorState, style, onPosition, onTransformPatch, onComposition }: LayoutControlsProps) {
  const composition = editorState.projectOverrides.layout?.composition ?? 'big-hero'

  return (
    <div className="mt-3 space-y-5">
      <section>
        <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-zinc-600">Position</p>
        <div className="mt-2 grid grid-cols-3 gap-px border border-white/10 bg-white/10">
          {positions.map((position) => (
            <button key={position.label} type="button" title={position.label} aria-label={position.label} onClick={() => onPosition(position.x, position.y)} className="grid aspect-square place-items-center bg-panel text-base text-zinc-400 transition hover:bg-white/[0.08] hover:text-white">
              {position.glyph}
            </button>
          ))}
        </div>
        <div className="mt-3 space-y-2 border-t border-white/[0.07] pt-3">
          <label className="block text-[8px] font-semibold uppercase tracking-[0.12em] text-zinc-600">Scale <span className="float-right font-mono normal-case text-zinc-400">{Math.round(style.transform.scaleX * 100)}%</span><input aria-label="Caption scale" type="range" min="0.45" max="2.5" step="0.01" value={style.transform.scaleX} onChange={(event) => onTransformPatch({ scaleX: Number(event.target.value), scaleY: Number(event.target.value) })} className="mt-2 w-full accent-lime-300" /></label>
          <label className="block text-[8px] font-semibold uppercase tracking-[0.12em] text-zinc-600">Rotation <span className="float-right font-mono normal-case text-zinc-400">{style.transform.rotation.toFixed(0)}°</span><input aria-label="Caption rotation" type="range" min="-45" max="45" step="1" value={style.transform.rotation} onChange={(event) => onTransformPatch({ rotation: Number(event.target.value) })} className="mt-2 w-full accent-lime-300" /></label>
        </div>
      </section>
      <section>
        <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-zinc-600">Composition</p>
        <div className="mt-2 space-y-2">
          {compositions.map((item) => (
            <button key={item.id} type="button" onClick={() => onComposition(item.id)} className={`w-full border px-2 py-2 text-left transition ${composition === item.id ? 'border-accent bg-accent/[0.07]' : 'border-white/10 bg-black/10 hover:border-white/25'}`}>
              <span className="grid h-12 place-items-center border border-white/15 px-2 font-sans leading-none" style={{ textAlign: item.align }}>
                {item.lines.map((line, index) => <span key={line} className={`block w-full ${index === item.hero ? 'text-[12px] font-black tracking-[-0.08em] text-white' : 'text-[8px] font-semibold text-zinc-400'}`}>{line}</span>)}
              </span>
              <span className="mt-1.5 block text-[8px] font-semibold uppercase tracking-[0.13em] text-zinc-500">{item.label}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
