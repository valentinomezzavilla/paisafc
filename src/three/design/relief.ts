import * as THREE from 'three'
import { KNIT_CELL, knitHeight } from '../fabric'

export interface ReliefOptions {
  /** Píxeles por milímetro de la estampa en su textura. */
  pxPerMm: number
  /** Cuánto sobresale la estampa de la tela (mm) y cuánto se suaviza su borde (mm). */
  liftMm: number
  blurMm: number
  /** Trama de la tela que se sigue viendo a través de la estampa (amplitud en mm). */
  weaveMm?: number
  /** Bordado: hilos finos en diagonal. `pitchMm` es la separación entre hilos. */
  stitch?: { pitchMm: number; heightMm: number; angle: number }
}

/** Suaviza en horizontal y en vertical con una ventana (dos pasadas aproximan una gaussiana). */
function boxBlur(src: Float32Array, w: number, h: number, radius: number): Float32Array {
  const r = Math.max(0, Math.round(radius))
  if (!r) return src
  const tmp = new Float32Array(src.length)
  const out = new Float32Array(src.length)
  const span = 2 * r + 1
  for (let y = 0; y < h; y++) {
    let acc = 0
    for (let x = -r; x <= r; x++) acc += src[y * w + Math.min(w - 1, Math.max(0, x))]
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = acc / span
      acc += src[y * w + Math.min(w - 1, x + r + 1)] - src[y * w + Math.max(0, x - r)]
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0
    for (let y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x]
    for (let y = 0; y < h; y++) {
      out[y * w + x] = acc / span
      acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x]
    }
  }
  return out
}

/**
 * Normal map de una estampa a partir de su silueta (el alfa del dibujo): la estampa se levanta de la
 * tela con el borde suave, deja ver la trama a través y, si es un bordado, lleva hilos.
 */
export function reliefNormalMap(source: HTMLCanvasElement, o: ReliefOptions): THREE.CanvasTexture {
  const { width: w, height: h } = source
  const data = source.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, w, h).data
  const alpha = new Float32Array(w * h)
  for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3] / 255

  // Altura en píxeles: borde suave dos pasadas, más la trama y los hilos adentro de la estampa
  const soft = boxBlur(boxBlur(alpha, w, h, (o.blurMm * o.pxPerMm) / 1.6), w, h, (o.blurMm * o.pxPerMm) / 1.6)
  const height = new Float32Array(w * h)
  const cell = KNIT_CELL * 1000 * o.pxPerMm
  const cosA = o.stitch ? Math.cos(o.stitch.angle) : 0
  const sinA = o.stitch ? Math.sin(o.stitch.angle) : 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      let v = soft[i] * o.liftMm * o.pxPerMm
      if (o.weaveMm) v += alpha[i] * o.weaveMm * o.pxPerMm * knitHeight(((x / cell) % 1 + 1) % 1, ((y / cell) % 1 + 1) % 1)
      if (o.stitch) {
        const t = (x * cosA + y * sinA) / (o.stitch.pitchMm * o.pxPerMm)
        v += alpha[i] * o.stitch.heightMm * o.pxPerMm * (0.5 + 0.5 * Math.sin(t * Math.PI * 2))
      }
      height[i] = v
    }
  }

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(w, h)
  const at = (x: number, y: number) => height[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))]
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const gx = (at(x + 1, y) - at(x - 1, y)) / 2
      const gy = (at(x, y + 1) - at(x, y - 1)) / 2
      // La textura se sube con flipY: v crece hacia arriba y el canvas hacia abajo
      const inv = 1 / Math.hypot(gx, gy, 1)
      const k = (y * w + x) * 4
      img.data[k] = (-gx * inv * 0.5 + 0.5) * 255
      img.data[k + 1] = (gy * inv * 0.5 + 0.5) * 255
      img.data[k + 2] = (inv * 0.5 + 0.5) * 255
      img.data[k + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.NoColorSpace
  tex.anisotropy = 8
  return tex
}
