import type { CaptionSegment, TranscriptWord } from '../types/video'
import { useEffect, useState } from 'react'
import type { CaptionRevealMode, CaptionRevealSettings, CaptionStyle, CaptionStyleOverrides, WordOverride } from './types'

interface StyleControlsProps {
  style: CaptionStyle
  onPatch: (patch: CaptionStyleOverrides) => void
}

const fieldClass = 'mt-1 h-8 w-full border border-white/10 bg-black/30 px-2 text-[10px] text-zinc-200 outline-none focus:border-accent/70'
const labelClass = 'block text-[8px] font-semibold uppercase tracking-[0.12em] text-zinc-600'

export function StyleControls({ style, onPatch }: StyleControlsProps) {
  return <div className="mt-3 space-y-3">
    <label className={labelClass}>Font family<select value={style.typography.fontFamily} onChange={(event) => onPatch({ typography: { fontFamily: event.target.value } })} className={fieldClass}><option value="Inter, Arial, sans-serif">Inter</option><option value="Poppins, Arial, sans-serif">Poppins</option><option value="Montserrat, Arial, sans-serif">Montserrat</option><option value="Arial, sans-serif">Arial</option><option value="Georgia, serif">Georgia</option><option value="Impact, sans-serif">Impact</option></select></label>
    <div className="grid grid-cols-2 gap-2"><label className={labelClass}>Weight<select value={style.typography.fontWeight} onChange={(event) => onPatch({ typography: { fontWeight: Number(event.target.value) } })} className={fieldClass}><option value="400">Regular</option><option value="500">Medium</option><option value="600">SemiBold</option><option value="700">Bold</option><option value="800">ExtraBold</option><option value="900">Black</option></select></label><label className={labelClass}>Align<select value={style.typography.alignment} onChange={(event) => onPatch({ typography: { alignment: event.target.value as CaptionStyle['typography']['alignment'] } })} className={fieldClass}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label></div>
    <Toggle label="Italic" checked={style.typography.fontStyle === 'italic'} onChange={(italic) => onPatch({ typography: { fontStyle: italic ? 'italic' : 'normal' } })} />
    <Range label="Hero size" value={style.typography.emphasisSize} min={0.06} max={0.28} step={0.005} display={`${Math.round(style.typography.emphasisSize * 1000)} px`} onChange={(value) => onPatch({ typography: { emphasisSize: value } })} />
    <Range label="Caption size" value={style.typography.secondarySize} min={0.025} max={0.12} step={0.005} display={`${Math.round(style.typography.secondarySize * 1000)} px`} onChange={(value) => onPatch({ typography: { secondarySize: value } })} />
    <Range label="Width" value={style.typography.maxWidth} min={0.3} max={1} step={0.02} display={`${Math.round(style.typography.maxWidth * 100)}%`} onChange={(value) => onPatch({ typography: { maxWidth: value } })} />
    <Range label="Line height" value={style.typography.lineHeight} min={0.7} max={1.8} step={0.05} display={`${style.typography.lineHeight.toFixed(2)}×`} onChange={(lineHeight) => onPatch({ typography: { lineHeight } })} />
    <Range label="Tracking" value={style.typography.letterSpacing} min={-0.1} max={0.2} step={0.005} display={`${style.typography.letterSpacing.toFixed(3)}em`} onChange={(letterSpacing) => onPatch({ typography: { letterSpacing } })} />
    <button type="button" onClick={() => onPatch({ typography: { textTransform: style.typography.textTransform === 'uppercase' ? 'none' : 'uppercase' } })} className={`h-8 w-full border text-[9px] font-semibold uppercase tracking-[0.1em] ${style.typography.textTransform === 'uppercase' ? 'border-accent bg-accent/15 text-accent' : 'border-white/10 text-zinc-500'}`}>Uppercase</button>
  </div>
}

