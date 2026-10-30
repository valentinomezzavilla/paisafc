// Genera public/assets/topo-{gold,forest}.svg: curvas de nivel (estilo mapa topográfico) a partir
// de ruido, en los colores de la paleta (src/styles/palette.css). Se usan como imagen de fondo:
// el navegador las rasteriza una vez y el parallax solo mueve la capa.
//   node scripts/make_topo.mjs [semilla]
import { readFileSync, writeFileSync } from 'node:fs'

const seed = Number(process.argv[2] ?? 11)
const W = 1600
const H = 1000
const CELL = 8
const LEVELS = 16

// Ruido de valor suave con varias octavas (determinístico según la semilla).
function rand2(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453
  return s - Math.floor(s)
}
const smooth = (t) => t * t * (3 - 2 * t)
function valueNoise(x, y) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const u = smooth(x - xi)
  const v = smooth(y - yi)
  const a = rand2(xi, yi)
  const b = rand2(xi + 1, yi)
  const c = rand2(xi, yi + 1)
  const d = rand2(xi + 1, yi + 1)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}
function field(x, y) {
  let sum = 0
  let amp = 1
  let freq = 1 / 420
  for (let o = 0; o < 4; o++) {
    sum += valueNoise(x * freq, y * freq) * amp
    amp *= 0.5
    freq *= 2.1
  }
  return sum / 1.875
}

const cols = W / CELL + 1
const rows = H / CELL + 1
const grid = new Float64Array(cols * rows)
for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) grid[j * cols + i] = field(i * CELL, j * CELL)

let min = Infinity
let max = -Infinity
for (const v of grid) {
  min = Math.min(min, v)
  max = Math.max(max, v)
}

// Marching squares: segmentos por celda, después unidos en polilíneas.
function contour(level) {
  const segs = []
  const lerp = (a, b) => (level - a) / (b - a)
  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < cols - 1; i++) {
      const tl = grid[j * cols + i]
      const tr = grid[j * cols + i + 1]
      const br = grid[(j + 1) * cols + i + 1]
      const bl = grid[(j + 1) * cols + i]
      const x = i * CELL
      const y = j * CELL
      const pts = []
      if (tl < level !== tr < level) pts.push([x + lerp(tl, tr) * CELL, y])
      if (tr < level !== br < level) pts.push([x + CELL, y + lerp(tr, br) * CELL])
      if (bl < level !== br < level) pts.push([x + lerp(bl, br) * CELL, y + CELL])
      if (tl < level !== bl < level) pts.push([x, y + lerp(tl, bl) * CELL])
      if (pts.length === 2) segs.push(pts)
      else if (pts.length === 4) segs.push([pts[0], pts[1]], [pts[2], pts[3]])
    }
  }
  return chain(segs)
}

function chain(segs) {
  const key = (p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`
  const byPoint = new Map()
  segs.forEach((s, idx) => {
    for (const p of s) {
      const k = key(p)
      if (!byPoint.has(k)) byPoint.set(k, [])
      byPoint.get(k).push(idx)
    }
  })
  const used = new Uint8Array(segs.length)
  const lines = []
  const extend = (line) => {
    for (;;) {
      const end = line[line.length - 1]
      const next = (byPoint.get(key(end)) ?? []).find((idx) => !used[idx])
      if (next === undefined) return
      used[next] = 1
      const [a, b] = segs[next]
      line.push(key(a) === key(end) ? b : a)
    }
  }
  segs.forEach((s, idx) => {
    if (used[idx]) return
    used[idx] = 1
    const line = [s[0], s[1]]
    extend(line)
    line.reverse()
    extend(line)
    if (line.length > 6) lines.push(line)
  })
  return lines
}

// Simplificación simple: descarta puntos casi colineales.
function simplify(line, tol = 0.6) {
  const out = [line[0]]
  for (let i = 1; i < line.length - 1; i++) {
    const [ax, ay] = out[out.length - 1]
    const [bx, by] = line[i]
    const [cx, cy] = line[i + 1]
    const area = Math.abs((bx - ax) * (cy - ay) - (cx - ax) * (by - ay))
    if (area > tol * Math.hypot(cx - ax, cy - ay)) out.push(line[i])
  }
  out.push(line[line.length - 1])
  return out
}

const paths = []
for (let l = 1; l < LEVELS; l++) {
  const level = min + ((max - min) * l) / LEVELS
  for (const line of contour(level)) {
    const pts = simplify(line)
    paths.push('M' + pts.map(([x, y]) => `${Math.round(x)} ${Math.round(y)}`).join('L'))
  }
}

const palette = readFileSync(new URL('../src/styles/palette.css', import.meta.url), 'utf8')
const color = (name) => palette.match(new RegExp(`--color-${name}: (#[0-9a-f]{6})`))[1]
for (const tone of ['gold', 'forest']) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice"><path d="${paths.join('')}" fill="none" stroke="${color(tone)}" stroke-width="1.4" stroke-linejoin="round"/></svg>`
  writeFileSync(new URL(`../public/assets/topo-${tone}.svg`, import.meta.url), svg)
  console.log(`topo-${tone}.svg: ${paths.length} curvas, ${(svg.length / 1024).toFixed(1)} KB`)
}
