export interface TransformStyle {
  x: number
  y: number
  scaleX: number
  scaleY: number
  rotation: number
  anchorX: number
  anchorY: number
}

export interface TypographyStyle {
  fontFamily: string
  fontWeight: number
  fontStyle: 'normal' | 'italic'
  secondarySize: number
  emphasisSize: number
  lineHeight: number
  letterSpacing: number
  wordSpacing: number
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize'
  alignment: 'left' | 'center' | 'right'
  maxWidth: number
}

export interface FillStyle {
  type: 'solid' | 'linear-gradient' | 'radial-gradient'
  color: string
  activeColor: string
  emphasisColor: string
  gradientStops: string[]
  gradientAngle: number
  opacity: number
}

export interface StrokeStyle {
  enabled: boolean
  width: number
  color: string
}

export interface ShadowStyle {
  enabled: boolean
  x: number
  y: number
  blur: number
  color: string
  opacity: number
}

export interface GlowStyle {
  enabled: boolean
  color: string
  radius: number
  intensity: number
  opacity: number
}

export interface AnimationStyle {
  entrance: 'none' | 'fade' | 'pop' | 'slide-up' | 'bounce' | 'blur' | 'typewriter'
  active: 'none' | 'color' | 'scale' | 'glow'
  exit: 'none' | 'fade'
  durationSeconds: number
  intensity: number
}

export type CaptionRevealMode =
  | 'full-phrase' | 'single-word' | 'two-words' | 'three-words' | 'smart-chunks'
  | 'word-build' | 'word-replace' | 'letter-by-letter' | 'letter-build' | 'letter-replace' | 'typewriter-phrase'
  | 'line-by-line' | 'line-replace' | 'active-word' | 'active-word-fade' | 'active-word-scale' | 'active-word-box'
  | 'karaoke' | 'karaoke-sweep' | 'progressive-build' | 'focus-word' | 'keyword-only' | 'keyword-hero'
  | 'number-hero' | 'question-answer' | 'stack-build' | 'vertical-word-stack' | 'left-right-alternate'
  | 'speaker-subtitle' | 'cinema-subtitle' | 'social-clean' | 'social-highlight' | 'word-card' | 'active-card'
  | 'underline-track' | 'bold-track' | 'size-track' | 'opacity-track' | 'teleprompter-build' | 'rapid-fire' | 'slow-read'

export interface CaptionRevealSettings {
  mode: CaptionRevealMode
  wordsPerPage: number
  wordsPerLine: number
  linesPerPage: number
  charactersPerSecond: number
  preRollMs: number
  postRollMs: number
  activeWordLeadMs: number
  buildKeepsPreviousWords: boolean
  clearOnPause: boolean
  pauseThresholdMs: number
  cursor: 'off' | 'bar' | 'underscore' | 'block'
  typingSpeedMode?: 'speech' | 'fixed'
  cursorBlinkMs?: number
  characterDirection?: 'ltr' | 'rtl'
  pace?: 'relaxed' | 'normal' | 'fast' | 'rapid'
  clearBehavior?: 'replace' | 'hold' | 'fade' | 'next-word'
  minimumDurationMs?: number
  maximumDurationMs?: number
  stackDirection?: 'top-down' | 'bottom-up'
  pastColor?: string
  futureColor?: string
  pastOpacity?: number
  futureOpacity?: number
  activeScale?: number
  activeBackground?: string
  activeColor?: string
  activeFontWeight?: number
  activeUnderline?: boolean
  activeGlow?: boolean
  activeStroke?: boolean
  currentOpacity?: number
  pastWeight?: number
  futureWeight?: number
}

export type CaptionComposition = 'big-hero' | 'left-stack' | 'right-stack' | 'number-hero' | 'lower-third' | 'karaoke'

export interface LayoutStyle {
  composition: CaptionComposition
}

export interface CaptionStyle {
  typography: TypographyStyle
  fill: FillStyle
  stroke: StrokeStyle
  shadow: ShadowStyle
  glow: GlowStyle
  transform: TransformStyle
  layout: LayoutStyle
  animation: AnimationStyle
}

export type NestedPartial<T> = {
  [Key in keyof T]?: T[Key] extends readonly unknown[]
    ? T[Key]
    : T[Key] extends object
      ? NestedPartial<T[Key]>
      : T[Key]
}

export type CaptionStyleOverrides = NestedPartial<CaptionStyle>

export interface CaptionPreset {
  id: string
  name: string
  category: 'clean' | 'word' | 'creator' | 'karaoke' | 'type' | 'bold' | 'kinetic' | 'minimal' | 'tech' | 'social' | 'cinematic' | 'experimental'
  description: string
  style: CaptionStyle
  reveal: CaptionRevealSettings
}

export interface WordOverride {
  style?: CaptionStyleOverrides
  fontScale?: number
  backgroundColor?: string
  supersize?: boolean
  lineBreakBefore?: boolean
  lineBreakAfter?: boolean
  visible?: boolean
  start?: number
  end?: number
  manualBreakBefore?: boolean
}

export interface TextLayer {
  id: string
  text: string
  start: number
  end: number
  zIndex: number
  style: CaptionStyleOverrides
}

export interface EditorSettings {
  showSafeAreas: boolean
  showGuides: boolean
  safeAreaPreset: 'tiktok-reels' | 'youtube-shorts'
  canvasZoom: 'fit' | 50 | 75 | 100 | 125 | 150
}

export interface EditorProjectDocument {
  schemaVersion: 1
  projectId: string
  presetId: string
  reveal?: Partial<CaptionRevealSettings>
  customPresets?: CaptionPreset[]
  favoritePresetIds?: string[]
  recentPresetIds?: string[]
  projectOverrides: CaptionStyleOverrides
  segmentOverrides: Record<string, CaptionStyleOverrides>
  wordOverrides: Record<string, WordOverride>
  textLayers: TextLayer[]
  keyframes: Record<string, Array<Record<string, number>>>
  settings: EditorSettings
}

export type SelectionState =
  | { type: 'none' }
  | { type: 'segment'; segmentId: string }
  | { type: 'word'; segmentId: string; wordId: string }