const revealChoices: Array<{ mode: CaptionRevealMode; label: string; group: string; example: string }> = [
  { mode: 'full-phrase', label: 'Full phrase', group: 'Phrases', example: 'MAKE IT COUNT' },
  { mode: 'smart-chunks', label: 'Smart chunks', group: 'Phrases', example: 'MAKE / IT COUNT' },
  { mode: 'line-by-line', label: 'Line by line', group: 'Phrases', example: 'MAKE IT\nCOUNT' },
  { mode: 'single-word', label: 'Single word', group: 'Word modes', example: 'COUNT' },
  { mode: 'two-words', label: 'Two words', group: 'Word modes', example: 'IT COUNT' },
  { mode: 'three-words', label: 'Three words', group: 'Word modes', example: 'MAKE IT COUNT' },
  { mode: 'word-build', label: 'Word build', group: 'Word modes', example: 'MAKE IT COUNT' },
  { mode: 'word-replace', label: 'Word replace', group: 'Word modes', example: 'COUNT' },
  { mode: 'letter-by-letter', label: 'Letter build', group: 'Type & track', example: 'COUNT|' },
  { mode: 'typewriter-phrase', label: 'Typewriter', group: 'Type & track', example: 'MAKE IT|' },
  { mode: 'active-word', label: 'Active word', group: 'Type & track', example: 'MAKE IT COUNT' },
  { mode: 'karaoke', label: 'Karaoke', group: 'Type & track', example: 'MAKE IT COUNT' },
  { mode: 'karaoke-sweep', label: 'Karaoke sweep', group: 'Type & track', example: 'MAKE IT COUNT' },
  { mode: 'underline-track', label: 'Underline track', group: 'Type & track', example: 'MAKE IT COUNT' },
  { mode: 'keyword-hero', label: 'Keyword hero', group: 'Advanced', example: 'MAKE IT COUNT' },
  { mode: 'number-hero', label: 'Number hero', group: 'Advanced', example: '$10,000' },
  { mode: 'vertical-word-stack', label: 'Vertical stack', group: 'Advanced', example: 'MAKE\nIT\nCOUNT' },
  { mode: 'rapid-fire', label: 'Rapid fire', group: 'Advanced', example: 'COUNT' },
  { mode: 'slow-read', label: 'Slow read', group: 'Advanced', example: 'MAKE IT COUNT' },
]

const revealModeLabels: Record<CaptionRevealMode, string> = {
  'full-phrase': 'Full phrase', 'single-word': 'Single word', 'two-words': 'Two words', 'three-words': 'Three words', 'smart-chunks': 'Smart chunks', 'word-build': 'Word build', 'word-replace': 'Word replace', 'letter-by-letter': 'Letter by letter', 'letter-build': 'Letter build', 'letter-replace': 'Letter replace', 'typewriter-phrase': 'Typewriter phrase', 'line-by-line': 'Line by line', 'line-replace': 'Line replace', 'active-word': 'Active word', 'active-word-fade': 'Active word fade', 'active-word-scale': 'Active word scale', 'active-word-box': 'Active word box', 'karaoke': 'Karaoke', 'karaoke-sweep': 'Karaoke sweep', 'progressive-build': 'Progressive build', 'focus-word': 'Focus word', 'keyword-only': 'Keyword only', 'keyword-hero': 'Keyword hero', 'number-hero': 'Number hero', 'question-answer': 'Question / answer', 'stack-build': 'Stack build', 'vertical-word-stack': 'Vertical word stack', 'left-right-alternate': 'Left / right alternate', 'speaker-subtitle': 'Speaker subtitle', 'cinema-subtitle': 'Cinema subtitle', 'social-clean': 'Social clean', 'social-highlight': 'Social highlight', 'word-card': 'Word card', 'active-card': 'Active card', 'underline-track': 'Underline track', 'bold-track': 'Bold track', 'size-track': 'Size track', 'opacity-track': 'Opacity track', 'teleprompter-build': 'Teleprompter build', 'rapid-fire': 'Rapid fire', 'slow-read': 'Slow read',
}

