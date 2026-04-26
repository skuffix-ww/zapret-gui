import { Resvg } from '@resvg/resvg-js'
import pngToIco from 'png-to-ico'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'

const SVG = resolve('src/renderer/src/assets/logo.svg')
const TARGETS = [
  resolve('icon.ico'),
  resolve('src/renderer/public/icon.ico')
]
const SIZES = [16, 24, 32, 48, 64, 128, 256]

const svgBuf = readFileSync(SVG)
const pngs = SIZES.map((size) => {
  const r = new Resvg(svgBuf, { fitTo: { mode: 'width', value: size } })
  return r.render().asPng()
})
const ico = await pngToIco(pngs)

for (const t of TARGETS) {
  mkdirSync(dirname(t), { recursive: true })
  writeFileSync(t, ico)
  console.log(`[build-icon] wrote ${SIZES.length}-size icon → ${t}`)
}
