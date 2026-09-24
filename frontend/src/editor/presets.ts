import type { CaptionPreset, CaptionRevealMode, CaptionStyleOverrides } from './types'

const base = {
  typography: { fontFamily: 'Inter, Arial, sans-serif', fontWeight: 900, fontStyle: 'normal' as const, secondarySize: 0.067, emphasisSize: 0.16, lineHeight: 0.9, letterSpacing: -0.045, wordSpacing: 0, textTransform: 'uppercase' as const, alignment: 'center' as const, maxWidth: 0.86 },
  fill: { type: 'solid' as const, color: '#ffffff', activeColor: '#ffffff', emphasisColor: '#ffffff', gradientStops: ['#ffffff', '#ffffff'], gradientAngle: 90, opacity: 1 },
  stroke: { enabled: false, width: 0, color: '#000000' },
  shadow: { enabled: true, x: 0, y: 3, blur: 18, color: '#000000', opacity: 0.75 },
  glow: { enabled: false, color: '#ffffff', radius: 18, intensity: 1, opacity: 0.6 },
  transform: { x: 0.5, y: 0.5, scaleX: 1, scaleY: 1, rotation: 0, anchorX: 0.5, anchorY: 0.5 },
  layout: { composition: 'big-hero' as const },
  animation: { entrance: 'pop' as const, active: 'scale' as const, exit: 'none' as const, durationSeconds: 0.24, intensity: 1 },
}

const defaultReveal = { mode: 'smart-chunks' as const, wordsPerPage: 4, wordsPerLine: 3, linesPerPage: 2, charactersPerSecond: 18, preRollMs: 0, postRollMs: 100, activeWordLeadMs: 0, buildKeepsPreviousWords: true, clearOnPause: true, pauseThresholdMs: 350, cursor: 'off' as const }

export const BIG_BOLD_PRESET: CaptionPreset = { id: 'big-bold', name: 'Big Bold', category: 'bold', description: 'Editorial hierarchy with a dominant keyword.', style: base, reveal: { ...defaultReveal, mode: 'smart-chunks' } }

export const CLEAN_MINIMAL_PRESET: CaptionPreset = {
  id: 'clean-minimal', name: 'Clean Minimal', category: 'clean', description: 'Quiet, polished captions for talking-head videos.',
  style: { ...base, typography: { ...base.typography, fontFamily: 'Poppins, Arial, sans-serif', fontWeight: 700, secondarySize: 0.055, emphasisSize: 0.11, alignment: 'left', maxWidth: 0.82, letterSpacing: -0.02 }, fill: { ...base.fill, color: '#f5f5f5', emphasisColor: '#f5f5f5' }, shadow: { ...base.shadow, blur: 10 }, layout: { composition: 'lower-third' }, animation: { ...base.animation, entrance: 'fade', active: 'none' } }, reveal: { ...defaultReveal, mode: 'speaker-subtitle', wordsPerPage: 7 },
}

export const NEON_KINETIC_PRESET: CaptionPreset = {
  id: 'neon-kinetic', name: 'Neon Kinetic', category: 'kinetic', description: 'High-energy color, glow, and bounce for short-form edits.',
  style: { ...base, typography: { ...base.typography, fontFamily: 'Montserrat, Arial, sans-serif', fontWeight: 900, emphasisSize: 0.17 }, fill: { ...base.fill, activeColor: '#b7ff3c', emphasisColor: '#b7ff3c' }, stroke: { enabled: true, width: 2, color: '#111111' }, glow: { ...base.glow, enabled: true, color: '#b7ff3c', radius: 22 }, layout: { composition: 'karaoke' }, animation: { ...base.animation, entrance: 'bounce', active: 'glow', durationSeconds: 0.32, intensity: 1.2 } }, reveal: { ...defaultReveal, mode: 'karaoke' },
}