function RevealCard({ choice, selected, onSelect }: { choice: (typeof revealChoices)[number]; selected: boolean; onSelect: () => void }) {
  const [beat, setBeat] = useState(0)
  useEffect(() => { const timer = window.setInterval(() => setBeat((value) => (value + 1) % 3), 700); return () => window.clearInterval(timer) }, [])
  const active = choice.mode.includes('karaoke') ? beat : choice.mode.includes('letter') || choice.mode.includes('typewriter') ? beat : beat === 1 ? 1 : 0
  return <button type="button" onClick={onSelect} className={`min-h-20 border p-2 text-left transition ${selected ? 'border-accent bg-accent/[0.09]' : 'border-white/10 bg-black/20 hover:border-white/30'}`}>
    <span className="block text-[9px] font-semibold text-zinc-200">{choice.label}</span>
    <span className={`mt-2 block whitespace-pre-line text-[9px] font-black leading-3 tracking-tight ${active ? 'text-accent' : 'text-zinc-500'}`}>{choice.example.slice(0, choice.mode.includes('letter') || choice.mode.includes('typewriter') ? Math.max(2, Math.ceil(choice.example.length * ((beat + 1) / 3))) : choice.example.length)}</span>
  </button>
}

export function RevealControls({ reveal, onPatch }: { reveal: CaptionRevealSettings; onPatch: (patch: Partial<CaptionRevealSettings>) => void }) {
  const groups = [...new Set(revealChoices.map((choice) => choice.group))]
  return <div className="mt-3 space-y-4">
    <p className="text-[10px] leading-4 text-zinc-500">Choose how spoken words appear. This changes timing and visibility only—your font, effects, layout, and animation stay editable.</p>
    {groups.map((group) => <section key={group}><p className="mb-2 text-[8px] font-semibold uppercase tracking-[0.14em] text-zinc-600">{group}</p><div className="grid grid-cols-2 gap-1.5">{revealChoices.filter((choice) => choice.group === group).map((choice) => <RevealCard key={choice.mode} choice={choice} selected={reveal.mode === choice.mode} onSelect={() => onPatch({ mode: choice.mode })} />)}</div></section>)}
    <label className={labelClass}>Every reveal behavior<select value={reveal.mode} onChange={(event) => onPatch({ mode: event.target.value as CaptionRevealMode })} className={fieldClass}>{Object.entries(revealModeLabels).map(([mode, label]) => <option key={mode} value={mode}>{label}</option>)}</select></label>
    <div className="space-y-3 border-t border-white/[0.08] pt-3"><p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-zinc-600">Flow controls</p>
      <div className="grid grid-cols-2 gap-2"><label className={labelClass}>Words per page<select value={reveal.wordsPerPage} onChange={(event) => onPatch({ wordsPerPage: Number(event.target.value) })} className={fieldClass}>{[1,2,3,4,5,6].map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label className={labelClass}>Words per line<select value={reveal.wordsPerLine} onChange={(event) => onPatch({ wordsPerLine: Number(event.target.value) })} className={fieldClass}>{[1,2,3,4,5].map((value) => <option key={value} value={value}>{value}</option>)}</select></label></div>
      <Range label="Type speed" value={reveal.charactersPerSecond} min={4} max={42} step={1} display={`${reveal.charactersPerSecond} cps`} onChange={(charactersPerSecond) => onPatch({ charactersPerSecond })} />
      <label className={labelClass}>Cursor<select value={reveal.cursor} onChange={(event) => onPatch({ cursor: event.target.value as CaptionRevealSettings['cursor'] })} className={fieldClass}><option value="off">Off</option><option value="bar">Bar</option><option value="underscore">Underscore</option><option value="block">Block</option></select></label>
      <Toggle label="Keep built words" checked={reveal.buildKeepsPreviousWords} onChange={(buildKeepsPreviousWords) => onPatch({ buildKeepsPreviousWords })} />
      <Toggle label="Clear at pauses" checked={reveal.clearOnPause} onChange={(clearOnPause) => onPatch({ clearOnPause })} />
    </div>
  </div>
}

export function EffectsControls({ style, onPatch, wordMode = false }: StyleControlsProps & { wordMode?: boolean }) {
  return <div className="mt-3 space-y-3">
    <label className={labelClass}>Fill<select value={style.fill.type} onChange={(event) => onPatch({ fill: { type: event.target.value as CaptionStyle['fill']['type'] } })} className={fieldClass}><option value="solid">Solid</option><option value="linear-gradient">Linear gradient</option><option value="radial-gradient">Radial gradient</option></select></label>
    <Color label={wordMode ? 'Word color' : 'Caption color'} value={wordMode ? style.fill.emphasisColor : style.fill.color} onChange={(color) => onPatch({ fill: wordMode ? { type: 'solid', color, emphasisColor: color, activeColor: color } : { color } })} />
    {style.fill.type !== 'solid' && <><Color label="Gradient start" value={style.fill.gradientStops[0] ?? '#ffffff'} onChange={(color) => onPatch({ fill: { gradientStops: [color, style.fill.gradientStops[1] ?? '#d9ff5b'] } })} /><Color label="Gradient end" value={style.fill.gradientStops[1] ?? '#d9ff5b'} onChange={(color) => onPatch({ fill: { gradientStops: [style.fill.gradientStops[0] ?? '#ffffff', color] } })} /><Range label="Gradient angle" value={style.fill.gradientAngle} min={0} max={360} step={5} display={`${style.fill.gradientAngle}°`} onChange={(gradientAngle) => onPatch({ fill: { gradientAngle } })} /></>}
    <Color label="Hero color" value={style.fill.emphasisColor} onChange={(emphasisColor) => onPatch({ fill: { emphasisColor } })} />
    <Color label="Active color" value={style.fill.activeColor} onChange={(activeColor) => onPatch({ fill: { activeColor } })} />
    <Toggle label="Stroke" checked={style.stroke.enabled} onChange={(enabled) => onPatch({ stroke: { enabled } })} />
    {style.stroke.enabled && <><Color label="Stroke color" value={style.stroke.color} onChange={(color) => onPatch({ stroke: { color } })} /><Range label="Stroke width" value={style.stroke.width} min={0} max={12} step={1} display={`${style.stroke.width}px`} onChange={(width) => onPatch({ stroke: { width } })} /></>}
    <Toggle label="Shadow" checked={style.shadow.enabled} onChange={(enabled) => onPatch({ shadow: { enabled } })} />
    {style.shadow.enabled && <Range label="Shadow blur" value={style.shadow.blur} min={0} max={40} step={1} display={`${style.shadow.blur}px`} onChange={(blur) => onPatch({ shadow: { blur } })} />}
    <Toggle label="Glow" checked={style.glow.enabled} onChange={(enabled) => onPatch({ glow: { enabled } })} />
    {style.glow.enabled && <Color label="Glow color" value={style.glow.color} onChange={(color) => onPatch({ glow: { color } })} />}
  </div>
}

export function AnimationControls({ style, onPatch }: StyleControlsProps) {
  return <div className="mt-3 space-y-3">
    <button type="button" onClick={() => onPatch({ animation: { entrance: 'none', active: 'none', exit: 'none' } })} className={`w-full rounded border px-3 py-2 text-left text-[10px] font-semibold uppercase ${style.animation.entrance === 'none' && style.animation.active === 'none' ? 'border-lime-300 bg-lime-300/10 text-lime-300' : 'border-white/10 text-white'}`}>No animation</button>
    <label className={labelClass}>Entrance<select value={style.animation.entrance} onChange={(event) => onPatch({ animation: { entrance: event.target.value as CaptionStyle['animation']['entrance'] } })} className={fieldClass}><option value="none">None</option><option value="fade">Fade</option><option value="pop">Pop</option><option value="bounce">Bounce</option><option value="slide-up">Slide up</option><option value="blur">Blur in</option><option value="typewriter">Typewriter</option></select></label>
    <label className={labelClass}>Active word<select value={style.animation.active} onChange={(event) => onPatch({ animation: { active: event.target.value as CaptionStyle['animation']['active'] } })} className={fieldClass}><option value="none">None</option><option value="scale">Scale</option><option value="color">Color</option><option value="glow">Glow</option></select></label>
    <Range label="Duration" value={style.animation.durationSeconds} min={0.08} max={0.8} step={0.02} display={`${style.animation.durationSeconds.toFixed(2)}s`} onChange={(durationSeconds) => onPatch({ animation: { durationSeconds } })} />
    <Range label="Intensity" value={style.animation.intensity} min={0} max={2} step={0.1} display={`${style.animation.intensity.toFixed(1)}×`} onChange={(intensity) => onPatch({ animation: { intensity } })} />
  </div>
}

export function WordAnimationControls({ onPatch }: { onPatch: (patch: CaptionStyleOverrides) => void }) {
  const choices: Array<{ label: string; entrance: 'none' | 'fade' | 'pop' | 'slide-up' | 'bounce' | 'blur' | 'typewriter' }> = [
    { label: 'None', entrance: 'none' }, { label: 'Typing', entrance: 'typewriter' }, { label: 'Pop', entrance: 'pop' }, { label: 'Bounce', entrance: 'bounce' }, { label: 'Blur in', entrance: 'blur' },
  ]
  return <div className="mt-4 border-t border-white/[0.08] pt-4"><p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-accent">Selected word animation</p><div className="mt-2 grid grid-cols-2 gap-1">{choices.map((choice) => <button key={choice.label} type="button" onClick={() => onPatch({ animation: { entrance: choice.entrance } })} className="h-8 border border-white/10 text-[9px] text-zinc-400 hover:border-accent hover:text-white">{choice.label}</button>)}</div></div>
}

interface TextControlsProps {
  segment: CaptionSegment | null
  word: TranscriptWord | null
  onSelectWord: (word: TranscriptWord) => void
  onWordText: (wordId: string, text: string) => void
  onDeleteWord: (wordId: string) => void
  wordOverride?: WordOverride
  onWordOverride: (wordId: string, patch: Partial<WordOverride>) => void
  onEmphasis: (wordId: string, emphasis: boolean) => void
  onRegroup: (wordsPerPage: number) => void
}

export function TextControls({ segment, word, onSelectWord, onWordText, onDeleteWord, wordOverride, onWordOverride, onEmphasis, onRegroup }: TextControlsProps) {
  if (!segment) return <p className="mt-3 text-[10px] leading-4 text-zinc-600">Select a caption on the canvas or timeline to edit its words.</p>
  return <div className="mt-5 space-y-3 border-t border-white/10 pt-4"><p className="text-[10px] font-semibold text-white">Caption words</p><div className="flex max-h-36 flex-wrap gap-1 overflow-y-auto">{segment.words.map((item) => <button key={item.id} type="button" onClick={() => onSelectWord(item)} className={`rounded border px-2 py-1 text-[10px] ${word?.id === item.id ? 'border-accent text-accent' : 'border-white/10 text-zinc-400'}`}>{item.text}</button>)}</div>
    {word && <><label className={labelClass}>Selected word<input value={word.text} onChange={(event) => onWordText(word.id, event.target.value)} className={fieldClass} /></label><div className="rounded-lg border border-accent/25 bg-accent/[0.05] p-3"><Range label="Word size" value={wordOverride?.fontScale ?? 1} min={0.5} max={3} step={0.05} display={`${Math.round((wordOverride?.fontScale ?? 1) * 100)}%`} onChange={(fontScale) => onWordOverride(word.id, { fontScale })} /><button type="button" onClick={() => onWordOverride(word.id, { fontScale: 1 })} className="mt-2 text-[9px] text-zinc-400 hover:text-white">Reset word size</button></div><div className="grid grid-cols-2 gap-2"><Toggle label="Visible" checked={wordOverride?.visible !== false} onChange={(visible) => onWordOverride(word.id, { visible })} /><Toggle label="Keyword" checked={word.emphasis} onChange={(emphasis) => onEmphasis(word.id, emphasis)} /><Toggle label="Super-size" checked={Boolean(wordOverride?.supersize)} onChange={(supersize) => onWordOverride(word.id, { supersize })} /><Toggle label="Break before" checked={Boolean(wordOverride?.lineBreakBefore)} onChange={(lineBreakBefore) => onWordOverride(word.id, { lineBreakBefore })} /><Toggle label="Break after" checked={Boolean(wordOverride?.lineBreakAfter)} onChange={(lineBreakAfter) => onWordOverride(word.id, { lineBreakAfter })} /></div>
      <div className="grid grid-cols-2 gap-2"><label className={labelClass}>Start (seconds)<input type="number" step="0.01" min="0" value={wordOverride?.start ?? word.start} onChange={(event) => onWordOverride(word.id, { start: Number(event.target.value) })} className={fieldClass} /></label><label className={labelClass}>End (seconds)<input type="number" step="0.01" min="0" value={wordOverride?.end ?? word.end} onChange={(event) => onWordOverride(word.id, { end: Number(event.target.value) })} className={fieldClass} /></label></div>
      <Toggle label="Word background" checked={Boolean(wordOverride?.backgroundColor)} onChange={(enabled) => onWordOverride(word.id, { backgroundColor: enabled ? '#171717' : undefined })} />
      {wordOverride?.backgroundColor && <Color label="Background color" value={wordOverride.backgroundColor} onChange={(backgroundColor) => onWordOverride(word.id, { backgroundColor })} />}
      <button type="button" onClick={() => onWordOverride(word.id, { manualBreakBefore: !wordOverride?.manualBreakBefore })} className="h-8 w-full rounded border border-white/15 text-[10px] text-zinc-300">{wordOverride?.manualBreakBefore ? 'Merge with previous group' : 'Split group before this word'}</button>
      <button type="button" onClick={() => onDeleteWord(word.id)} className="h-8 w-full border border-red-400/40 text-[9px] font-semibold uppercase tracking-[0.1em] text-red-300 hover:bg-red-400/10">Delete word</button></>}
    <label className={labelClass}>Re-group captions<select defaultValue="" onChange={(event) => { if (event.target.value) onRegroup(Number(event.target.value)) }} className={fieldClass}><option value="" disabled>Choose grouping</option><option value="1">1 word</option><option value="2">2 words</option><option value="3">3 words</option><option value="4">Short phrases</option><option value="5">Balanced</option><option value="8">Long phrases</option></select></label>
  </div>
}

function Range({ label, value, min, max, step, display, onChange }: { label: string; value: number; min: number; max: number; step: number; display: string; onChange: (value: number) => void }) {
  return <label className={labelClass}>{label}<span className="float-right font-mono normal-case tracking-normal text-zinc-400">{display}</span><input aria-label={label} type="range" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} className="mt-2 w-full accent-lime-300" /></label>
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <button type="button" onClick={() => onChange(!checked)} className={`flex h-8 w-full items-center justify-between border px-2 text-[9px] font-semibold uppercase tracking-[0.1em] ${checked ? 'border-accent bg-accent/10 text-accent' : 'border-white/10 text-zinc-500'}`}><span>{label}</span><span>{checked ? 'On' : 'Off'}</span></button>
}

function Color({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className={labelClass}>{label}<span className="mt-1 flex h-8 items-center gap-2 border border-white/10 bg-black/30 px-2"><input aria-label={label} type="color" value={value} onChange={(event) => onChange(event.target.value)} className="size-4 border-0 bg-transparent p-0" /><span className="font-mono text-[10px] text-zinc-300">{value}</span></span></label>
}
