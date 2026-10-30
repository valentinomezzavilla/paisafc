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

const cache = new Map<KitId, Promise<THREE.CanvasTexture>>()

/**
 * Mapa de color de la tela: el color del kit con las curvas de nivel de topo-gold.svg, pintadas del
 * tono del kit. Se repite en espejo para que las líneas sigan de una repetición a la otra.
 */
export function topoTexture(kit: KitId, size = 2048): Promise<THREE.CanvasTexture> {
  let p = cache.get(kit)
  if (!p) {
    p = (async () => {
      const c = KIT_COLORS[kit]
      const svg = (await (await fetch(asset('assets/topo-gold.svg'))).text())
        .replace(/stroke="#[0-9a-f]+"/i, `stroke="${c.topo}"`)
        .replace(/stroke-width="[\d.]+"/, 'stroke-width="2.6"')
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
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

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