export const NUMBER_HERO_PRESET: CaptionPreset = {
  id: 'number-hero', name: 'Number Hero', category: 'social', description: 'Strong centered treatment for money, metrics, and lists.',
  style: { ...base, typography: { ...base.typography, fontFamily: 'Montserrat, Arial, sans-serif', emphasisSize: 0.19 }, fill: { ...base.fill, emphasisColor: '#ffd166' }, layout: { composition: 'number-hero' }, animation: { ...base.animation, entrance: 'slide-up', active: 'scale' } }, reveal: { ...defaultReveal, mode: 'number-hero' },
}

export const HIGHLIGHT_POP_PRESET: CaptionPreset = {
  id: 'highlight-pop', name: 'Highlight Pop', category: 'social', description: 'High-contrast keyword highlights for hooks and explainers.',
  style: { ...base, typography: { ...base.typography, fontFamily: 'Montserrat, Arial, sans-serif', emphasisSize: 0.18, secondarySize: 0.06 }, fill: { ...base.fill, color: '#ffffff', emphasisColor: '#ffe45c', activeColor: '#ffe45c' }, stroke: { enabled: true, width: 3, color: '#111111' }, shadow: { ...base.shadow, y: 5, blur: 4, opacity: 0.95 }, layout: { composition: 'big-hero' }, animation: { ...base.animation, entrance: 'pop', active: 'color', durationSeconds: 0.2, intensity: 1.25 } }, reveal: { ...defaultReveal, mode: 'social-highlight', wordsPerPage: 3 },
}

export const ELECTRIC_GLOW_PRESET: CaptionPreset = {
  id: 'electric-glow', name: 'Electric Glow', category: 'kinetic', description: 'Electric gradient type with a soft neon active word.',
  style: { ...base, typography: { ...base.typography, fontFamily: 'Poppins, Arial, sans-serif', fontWeight: 900, emphasisSize: 0.17 }, fill: { ...base.fill, type: 'linear-gradient', color: '#f5f7ff', emphasisColor: '#8ff7ff', activeColor: '#b896ff', gradientStops: ['#8ff7ff', '#b896ff', '#ffffff'], gradientAngle: 125 }, stroke: { enabled: true, width: 1, color: '#0b1020' }, shadow: { ...base.shadow, y: 4, blur: 12, color: '#090b19', opacity: 0.9 }, glow: { ...base.glow, enabled: true, color: '#84ecff', radius: 28, intensity: 1.1, opacity: 0.7 }, layout: { composition: 'karaoke' }, animation: { ...base.animation, entrance: 'blur', active: 'glow', durationSeconds: 0.3, intensity: 1.1 } }, reveal: { ...defaultReveal, mode: 'karaoke-sweep' },
}

export const AESTHETIC_SERIF_PRESET: CaptionPreset = {
  id: 'aesthetic-serif', name: 'Aesthetic Serif', category: 'cinematic', description: 'Elegant italic storytelling for reflective or lifestyle clips.',
  style: { ...base, typography: { ...base.typography, fontFamily: 'Georgia, serif', fontWeight: 700, fontStyle: 'italic', secondarySize: 0.054, emphasisSize: 0.12, lineHeight: 1.05, letterSpacing: -0.02, textTransform: 'none', alignment: 'left', maxWidth: 0.76 }, fill: { ...base.fill, color: '#fff7ef', emphasisColor: '#ffc59f', activeColor: '#fff7ef' }, stroke: { enabled: false, width: 0, color: '#000000' }, shadow: { ...base.shadow, y: 3, blur: 14, color: '#1e1410' }, layout: { composition: 'lower-third' }, animation: { ...base.animation, entrance: 'fade', active: 'none', durationSeconds: 0.42, intensity: 0.7 } }, reveal: { ...defaultReveal, mode: 'cinema-subtitle', wordsPerPage: 7 },
}

