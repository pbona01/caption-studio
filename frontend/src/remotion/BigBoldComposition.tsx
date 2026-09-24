import { Fragment } from 'react'
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Video } from 'remotion'
import { getCaptionDisplay } from '../editor/captionDisplayEngine'
import { resolveCaptionReveal, resolveCaptionStyle } from '../editor/styleResolver'
import type { EditorProjectDocument } from '../editor/types'
import type { CaptionSegment } from '../types/video'

export interface BigBoldCompositionProps {
  videoSrc: string
  segments: CaptionSegment[]
  fps: number
  editorState: EditorProjectDocument
  selectedWordId?: string
  isEditorPreview?: boolean
}

const isNumber = (text: string) => /(?:\d|[$€£%])/u.test(text) || /^(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|dollars?|pounds?|euros?|percent|days?)\W*$/i.test(text)
const gradientFor = (style: ReturnType<typeof resolveCaptionStyle>) => style.fill.type === 'radial-gradient'
  ? `radial-gradient(circle, ${style.fill.gradientStops.join(', ')})`
  : `linear-gradient(${style.fill.gradientAngle}deg, ${style.fill.gradientStops.join(', ')})`

export function BigBoldComposition({ videoSrc, segments, fps, editorState, selectedWordId, isEditorPreview }: BigBoldCompositionProps) {
  const frame = useCurrentFrame()
  const { width, height } = useVideoConfig()
  const time = frame / fps
  const reveal = resolveCaptionReveal(editorState)
  const display = getCaptionDisplay(segments, time, reveal, editorState.wordOverrides)
  const segment = segments.find((item) => item.id === display?.segmentId)
  const style = resolveCaptionStyle(editorState, segment?.id)
  const segmentFrame = Math.max(0, frame - Math.round((display?.pageStart ?? time) * fps))
  const entranceProgress = interpolate(segmentFrame, [0, Math.max(2, Math.round(fps * style.animation.durationSeconds))], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const entranceScale = style.animation.entrance === 'pop' || style.animation.entrance === 'bounce'
    ? 0.82 + 0.18 * spring({ frame: segmentFrame, fps, config: { damping: style.animation.entrance === 'bounce' ? 9 : 18, stiffness: 240, mass: 0.55 } })
    : 1
  const entranceY = style.animation.entrance === 'slide-up' ? (1 - entranceProgress) * 36 : 0
  const shadow = [
    style.shadow.enabled ? `${style.shadow.x}px ${style.shadow.y}px ${style.shadow.blur}px ${style.shadow.color}` : '',
    style.glow.enabled ? `0 0 ${style.glow.radius}px ${style.glow.color}` : '',
  ].filter(Boolean).join(', ') || 'none'
  const composition = style.layout.composition
  const alignment = display?.alternateRight || composition === 'right-stack' ? 'right' : composition === 'left-stack' || composition === 'lower-third' ? 'left' : style.typography.alignment
  const characterMode = ['letter-by-letter', 'letter-build', 'letter-replace', 'typewriter-phrase'].includes(reveal.mode)
  const activeBox = ['active-word-box', 'active-card'].includes(reveal.mode)
  const showUnderline = reveal.mode === 'underline-track' || reveal.activeUnderline
  const fadeTracking = ['active-word-fade', 'opacity-track'].includes(reveal.mode)
  const scaleTracking = ['active-word-scale', 'size-track', 'focus-word'].includes(reveal.mode)
  const karaoke = ['karaoke', 'karaoke-sweep'].includes(reveal.mode)
  const singleWordSize = ['single-word', 'word-replace', 'letter-by-letter', 'letter-replace', 'keyword-only'].includes(reveal.mode)
  const baseFontSize = singleWordSize ? style.typography.emphasisSize : style.typography.secondarySize

  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      <Video src={videoSrc} />
      {display && <AbsoluteFill style={{ fontFamily: style.typography.fontFamily, fontStyle: style.typography.fontStyle, textAlign: alignment, textShadow: shadow, pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', left: style.transform.x * width, top: style.transform.y * height,
          width: `${style.typography.maxWidth * 100}%`, color: style.fill.color,
          paddingBottom: composition === 'lower-third' ? width * 0.018 : 0,
          borderBottom: composition === 'lower-third' ? `${Math.max(2, width * 0.006)}px solid ${style.fill.emphasisColor}` : undefined,
          opacity: display.fadeProgress * (style.animation.entrance === 'fade' ? entranceProgress : 1),
          transform: `translate(-${style.transform.anchorX * 100}%, calc(-${style.transform.anchorY * 100}% + ${entranceY}px)) rotate(${style.transform.rotation}deg) scale(${style.transform.scaleX * entranceScale}, ${style.transform.scaleY * entranceScale})`,
          transformOrigin: `${style.transform.anchorX * 100}% ${style.transform.anchorY * 100}%`,
          lineHeight: style.typography.lineHeight,
          letterSpacing: `${style.typography.letterSpacing}em`,
          wordSpacing: `${style.typography.wordSpacing}em`,
          textTransform: style.typography.textTransform,
          fontSize: width * baseFontSize,
          fontWeight: style.typography.fontWeight,
          whiteSpace: display.isStacked ? 'pre-line' : 'normal',
          display: display.isStacked ? 'flex' : undefined,
          flexDirection: display.isStacked ? reveal.stackDirection === 'bottom-up' ? 'column-reverse' : 'column' : undefined,
          backgroundColor: reveal.mode === 'word-card' ? reveal.activeBackground ?? 'rgba(15,15,15,.82)' : undefined,
          borderRadius: reveal.mode === 'word-card' ? width * .018 : undefined,
          padding: reveal.mode === 'word-card' ? width * .02 : undefined,
        }}>
          {display.words.map(({ word, segmentId, text: visibleText, state, lineBreakBefore, progress }) => {
            const wordStyle = resolveCaptionStyle(editorState, segmentId, word.id)
            const wordOverride = editorState.wordOverrides[word.id]
            if (wordOverride?.visible === false) return null
            const active = state === 'active'
            const past = state === 'past'
            const hero = wordOverride?.supersize || word.emphasis || (reveal.mode === 'number-hero' && isNumber(word.text)) || (reveal.mode === 'keyword-hero' && word.emphasis)
            const wordStart = wordOverride?.start ?? word.start
            const wordFrame = Math.max(0, frame - Math.round(wordStart * fps))
            const wordEntrance = wordOverride?.style?.animation?.entrance ?? 'none'
            const wordEntranceProgress = time < wordStart ? 0 : Math.min(1, wordFrame / Math.max(1, Math.round(wordStyle.animation.durationSeconds * fps)))
            const wordEntranceScale = wordEntrance === 'pop' || wordEntrance === 'bounce'
              ? 0.75 + 0.25 * spring({ frame: wordFrame, fps, config: { damping: wordEntrance === 'bounce' ? 9 : 18, stiffness: 240 } }) : 1
            const wordEntranceOpacity = wordEntrance === 'none' ? 1 : time < wordStart ? 0 : wordEntrance === 'fade' || wordEntrance === 'blur' ? wordEntranceProgress : 1
            const wordEntranceText = wordEntrance === 'typewriter' && !characterMode ? visibleText.slice(0, Math.max(1, Math.ceil(visibleText.length * wordEntranceProgress))) : visibleText
            const scale = active && scaleTracking ? reveal.activeScale ?? 1.12 : active && wordStyle.animation.active === 'scale' ? spring({ frame: wordFrame, fps, from: 1, to: reveal.activeScale ?? 1.12, config: { damping: 20, stiffness: 260 } }) : 1
            const activeHighlight = ['active-word', 'social-highlight', 'karaoke', 'karaoke-sweep', 'vertical-word-stack', 'focus-word'].includes(reveal.mode)
            const currentColor = reveal.activeColor ?? wordStyle.fill.activeColor
            const fillColor = karaoke ? (past ? reveal.pastColor ?? wordStyle.fill.color : active ? currentColor : reveal.futureColor ?? '#777777') : active && (activeHighlight || wordStyle.animation.active === 'color') ? currentColor : hero ? wordStyle.fill.emphasisColor : wordStyle.fill.color
            const useGradient = wordStyle.fill.type !== 'solid' && !karaoke && !(active && activeBox)
            const trackingOpacity = fadeTracking || reveal.mode === 'focus-word' || reveal.mode === 'progressive-build'
            const opacity = trackingOpacity ? active ? reveal.currentOpacity ?? 1 : past ? reveal.pastOpacity ?? .68 : reveal.futureOpacity ?? .48 : 1
            const sweepBackground = reveal.mode === 'karaoke-sweep' && active ? `linear-gradient(90deg, ${currentColor} ${Math.round(progress * 100)}%, ${reveal.futureColor ?? '#777777'} ${Math.round(progress * 100)}%)` : undefined
            const wordShadow = [
              wordStyle.shadow.enabled ? `${wordStyle.shadow.x}px ${wordStyle.shadow.y}px ${wordStyle.shadow.blur}px ${wordStyle.shadow.color}` : '',
              wordStyle.glow.enabled ? `0 0 ${wordStyle.glow.radius}px ${wordStyle.glow.color}` : '',
            ].filter(Boolean).join(', ') || 'none'
            return <Fragment key={word.id}>{!display.isStacked && (lineBreakBefore || wordOverride?.lineBreakBefore) && <br />}<span data-caption-word-id={word.id} style={{
              pointerEvents: isEditorPreview ? 'auto' : undefined,
              display: display.isStacked ? 'block' : 'inline-block', marginRight: display.isStacked ? 0 : '0.28em',
              color: active && activeBox ? '#0a0a0a' : useGradient || sweepBackground ? 'transparent' : fillColor,
              backgroundImage: sweepBackground ?? (useGradient ? gradientFor(wordStyle) : undefined),
              backgroundClip: useGradient || sweepBackground ? 'text' : undefined,
              WebkitBackgroundClip: useGradient || sweepBackground ? 'text' : undefined,
              fontFamily: wordStyle.typography.fontFamily,
              fontSize: `${(hero ? wordStyle.typography.emphasisSize : singleWordSize ? wordStyle.typography.emphasisSize : wordStyle.typography.secondarySize) / baseFontSize * (reveal.mode === 'focus-word' && !active ? .75 : 1) * (wordOverride?.fontScale ?? 1)}em`,
              fontWeight: active && (reveal.mode === 'bold-track' || reveal.activeFontWeight) ? reveal.activeFontWeight ?? 900 : past ? reveal.pastWeight ?? wordStyle.typography.fontWeight : state === 'future' ? reveal.futureWeight ?? wordStyle.typography.fontWeight : wordStyle.typography.fontWeight,
              fontStyle: wordStyle.typography.fontStyle,
              opacity: opacity * wordStyle.fill.opacity * wordEntranceOpacity,
              transform: `translateY(${wordEntrance === 'slide-up' ? (1 - wordEntranceProgress) * 20 : 0}px) scale(${scale * wordEntranceScale})`, transformOrigin: 'center',
              filter: wordEntrance === 'blur' ? `blur(${(1 - wordEntranceProgress) * 8}px)` : undefined,
              backgroundColor: wordOverride?.backgroundColor ?? (active && activeBox ? reveal.activeBackground ?? wordStyle.fill.activeColor : reveal.mode === 'word-card' ? reveal.activeBackground ?? '#171717' : undefined),
              borderRadius: active && activeBox ? '0.18em' : undefined,
              padding: active && (activeBox || reveal.mode === 'word-card') ? '0.06em 0.18em' : undefined,
              textDecoration: active && showUnderline ? 'underline' : undefined,
              textShadow: active && reveal.activeGlow ? `${wordShadow === 'none' ? '' : `${wordShadow}, `}0 0 18px ${currentColor}` : wordShadow,
              WebkitTextStroke: active && reveal.activeStroke ? `2px ${wordStyle.stroke.color}` : wordStyle.stroke.enabled ? `${wordStyle.stroke.width}px ${wordStyle.stroke.color}` : undefined,
              outline: selectedWordId === word.id ? '2px solid #d9ff5b' : undefined,
              outlineOffset: selectedWordId === word.id ? '3px' : undefined,
            }}>{wordEntranceText}{characterMode && active && reveal.cursor !== 'off' && (reveal.cursorBlinkMs === 0 || Math.floor(time * 1000 / (reveal.cursorBlinkMs ?? 500)) % 2 === 0) && <span style={{ color: wordStyle.fill.activeColor }}>{reveal.cursor === 'bar' ? '|' : reveal.cursor === 'underscore' ? '_' : '█'}</span>}</span>{!display.isStacked && wordOverride?.lineBreakAfter && <br />}</Fragment>
          })}
        </div>
      </AbsoluteFill>}
    </AbsoluteFill>
  )
}
