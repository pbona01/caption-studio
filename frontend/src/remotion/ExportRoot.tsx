import { Composition, registerRoot } from 'remotion'
import { BigBoldComposition, type BigBoldCompositionProps } from './BigBoldComposition'
import './export-fonts.css'

type ExportProps = BigBoldCompositionProps & { width: number; height: number; duration: number } & Record<string, unknown>

const defaults: ExportProps = {
  videoSrc: '', segments: [], fps: 30, width: 720, height: 1280, duration: 1,
  editorState: {
    schemaVersion: 1, projectId: '000000000000', presetId: 'big-bold',
    projectOverrides: {}, segmentOverrides: {}, wordOverrides: {}, textLayers: [], keyframes: {},
    settings: { showSafeAreas: false, showGuides: false, safeAreaPreset: 'tiktok-reels', canvasZoom: 'fit' },
  },
}

function Root() {
  return <Composition<any, ExportProps>
    id="CaptionStudioExport"
    component={BigBoldComposition}
    defaultProps={defaults}
    width={720}
    height={1280}
    fps={30}
    durationInFrames={30}
    calculateMetadata={({ props }) => ({
      width: Math.max(2, Math.round(props.width / 2) * 2),
      height: Math.max(2, Math.round(props.height / 2) * 2),
      fps: props.fps,
      durationInFrames: Math.max(1, Math.ceil(props.duration * props.fps)),
    })}
  />
}

registerRoot(Root)
