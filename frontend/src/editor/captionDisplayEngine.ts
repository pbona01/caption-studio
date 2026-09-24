import type { CaptionSegment, TranscriptWord } from '../types/video'
import type { CaptionRevealMode, CaptionRevealSettings, WordOverride } from './types'

export type WordState = 'past' | 'active' | 'future'

export interface DisplayWord {
  word: TranscriptWord
  segmentId: string
  state: WordState
  text: string
  lineBreakBefore: boolean
  progress: number
}

export interface CaptionDisplay {
  words: DisplayWord[]
  text: string
  activeWordId: string
  segmentId: string
  groupIndex: number
  pageStart: number
  pageEnd: number
  isStacked: boolean
  isQuestion: boolean
  alternateRight: boolean
  fadeProgress: number
}

type TimedWord = { word: TranscriptWord; segmentId: string; start: number; end: number; manualBreakBefore: boolean }
type Page = { words: TimedWord[]; startIndex: number; endIndex: number }
const endPunctuation = /[.!?;:]$/
const singleModes: CaptionRevealMode[] = ['single-word', 'word-replace', 'rapid-fire', 'letter-by-letter', 'letter-replace']
const trackedModes: CaptionRevealMode[] = ['active-word', 'active-word-fade', 'active-word-scale', 'active-word-box', 'karaoke', 'karaoke-sweep', 'focus-word', 'underline-track', 'bold-track', 'size-track', 'opacity-track', 'active-card', 'teleprompter-build']

function wordLimit(reveal: CaptionRevealSettings) {
  if (singleModes.includes(reveal.mode)) return 1
  if (reveal.mode === 'two-words') return 2
  if (reveal.mode === 'three-words') return 3
  if (reveal.mode === 'slow-read') return Math.max(7, reveal.wordsPerPage)
  if (reveal.mode === 'line-by-line' || reveal.mode === 'line-replace') return Math.max(1, reveal.wordsPerLine * reveal.linesPerPage)
  if (['speaker-subtitle', 'cinema-subtitle', 'full-phrase'].includes(reveal.mode)) return Math.max(4, reveal.wordsPerPage)
  if (trackedModes.includes(reveal.mode)) return Math.max(3, reveal.wordsPerPage)
  const paceAdjustment = reveal.pace === 'relaxed' ? 2 : reveal.pace === 'fast' ? -1 : reveal.pace === 'rapid' ? -2 : 0
  return Math.max(1, reveal.wordsPerPage + paceAdjustment)
}

function pagesFor(words: TimedWord[], reveal: CaptionRevealSettings): Page[] {
  const pages: Page[] = []
  const limit = wordLimit(reveal)
  let start = 0
  while (start < words.length) {
    let end = Math.min(words.length, start + limit)
    for (let index = start + 1; index < end; index++) {
      if (words[index].manualBreakBefore) { end = index; break }
    }
    if (reveal.mode === 'smart-chunks' || reveal.mode === 'three-words' || reveal.mode === 'slow-read') {
      const earliest = Math.min(end, start + (reveal.mode === 'smart-chunks' ? 2 : 1))
      for (let index = earliest; index < end; index++) {
        const pause = words[index].start - words[index - 1].end
        const visualWidth = words.slice(start, index + 1).reduce((total, item) => total + item.word.text.length + 1, 0)
        const maxDuration = (reveal.maximumDurationMs ?? 2600) / 1000
        if (pause > Math.max(.25, reveal.pauseThresholdMs / 1000) || endPunctuation.test(words[index - 1].word.text) || visualWidth > (reveal.mode === 'slow-read' ? 52 : 30) || words[index].end - words[start].start > maxDuration) { end = index; break }
      }
    }
    if (reveal.minimumDurationMs && !singleModes.includes(reveal.mode) && !['two-words', 'three-words'].includes(reveal.mode)) {
      while (end < words.length && end - start < limit + 3 && !words[end].manualBreakBefore && (words[end - 1].end - words[start].start) * 1000 < reveal.minimumDurationMs) end++
    }
    pages.push({ words: words.slice(start, end), startIndex: start, endIndex: end })
    start = end
  }
  return pages
}

function partial(text: string, progress: number, reveal: CaptionRevealSettings, duration: number) {
  const fraction = reveal.typingSpeedMode === 'fixed'
    ? Math.min(1, progress * duration * reveal.charactersPerSecond / Math.max(1, text.length))
    : progress
  const count = Math.max(1, Math.min(text.length, Math.ceil(fraction * text.length)))
  return reveal.characterDirection === 'rtl' ? text.slice(-count) : text.slice(0, count)
}

