import { getCaptionPreset } from './presets'
import type { CaptionRevealSettings, CaptionStyle, CaptionStyleOverrides, EditorProjectDocument } from './types'

export const DEFAULT_REVEAL: CaptionRevealSettings = {
  mode: 'smart-chunks', wordsPerPage: 4, wordsPerLine: 3, linesPerPage: 2,
  charactersPerSecond: 18, preRollMs: 0, postRollMs: 100, activeWordLeadMs: 0,
  buildKeepsPreviousWords: true, clearOnPause: true, pauseThresholdMs: 350, cursor: 'off',
}

function mergeStyle(base: CaptionStyle, overrides?: CaptionStyleOverrides): CaptionStyle {
  if (!overrides) return base
  return {
    typography: { ...base.typography, ...overrides.typography },
    fill: { ...base.fill, ...overrides.fill },
    stroke: { ...base.stroke, ...overrides.stroke },
    shadow: { ...base.shadow, ...overrides.shadow },
    glow: { ...base.glow, ...overrides.glow },
    transform: { ...base.transform, ...overrides.transform },
    layout: { ...base.layout, ...overrides.layout },
    animation: { ...base.animation, ...overrides.animation },
  }
}

export function resolveCaptionStyle(
  document: EditorProjectDocument,
  segmentId?: string,
  wordId?: string,
): CaptionStyle {
  const preset = document.customPresets?.find((item) => item.id === document.presetId) ?? getCaptionPreset(document.presetId)
  let style = mergeStyle(preset.style, document.projectOverrides)
  if (segmentId) style = mergeStyle(style, document.segmentOverrides[segmentId])
  if (wordId) style = mergeStyle(style, document.wordOverrides[wordId]?.style)
  return style
}

export function resolveCaptionReveal(document: EditorProjectDocument): CaptionRevealSettings {
  const preset = document.customPresets?.find((item) => item.id === document.presetId) ?? getCaptionPreset(document.presetId)
  return { ...DEFAULT_REVEAL, ...preset.reveal, ...document.reveal }
}

export function updateSegmentTransform(
  document: EditorProjectDocument,
  segmentId: string,
  transform: CaptionStyle['transform'],
): EditorProjectDocument {
  return {
    ...document,
    segmentOverrides: {
      ...document.segmentOverrides,
      [segmentId]: {
        ...document.segmentOverrides[segmentId],
        transform,
      },
    },
  }
}
