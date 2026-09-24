import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'

const publicDir = fileURLToPath(new URL('../public/', import.meta.url))
const svg = readFileSync(`${publicDir}icon.svg`)

for (const size of [192, 512]) {
  const image = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render()
  writeFileSync(`${publicDir}icon-${size}.png`, image.asPng())
}