export function getCaptionDisplay(
  segments: CaptionSegment[],
  time: number,
  reveal: CaptionRevealSettings,
  overrides: Record<string, WordOverride> = {},
): CaptionDisplay | null {
  const words: TimedWord[] = segments.flatMap((segment) => segment.words.map((word) => ({
    word, segmentId: segment.id, start: overrides[word.id]?.start ?? word.start, end: overrides[word.id]?.end ?? word.end, manualBreakBefore: Boolean(overrides[word.id]?.manualBreakBefore),
  }))).sort((a, b) => a.start - b.start)
  if (!words.length) return null
  const shiftedTime = time + (reveal.activeWordLeadMs || 0) / 1000
  if (shiftedTime < words[0].start - reveal.preRollMs / 1000 || shiftedTime > words[words.length - 1].end + reveal.postRollMs / 1000) return null
  let activeIndex = -1
  for (let index = 0; index < words.length; index++) {
    const advance = index === 0 || index > 0 && shiftedTime >= words[index - 1].end ? reveal.preRollMs / 1000 : 0
    if (shiftedTime >= words[index].start - advance) activeIndex = index
    else break
  }
  activeIndex = Math.max(0, activeIndex)
  const current = words[activeIndex]
  const next = words[activeIndex + 1]
  if (next && reveal.clearOnPause && shiftedTime > current.end + reveal.pauseThresholdMs / 1000 && shiftedTime < next.start) return null

  const pages = pagesFor(words, reveal)
  const pageIndex = pages.findIndex((page) => activeIndex >= page.startIndex && activeIndex < page.endIndex)
  const page = pages[Math.max(0, pageIndex)]
  const following = words[page.endIndex]
  if (!following && shiftedTime > page.words[page.words.length - 1].end + reveal.postRollMs / 1000) return null
  if (following && activeIndex === page.endIndex - 1 && shiftedTime > current.end && shiftedTime < following.start) {
    const behavior = reveal.clearBehavior ?? 'next-word'
    if (behavior === 'replace' || behavior === 'hold' && shiftedTime > current.end + reveal.postRollMs / 1000) return null
  }
  const position = activeIndex - page.startIndex
  const mode = reveal.mode
  let visible = page.words

  if (singleModes.includes(mode) || mode === 'keyword-only') visible = mode === 'keyword-only' ? (current.word.emphasis ? [current] : []) : [current]
  else if (mode === 'word-build' || mode === 'progressive-build' || mode === 'stack-build' || mode === 'letter-build') visible = reveal.buildKeepsPreviousWords ? page.words.slice(0, position + 1) : [current]
  else if (mode === 'line-by-line') visible = page.words.slice(0, Math.min(page.words.length, (Math.floor(position / Math.max(1, reveal.wordsPerLine)) + 1) * reveal.wordsPerLine))
  else if (mode === 'line-replace') visible = page.words.slice(Math.floor(position / Math.max(1, reveal.wordsPerLine)) * reveal.wordsPerLine, (Math.floor(position / Math.max(1, reveal.wordsPerLine)) + 1) * reveal.wordsPerLine)
  else if (mode === 'question-answer') {
    const questionEnd = page.words.findIndex(({ word }) => /\?$/.test(word.text))
    const split = questionEnd >= 0 ? questionEnd + 1 : Math.ceil(page.words.length / 2)
    visible = position < split ? page.words.slice(0, split) : page.words.slice(split)
  }

  if (!visible.length) return null
  const currentDuration = Math.max(.04, current.end - current.start)
  const currentProgress = Math.max(0, Math.min(1, (shiftedTime - current.start) / currentDuration))
  const displayWords = visible.map((item, index): DisplayWord => {
    const state = item === current ? 'active' : item.end <= current.start ? 'past' : 'future'
    const progress = state === 'active' ? currentProgress : state === 'past' ? 1 : 0
    let text = item.word.text
    if (mode === 'letter-by-letter' || mode === 'letter-build' || mode === 'letter-replace' || mode === 'typewriter-phrase') {
      text = state === 'future' ? '' : state === 'active' ? partial(text, progress, reveal, Math.max(.04, item.end - item.start)) : text
      if (mode === 'letter-replace') text = text.slice(-1)
    }
    return {
      word: item.word, segmentId: item.segmentId, state, text, progress,
      lineBreakBefore: index > 0 && index % Math.max(1, reveal.wordsPerLine) === 0,
    }
  })
  return {
    words: displayWords,
    text: displayWords.map((item) => item.text).filter(Boolean).join(' '),
    activeWordId: current.word.id,
    segmentId: current.segmentId,
    groupIndex: pageIndex,
    pageStart: page.words[0].start,
    pageEnd: page.words[page.words.length - 1].end,
    isStacked: mode === 'vertical-word-stack' || mode === 'stack-build',
    isQuestion: mode === 'question-answer' && visible.some(({ word }) => /\?$/.test(word.text)),
    alternateRight: mode === 'left-right-alternate' && pageIndex % 2 === 1,
    fadeProgress: reveal.clearBehavior === 'fade' && shiftedTime > page.words[page.words.length - 1].end
      ? Math.max(0, 1 - (shiftedTime - page.words[page.words.length - 1].end) / Math.max(.05, reveal.postRollMs / 1000))
      : 1,
  }
}
