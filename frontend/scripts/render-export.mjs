import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'

const [, , inputPath, outputPath, frameCountArg] = process.argv
if (!inputPath || !outputPath) throw new Error('Usage: node render-export.mjs <input.json> <output.mp4> [test-frame-count]')
const inputProps = JSON.parse(readFileSync(inputPath, 'utf8'))
const entryPoint = fileURLToPath(new URL('../src/remotion/ExportRoot.tsx', import.meta.url))
let lastReport = ''
const report = (status, progress) => {
  const key = `${status}:${progress}`
  if (key === lastReport) return
  lastReport = key
  process.stdout.write(`${JSON.stringify({ status, progress })}\n`)
}

report('bundling', 0)
const serveUrl = await bundle({ entryPoint, rootDir: resolve(fileURLToPath(new URL('..', import.meta.url))), onProgress: (value) => report('bundling', Math.round(value * .12)) })
report('preparing', 12)
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE || undefined
const composition = await selectComposition({ serveUrl, id: 'CaptionStudioExport', inputProps, browserExecutable })
await renderMedia({
  serveUrl,
  composition,
  inputProps,
  codec: 'h264',
  outputLocation: outputPath,
  overwrite: true,
  concurrency: Math.max(1, Number(process.env.REMOTION_CONCURRENCY ?? 2)),
  logLevel: 'error',
  browserExecutable,
  ...(frameCountArg ? { frameRange: [0, Math.min(composition.durationInFrames - 1, Number(frameCountArg) - 1)] } : {}),
  onProgress: ({ progress }) => report('rendering', Math.min(99, 12 + Math.round(progress * 87))),
})
report('ready', 100)
