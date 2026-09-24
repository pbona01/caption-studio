import assert from 'node:assert/strict'
import test from 'node:test'
import { getCaptionDisplay } from '../src/editor/captionDisplayEngine.ts'

const tokens = ['I', 'MADE', 'TEN', 'THOUSAND', 'DOLLARS', 'IN', 'THIRTY', 'DAYS']
const words = tokens.map((text, index) => ({ id: `w${index}`, text, start: index * .4, end: index * .4 + .38, confidence: 1, emphasis: index === 4 }))
const segments = [
  { id: 'a', start: 0, end: words[3].end, words: words.slice(0, 4) },
  { id: 'b', start: words[4].start, end: words[7].end, words: words.slice(4) },
]
const reveal = { mode: 'smart-chunks', wordsPerPage: 4, wordsPerLine: 3, linesPerPage: 2, charactersPerSecond: 18, preRollMs: 0, postRollMs: 100, activeWordLeadMs: 0, buildKeepsPreviousWords: true, clearOnPause: false, pauseThresholdMs: 350, cursor: 'off' }
const at = (mode, time, overrides = {}, patch = {}) => getCaptionDisplay(segments, time, { ...reveal, mode, ...patch }, overrides)

test('mode grouping crosses transcription segment boundaries without altering words', () => {
  assert.equal(at('full-phrase', 1.7).text, 'DOLLARS IN THIRTY DAYS')
  assert.equal(at('single-word', .5).text, 'MADE')
  assert.equal(at('word-replace', .9).text, 'TEN')
  assert.equal(at('two-words', .9).text, 'TEN THOUSAND')
  assert.equal(at('three-words', .9).text, 'I MADE TEN')
  assert.equal(at('smart-chunks', 1.7).text, 'DOLLARS IN THIRTY DAYS')
  assert.equal(at('rapid-fire', 1.7).text, 'DOLLARS')
  assert.equal(at('slow-read', 1.7).text, 'I MADE TEN THOUSAND DOLLARS IN')
  assert.deepEqual(segments.flatMap((segment) => segment.words).map((word) => word.start), words.map((word) => word.start))
})

test('build and line modes reveal different visible words at the same timestamp', () => {
  assert.equal(at('word-build', .9).text, 'I MADE TEN')
  assert.equal(at('progressive-build', .9).text, 'I MADE TEN')
  assert.equal(at('stack-build', .9).isStacked, true)
  assert.equal(at('line-by-line', .9, {}, { wordsPerLine: 2 }).text, 'I MADE TEN THOUSAND')
  assert.equal(at('line-replace', .9, {}, { wordsPerLine: 2 }).text, 'TEN THOUSAND')
  assert.equal(at('vertical-word-stack', .9).isStacked, true)
})

test('letter reveal follows each word timestamp and supports fixed speed', () => {
  assert.equal(at('letter-by-letter', .4).text, 'M')
  assert.equal(at('letter-by-letter', .62).text, 'MAD')
  assert.equal(at('letter-build', .62).text, 'I MAD')
  assert.equal(at('typewriter-phrase', .62).text, 'I MAD')
  assert.equal(at('letter-by-letter', .62, {}, { typingSpeedMode: 'fixed', charactersPerSecond: 2 }).text, 'M')
})

test('tracking, karaoke, keyword, timing, and manual splits use the same active word', () => {
  for (const mode of ['active-word', 'active-word-fade', 'active-word-scale', 'active-word-box', 'karaoke', 'karaoke-sweep', 'underline-track', 'bold-track', 'opacity-track']) {
    assert.equal(at(mode, 1.7).activeWordId, 'w4', mode)
  }
  assert.equal(at('karaoke-sweep', 1.7).words.find((item) => item.word.id === 'w4').progress > 0, true)
  assert.equal(at('keyword-only', 1.7).text, 'DOLLARS')
  assert.equal(at('keyword-only', 1.3), null)
  assert.equal(at('two-words', .9, { w2: { manualBreakBefore: true } }).text, 'TEN THOUSAND')
  assert.equal(at('single-word', .5, { w1: { start: .65, end: .9 } }).text, 'I')
})

test('all selectable reveal modes resolve against real word timestamps', () => {
  const modes = ['full-phrase', 'single-word', 'two-words', 'three-words', 'smart-chunks', 'word-build', 'word-replace', 'letter-by-letter', 'letter-build', 'letter-replace', 'typewriter-phrase', 'line-by-line', 'line-replace', 'active-word', 'active-word-fade', 'active-word-scale', 'active-word-box', 'karaoke', 'karaoke-sweep', 'progressive-build', 'focus-word', 'keyword-only', 'keyword-hero', 'number-hero', 'question-answer', 'stack-build', 'vertical-word-stack', 'left-right-alternate', 'speaker-subtitle', 'cinema-subtitle', 'social-clean', 'social-highlight', 'word-card', 'active-card', 'underline-track', 'bold-track', 'size-track', 'opacity-track', 'teleprompter-build', 'rapid-fire', 'slow-read']
  for (const mode of modes) {
    const display = at(mode, 1.7)
    assert.equal(display?.activeWordId, 'w4', mode)
    assert.equal(display?.words.every(({ word }) => words.includes(word)), true, mode)
  }
})

test('fade clear behavior returns a timestamp-driven opacity', () => {
  const display = at('word-build', 1.76, { w4: { start: 2.2, end: 2.58 } }, { clearBehavior: 'fade', postRollMs: 400 })
  assert.equal(display.fadeProgress < 1 && display.fadeProgress > 0, true)
})
