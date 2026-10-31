import * as THREE from 'three'
import type { KitId } from '../../data/kits'
import { asset } from '../../lib/asset'
import { KIT_COLORS } from '../kitColors'

/** Tamaño real de una repetición del dibujo de curvas sobre la tela, en metros (proporción del SVG, 16:10). */
export const TOPO_TILE: [number, number] = [0.9, 0.56]

/**
 * Repeticiones del dibujo en [u, v]. Alrededor de la pieza (u va de 0 a 1) un número par: la textura se
 * repite en espejo, y con una cantidad par la última repetición empalma con la primera en la costura.
 * En v (metros), según el tamaño real.
 */
export function topoRepeat(perimeter: number): [number, number] {
  return [Math.max(2, 2 * Math.round(perimeter / TOPO_TILE[0] / 2)), 1 / TOPO_TILE[1]]
}

/**
 * Corrimiento en u para que los ejes del espejo caigan en los costados (u = 0,25 y 0,75): en el centro
 * del pecho o de la espalda el dibujo se vería simétrico como un caleidoscopio.
 */
export function topoOffset(repeatU: number): number {
  return (((-repeatU * 0.25) % 1) + 1) % 1
}

/** Lado, en metros, de una repetición del jacquard (rombos concéntricos) de la suplente. */
export const ARGYLE_TILE = 0.035

/**
 * Repetición y corrimiento del dibujo de tela de cada kit sobre una pieza de ese perímetro: la titular
 * lleva curvas de nivel (se repiten en espejo); la suplente, un jacquard de rombos (repetición entera).
 */
export function patternLayout(kit: KitId, perimeter: number): { repeat: [number, number]; offsetX: number } {
  if (kit === 'crema') return { repeat: [Math.max(1, Math.round(perimeter / ARGYLE_TILE)), 1 / ARGYLE_TILE], offsetX: 0 }
  const repeat = topoRepeat(perimeter)
  return { repeat, offsetX: topoOffset(repeat[0]) }
}

const cache = new Map<KitId, Promise<THREE.CanvasTexture>>()

/**
 * Jacquard de la suplente: rombos concéntricos tono sobre tono, como en el mockup. Cada rombo son
 * anillos de ~3 mm que alternan claro y oscuro, con un filo de luz en el borde: se lee como tejido en relieve.
 */
function argyleCanvas(fabric: string, size = 512): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = fabric
  ctx.fillRect(0, 0, size, size)
  const half = size / 2
  const path = (cx: number, cy: number, d: number) => {
    ctx.beginPath()
    ctx.moveTo(cx, cy - d)
    ctx.lineTo(cx + d, cy)
    ctx.lineTo(cx, cy + d)
    ctx.lineTo(cx - d, cy)
    ctx.closePath()
  }
  // Centros en las esquinas y en el medio: la baldosa empalma sola
  const centers: [number, number][] = [[0, 0], [size, 0], [0, size], [size, size], [half, half]]
  const rings = [1, 0.8, 0.6, 0.4, 0.2]
  for (const [cx, cy] of centers) {
    rings.forEach((ratio, k) => {
      path(cx, cy, half * ratio)
      ctx.fillStyle = k % 2 === 0 ? 'rgba(122, 100, 58, 0.17)' : 'rgba(255, 251, 236, 0.30)'
      ctx.fill()
    })
  }
  // Filo de luz arriba-izquierda y sombra abajo-derecha en el borde de cada rombo
  ctx.lineJoin = 'miter'
  for (const [cx, cy] of centers) {
    path(cx, cy, half)
    ctx.lineWidth = 9
    ctx.strokeStyle = 'rgba(255, 253, 242, 0.55)'
    ctx.stroke()
    path(cx + 4, cy + 4, half)
    ctx.lineWidth = 6
    ctx.strokeStyle = 'rgba(96, 78, 42, 0.18)'
    ctx.stroke()
  }
  return canvas
}

/**
 * Mapa de color de la tela: el color del kit con las curvas de nivel de topo-gold.svg, pintadas del
 * tono del kit. Se repite en espejo para que las líneas sigan de una repetición a la otra.
 */
export function topoTexture(kit: KitId, size = 2048): Promise<THREE.CanvasTexture> {
  let p = cache.get(kit)
  if (!p) {
    p = (async () => {
      const c = KIT_COLORS[kit]
      if (kit === 'crema') {
        const tex = new THREE.CanvasTexture(argyleCanvas(c.fabric))
        tex.colorSpace = THREE.SRGBColorSpace
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping
        tex.anisotropy = 8
        return tex
      }
      const svg = (await (await fetch(asset('assets/topo-gold.svg'))).text())
        .replace(/stroke="#[0-9a-f]+"/i, `stroke="${c.topo}"`)
        .replace(/stroke-width="[\d.]+"/, 'stroke-width="5.4"')
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
      const img = new Image()
      img.src = url
      await img.decode()
      URL.revokeObjectURL(url)

      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = Math.round((size * TOPO_TILE[1]) / TOPO_TILE[0])
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = c.fabric
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.globalAlpha = c.topoStrength
      // Borde apenas difuso, como un estampado sublimado: se dibuja a media resolución y se agranda con
      // filtrado (un filtro de desenfoque sobre el canvas entero tardaba segundos en el hilo principal)
      const soft = document.createElement('canvas')
      soft.width = canvas.width / 2
      soft.height = canvas.height / 2
      soft.getContext('2d')!.drawImage(img, 0, 0, soft.width, soft.height)
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(soft, 0, 0, canvas.width, canvas.height)

      const tex = new THREE.CanvasTexture(canvas)
      tex.colorSpace = THREE.SRGBColorSpace
      tex.wrapS = tex.wrapT = THREE.MirroredRepeatWrapping
      tex.anisotropy = 8
      return tex
    })()
    cache.set(kit, p)
  }
  return p
}