export const TYPEWRITER_NOTE_PRESET: CaptionPreset = {
  id: 'typewriter-note', name: 'Typewriter Note', category: 'clean', description: 'Thoughtful, documentary-like captions that reveal naturally.',
  style: { ...base, typography: { ...base.typography, fontFamily: 'Georgia, serif', fontWeight: 700, secondarySize: 0.055, emphasisSize: 0.115, lineHeight: 1, letterSpacing: -0.015, textTransform: 'none', alignment: 'left', maxWidth: 0.8 }, fill: { ...base.fill, color: '#faf6e9', emphasisColor: '#faf6e9', activeColor: '#ffdf70' }, shadow: { ...base.shadow, y: 2, blur: 8, color: '#000000', opacity: 0.85 }, layout: { composition: 'left-stack' }, animation: { ...base.animation, entrance: 'typewriter', active: 'color', durationSeconds: 0.45, intensity: 0.8 } }, reveal: { ...defaultReveal, mode: 'typewriter-phrase', cursor: 'bar' },
}

function variant(id: string, name: string, category: CaptionPreset['category'], mode: CaptionRevealMode, changes: CaptionStyleOverrides = {}, revealChanges: Partial<CaptionPreset['reveal']> = {}): CaptionPreset {
  return {
    id, name, category, description: `${name} caption treatment`,
    style: {
      ...base,
      typography: { ...base.typography, ...changes.typography },
      fill: { ...base.fill, ...changes.fill },
      stroke: { ...base.stroke, ...changes.stroke },
      shadow: { ...base.shadow, ...changes.shadow },
      glow: { ...base.glow, ...changes.glow },
      transform: { ...base.transform, ...changes.transform },
      layout: { ...base.layout, ...changes.layout },
      animation: { ...base.animation, entrance: 'none', active: 'none', ...changes.animation },
    },
    reveal: { ...defaultReveal, mode, ...revealChanges },
  }
}

