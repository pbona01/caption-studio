import { useEffect, useMemo, useState } from 'react'
import { Heart, Search } from 'lucide-react'
import { getCaptionDisplay } from './captionDisplayEngine'
import { CAPTION_PRESETS } from './presets'
import type { CaptionPreset } from './types'
import type { CaptionSegment } from '../types/video'

const example: CaptionSegment[] = [{ id: 'preset-preview', start: 0, end: 2.4, words: ['MAKE', 'BETTER', 'CONTENT'].map((text, index) => ({ id: `sample-${index}`, text, start: index * .8, end: (index + 1) * .8, confidence: 1, emphasis: index === 2 })) }]
const categories = ['all', 'clean', 'word', 'creator', 'karaoke', 'type', 'bold', 'kinetic', 'minimal', 'my styles']

export function PresetBrowser({ customPresets = [], activeId, favorites = [], recent = [], onApply, onFavorite, onSaveStyle }: {
  customPresets?: CaptionPreset[]; activeId: string; favorites?: string[]; recent?: string[]
  onApply: (id: string) => void; onFavorite: (id: string) => void; onSaveStyle: (name: string) => void
}) {
  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [time, setTime] = useState(0)
  const [hovered, setHovered] = useState<string | null>(null)
  const [name, setName] = useState('')
  useEffect(() => { const timer = window.setInterval(() => setTime((value) => (value + .16) % 2.4), 160); return () => window.clearInterval(timer) }, [])
  const presets = useMemo(() => [...customPresets, ...CAPTION_PRESETS].filter((preset) => (category === 'all' || category === 'my styles' && customPresets.some((item) => item.id === preset.id) || preset.category === category) && `${preset.name} ${preset.category} ${preset.reveal.mode}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => Number(favorites.includes(b.id)) - Number(favorites.includes(a.id))), [customPresets, category, query, favorites])
  return <div className="space-y-4 pt-4"><div><h3 className="text-sm font-semibold text-white">Caption styles</h3><p className="mt-1 text-[11px] text-zinc-500">Pick a look, then change its reveal, type, effects, motion, and layout.</p></div>
    <label className="flex h-9 items-center gap-2 rounded border border-white/10 bg-black/25 px-3"><Search className="size-3.5 text-zinc-500" /><input aria-label="Search caption styles" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search styles" className="w-full bg-transparent text-xs text-white outline-none" /></label>
    <div className="flex gap-1.5 overflow-x-auto pb-1">{categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`shrink-0 rounded-full border px-2.5 py-1.5 text-[9px] font-semibold uppercase ${category === item ? 'border-lime-300 bg-lime-300/10 text-lime-300' : 'border-white/10 text-zinc-500'}`}>{item}</button>)}</div>
    {recent.length > 0 && category === 'all' && !query && <div className="text-[9px] text-zinc-500">Recent: {recent.slice(0, 3).map((id) => [...customPresets, ...CAPTION_PRESETS].find((preset) => preset.id === id)?.name).filter(Boolean).join(' · ')}</div>}
    <div className="grid grid-cols-2 gap-2">{presets.map((preset) => {
      const display = getCaptionDisplay(example, hovered === preset.id ? time : 1.2, { ...preset.reveal, wordsPerPage: 3, clearOnPause: false })
      return <div key={preset.id} onMouseEnter={() => setHovered(preset.id)} onMouseLeave={() => setHovered(null)} className={`relative min-h-32 rounded-lg border p-2.5 ${activeId === preset.id ? 'border-lime-300 bg-lime-300/[.07]' : 'border-white/10 bg-white/[.025]'}`}>
        <button type="button" aria-label={`${favorites.includes(preset.id) ? 'Remove favorite' : 'Favorite'} ${preset.name}`} onClick={() => onFavorite(preset.id)} className="absolute right-2 top-2 z-10 text-zinc-500 hover:text-lime-300"><Heart className={`size-3.5 ${favorites.includes(preset.id) ? 'fill-lime-300 text-lime-300' : ''}`} /></button>
        <button type="button" onClick={() => onApply(preset.id)} className="h-full w-full text-left"><div className="flex min-h-16 items-center justify-center overflow-hidden rounded bg-black/45 px-2 text-center" style={{ fontFamily: preset.style.typography.fontFamily, fontWeight: preset.style.typography.fontWeight, fontStyle: preset.style.typography.fontStyle, color: preset.style.fill.color, textShadow: preset.style.shadow.enabled ? '1px 2px 6px #000' : undefined }}><span className="text-[11px] leading-4" style={{ display: display?.isStacked ? 'flex' : 'block', flexDirection: 'column', background: preset.reveal.mode === 'word-card' ? '#252525' : undefined, padding: preset.reveal.mode === 'word-card' ? '3px 6px' : undefined }}>{display?.words.map(({ word, text, state }) => <span key={word.id} style={{ display: display.isStacked ? 'block' : 'inline-block', marginRight: display.isStacked ? 0 : 3, color: state === 'active' && ['active-word', 'social-highlight', 'karaoke', 'karaoke-sweep'].includes(preset.reveal.mode) ? preset.reveal.activeColor ?? preset.style.fill.activeColor : state === 'future' && preset.reveal.mode.includes('karaoke') ? preset.reveal.futureColor ?? '#777' : state === 'past' && preset.reveal.mode.includes('karaoke') ? preset.reveal.pastColor ?? '#fff' : preset.style.fill.color, background: state === 'active' && ['active-word-box', 'active-card'].includes(preset.reveal.mode) ? preset.reveal.activeBackground ?? preset.style.fill.activeColor : undefined, borderRadius: 3, textDecoration: state === 'active' && preset.reveal.mode === 'underline-track' ? 'underline' : undefined }}>{text}</span>) ?? 'MAKE BETTER CONTENT'}</span></div><span className="mt-2 block text-[10px] font-semibold text-white">{preset.name}</span><span className="mt-0.5 block text-[9px] text-zinc-500">{preset.reveal.mode.replaceAll('-', ' ')}</span></button>
      </div>
    })}</div>
    {presets.length === 0 && <p className="text-xs text-zinc-500">No styles match this search.</p>}
    <div className="border-t border-white/10 pt-4"><h4 className="text-[10px] font-semibold text-white">Save current style</h4><p className="mt-1 text-[10px] text-zinc-500">Stores the current reveal, typography, effects, animation, and layout.</p><div className="mt-2 flex gap-2"><input aria-label="Custom style name" value={name} onChange={(event) => setName(event.target.value)} placeholder="My caption style" className="h-9 min-w-0 flex-1 rounded border border-white/10 bg-black/30 px-2 text-xs text-white" /><button type="button" disabled={!name.trim()} onClick={() => { onSaveStyle(name.trim()); setName(''); setCategory('my styles') }} className="rounded bg-lime-300 px-3 text-[10px] font-semibold text-black disabled:opacity-40">Save as style</button></div></div>
  </div>
}
