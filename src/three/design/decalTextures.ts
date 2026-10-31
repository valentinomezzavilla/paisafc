import * as THREE from 'three'
import type { KitId } from '../../data/kits'
import { DECALS, type DecalId } from '../anchors'
import { KIT_COLORS, type KitColors } from '../kitColors'
import { drawText, drawTextFit, fontsReady, loadImage, makeCanvas, tinted, yieldToMain } from './draw'
import { reliefNormalMap, type ReliefOptions } from './relief'

const DISPLAY = 'Big Shoulders Display Variable'
const SANS = 'Instrument Sans Variable'

type Painter = (ctx: CanvasRenderingContext2D, w: number, h: number, c: KitColors) => void | Promise<void>

/** Color y relieve de un calco: la estampa y su normal map (se levanta de la tela, deja ver la trama). */
export interface DecalMaps {
  map: THREE.CanvasTexture
  normal: THREE.CanvasTexture
}

/** Relieve de cada diseño. Los milímetros son los de la prenda real. */
type Relief = Pick<ReliefOptions, 'liftMm' | 'blurMm' | 'weaveMm' | 'stitch'>

/**
 * Cada diseño se dibuja en unidades propias y se escala a la textura. Los tamaños de cada calco sobre la
 * tela están en DECALS.
 */
const PAINTERS: Record<DecalId, { box: [number, number]; paint: Painter; relief: Relief }> = {
  // Como en el mockup: dos chevrones con una barra inclinada y VEZZA en una tipografía muy pesada, más
  // ancha que los chevrones. Unidades: la palabra mide 100 de ancho.
  vezza: {
    box: [100, 106],
    paint: (ctx, _w, _h, c) => {
      ctx.strokeStyle = c.print
      ctx.lineWidth = 5.6
      ctx.lineJoin = 'miter'
      ctx.miterLimit = 6
      ctx.lineCap = 'butt'
      ctx.stroke(new Path2D('M36.4 2.4 L14 33 L36.4 63.6'))
      ctx.stroke(new Path2D('M63.6 2.4 L86 33 L63.6 63.6'))
      ctx.lineWidth = 4.8
      ctx.stroke(new Path2D('M55.8 18.5 L44.2 49.5'))
      drawTextFit(ctx, 'VEZZA', 0, 82.4, 100, 22.4, { weight: 700, family: SANS, spacing: 0.035, fill: c.print, boost: 7 })
    },
    relief: { liftMm: 0.35, blurMm: 0.5, weaveMm: 0.08 },
  },

  // Aro dorado vacío (adentro se ve la tela), la R en itálica y el rayo que le cruza la pata
  parche: {
    box: [100, 100],
    paint: (ctx, _w, _h, c) => {
      ctx.lineWidth = 3.2
      ctx.strokeStyle = c.patchRing
      ctx.beginPath()
      ctx.arc(50, 50, 48, 0, Math.PI * 2)
      ctx.stroke()
      ctx.save()
      ctx.transform(1, 0, -0.2, 1, 11, 0) // itálica
      drawText(ctx, 'R', 42, 71, { size: 62, weight: 900, family: DISPLAY, fill: c.patchInk })
      ctx.restore()
      ctx.fillStyle = c.patchBolt
      ctx.fill(new Path2D('M70 20 L52 54 L63 54 L54 82 L80 44 L67 44 L76 20 Z'))
    },
    relief: { liftMm: 0.35, blurMm: 0.45, weaveMm: 0.08 },
  },

  // Medidas en milímetros: la tinta llena la caja
  nombre: {
    box: [310, 52],
    paint: (ctx, w, h, c) => drawTextFit(ctx, 'MEZZAVILLA', 0, 0, w, h, { weight: 700, family: DISPLAY, spacing: 0.03, fill: c.print, boost: 4 }),
    relief: { liftMm: 0.6, blurMm: 0.7, weaveMm: 0.08 },
  },

  numero: {
    box: [158, 234],
    paint: (ctx, w, h, c) => drawTextFit(ctx, '11', 0, 0, w, h, { weight: 900, family: DISPLAY, spacing: 0.16, fill: c.print }),
    relief: { liftMm: 0.9, blurMm: 1.0, weaveMm: 0.08 },
  },

  sponsor: {
    box: [233, 126],
    paint: async (ctx, w, h, c) => {
      const img = await loadImage('assets/sponsors/toms-burger.png')
      ctx.drawImage(tinted(img, img.naturalWidth, img.naturalHeight, c.print), 0, 0, w, h)
    },
    relief: { liftMm: 0.55, blurMm: 0.6, weaveMm: 0.08 },
  },

  // Bordado: levanta más y lleva hilos en diagonal
  escudo: {
    box: [86, 97.5],
    paint: async (ctx, w, h) => ctx.drawImage(await loadImage('assets/escudo/escudo.png'), 0, 0, w, h),
    relief: { liftMm: 1.0, blurMm: 0.9, stitch: { pitchMm: 0.5, heightMm: 0.16, angle: 0.62 } },
  },

  shortEscudo: {
    box: [50, 56.7],
    paint: async (ctx, w, h) => ctx.drawImage(await loadImage('assets/escudo/escudo-512.webp'), 0, 0, w, h),
    relief: { liftMm: 0.9, blurMm: 0.8, stitch: { pitchMm: 0.5, heightMm: 0.14, angle: 0.62 } },
  },
}

const cache = new Map<KitId, Promise<Record<DecalId, DecalMaps>>>()

/** Texturas de todos los calcos de un kit, dibujadas a 1024 px del lado más largo. */
export function decalTextures(kit: KitId, maxAnisotropy = 8): Promise<Record<DecalId, DecalMaps>> {
  let p = cache.get(kit)
  if (!p) {
    p = (async () => {
      await fontsReady()
      const c = KIT_COLORS[kit]
      const entries: (readonly [DecalId, DecalMaps])[] = []
      // De a uno y cediendo el hilo entre calcos: cada relieve cuesta unos cientos de milisegundos
      for (const { id, size } of DECALS) {
        await yieldToMain()
        entries.push(await (async () => {
          const { box, paint, relief } = PAINTERS[id]
          // El lienzo toma la proporción del calco; el diseño se centra adentro sin deformarse.
          const { canvas, ctx } = makeCanvas(size[0], size[1], 1024)
          const scale = Math.min(size[0] / box[0], size[1] / box[1])
          const k = canvas.width / size[0]
          ctx.setTransform(k * scale, 0, 0, k * scale, (canvas.width - box[0] * scale * k) / 2, (canvas.height - box[1] * scale * k) / 2)
          await paint(ctx, box[0], box[1], c)
          const map = new THREE.CanvasTexture(canvas)
          map.colorSpace = THREE.SRGBColorSpace
          map.anisotropy = maxAnisotropy
          // El relieve es de baja frecuencia: se calcula a media resolución
          const half = document.createElement('canvas')
          half.width = Math.round(canvas.width / 2)
          half.height = Math.round(canvas.height / 2)
          half.getContext('2d', { willReadFrequently: true })!.drawImage(canvas, 0, 0, half.width, half.height)
          const normal = reliefNormalMap(half, { ...relief, pxPerMm: half.width / (size[0] * 1000) })
          return [id, { map, normal }] as const
        })())
      }
      return Object.fromEntries(entries) as Record<DecalId, DecalMaps>
    })()
    cache.set(kit, p)
  }
  return p
}