const MORE_PRESETS: CaptionPreset[] = [
  variant('clean-static', 'Clean Static', 'clean', 'smart-chunks', { typography: { fontWeight: 500, secondarySize: .06, emphasisSize: .1 }, shadow: { enabled: false } }),
  variant('clean-word', 'Clean Word', 'clean', 'word-replace', { typography: { fontWeight: 700, secondarySize: .07, emphasisSize: .11 } }),
  variant('clean-build', 'Clean Build', 'clean', 'word-build', { typography: { fontWeight: 700, secondarySize: .06 } }),
  variant('documentary', 'Documentary', 'clean', 'full-phrase', { typography: { fontFamily: 'DM Sans, Arial, sans-serif', fontWeight: 500, secondarySize: .048, textTransform: 'none' }, layout: { composition: 'lower-third' } }, { wordsPerPage: 8 }),
  variant('subtitle', 'Subtitle', 'clean', 'speaker-subtitle', { typography: { fontWeight: 500, secondarySize: .047, textTransform: 'none' }, layout: { composition: 'lower-third' } }, { wordsPerPage: 8, wordsPerLine: 4 }),
  variant('creator-white', 'Creator White', 'creator', 'three-words', { typography: { fontFamily: 'Poppins, Arial, sans-serif', fontWeight: 900 }, stroke: { enabled: true, width: 4, color: '#090909' } }),
  variant('creator-active', 'Creator Active', 'creator', 'active-word', { typography: { fontFamily: 'Poppins, Arial, sans-serif', fontWeight: 900 }, fill: { activeColor: '#d9ff5b' } }, { wordsPerPage: 5 }),
  variant('creator-box', 'Creator Box', 'creator', 'active-word-box', { typography: { fontFamily: 'Montserrat, Arial, sans-serif', fontWeight: 700 }, fill: { activeColor: '#ffd166' } }),
  variant('creator-rapid', 'Creator Rapid', 'creator', 'rapid-fire', { typography: { fontFamily: 'Poppins, Arial, sans-serif', fontWeight: 900 } }),
  variant('creator-build', 'Creator Build', 'creator', 'word-build', { typography: { fontFamily: 'Montserrat, Arial, sans-serif', fontWeight: 900 } }),
  variant('one-word', 'One Word', 'word', 'word-replace'),
  variant('one-word-big', 'One Word Big', 'word', 'word-replace', { typography: { fontFamily: 'Archivo Black, Arial, sans-serif', emphasisSize: .2 } }),
  variant('two-word', 'Two Word', 'word', 'two-words'),
  variant('three-word', 'Three Word', 'word', 'three-words'),
  variant('stacked-words', 'Stacked Words', 'word', 'vertical-word-stack', { typography: { lineHeight: 1.05, emphasisSize: .12 } }),
  variant('bold-type', 'Bold Type', 'type', 'letter-by-letter', { typography: { fontFamily: 'Poppins, Arial, sans-serif', fontWeight: 900 } }),
  variant('terminal', 'Terminal', 'type', 'typewriter-phrase', { typography: { fontFamily: 'DM Mono, Consolas, monospace', fontWeight: 500, textTransform: 'none', secondarySize: .055 } }, { cursor: 'bar' }),
  variant('editorial-type', 'Editorial Type', 'type', 'letter-build', { typography: { fontFamily: 'Georgia, serif', fontStyle: 'italic', secondarySize: .075 } }),
  variant('karaoke-clean', 'Karaoke Clean', 'karaoke', 'karaoke', { fill: { activeColor: '#d9ff5b' } }, { pastColor: '#ffffff', futureColor: '#666666' }),
  variant('karaoke-box', 'Karaoke Box', 'karaoke', 'active-word-box', { fill: { activeColor: '#d9ff5b' } }),
  variant('karaoke-scale', 'Karaoke Scale', 'karaoke', 'active-word-scale', { fill: { activeColor: '#d9ff5b' } }),
  variant('karaoke-fade', 'Karaoke Fade', 'karaoke', 'active-word-fade', {}, { pastOpacity: .55, futureOpacity: .4 }),
  variant('big-keyword', 'Big Keyword', 'bold', 'keyword-hero', { typography: { emphasisSize: .19 } }),
  variant('money', 'Money', 'bold', 'number-hero', { fill: { emphasisColor: '#e7c37a' }, typography: { emphasisSize: .2 } }),
  variant('keyword-only', 'Keyword Only', 'bold', 'keyword-only', { typography: { emphasisSize: .18 } }),
  variant('kinetic-static', 'Kinetic Static', 'kinetic', 'left-right-alternate', { fill: { activeColor: '#ff7b5b' } }),
  variant('kinetic-slant', 'Kinetic Slant', 'kinetic', 'three-words', { typography: { fontStyle: 'italic' }, fill: { type: 'linear-gradient', gradientStops: ['#f9df4b', '#ff7049'] } }),
  variant('left-right', 'Left Right', 'kinetic', 'left-right-alternate'),
  variant('stack-build', 'Stack Build', 'kinetic', 'stack-build'),
  variant('minimal-word', 'Minimal Word', 'minimal', 'single-word', { typography: { fontWeight: 500, emphasisSize: .11, textTransform: 'none' }, shadow: { enabled: false } }),
  variant('minimal-active', 'Minimal Active', 'minimal', 'opacity-track', { typography: { fontWeight: 500, secondarySize: .052, textTransform: 'none' }, shadow: { enabled: false } }),
  variant('minimal-lower', 'Minimal Lower', 'minimal', 'cinema-subtitle', { typography: { fontWeight: 500, secondarySize: .045, textTransform: 'none' }, layout: { composition: 'lower-third' } }, { wordsPerPage: 8 }),
  variant('minimal-center', 'Minimal Center', 'minimal', 'two-words', { typography: { fontWeight: 500, secondarySize: .055, textTransform: 'none' }, shadow: { enabled: false } }),
]

export const CAPTION_PRESETS: CaptionPreset[] = [
  BIG_BOLD_PRESET,
  HIGHLIGHT_POP_PRESET,
  NEON_KINETIC_PRESET,
  ELECTRIC_GLOW_PRESET,
  CLEAN_MINIMAL_PRESET,
  AESTHETIC_SERIF_PRESET,
  TYPEWRITER_NOTE_PRESET,
  NUMBER_HERO_PRESET,
  ...MORE_PRESETS,
]

export function getCaptionPreset(id: string): CaptionPreset {
  return CAPTION_PRESETS.find((preset) => preset.id === id) ?? BIG_BOLD_PRESET
}
