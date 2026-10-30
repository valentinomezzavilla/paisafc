import * as THREE from 'three'
import type { KitId } from '../../data/kits'
import { DECALS, type DecalId } from '../anchors'
import { KIT_COLORS, type KitColors } from '../kitColors'
import { drawText, fontsReady, loadImage, makeCanvas, tinted } from './draw'

const DISPLAY = 'Big Shoulders Display Variable'
const SANS = 'Instrument Sans Variable'

type Painter = (ctx: CanvasRenderingContext2D, w: number, h: number, c: KitColors) => void | Promise<void>

/**
 * Cada diseño se dibuja en unidades propias (las del SVG del que sale) y se escala a la textura.
 * Los tamaños de cada calco sobre la tela están en DECALS.
 */
const PAINTERS: Record<DecalId, { box: [number, number]; paint: Painter }> = {
  // Igual que VezzaMark (src/components/sponsors/marks.tsx): ‹/› arriba y la palabra abajo
  vezza: {
    box: [200, 120],
    paint: (ctx, _w, _h, c) => {
      ctx.strokeStyle = c.print
      ctx.lineWidth = 9
      ctx.lineJoin = 'miter'
      ctx.lineCap = 'butt'
      ctx.stroke(new Path2D('M74 12 L48 40 L74 68'))
      ctx.stroke(new Path2D('M126 12 L152 40 L126 68'))
      ctx.lineCap = 'square'
      ctx.stroke(new Path2D('M108 16 L92 64'))
      drawText(ctx, 'VEZZA', 100, 112, { size: 34, weight: 700, family: SANS, spacing: 0.06, fill: c.print })
    },
  },

  // Como PatchMark: círculo con la R itálica y el rayo
  parche: {
    box: [100, 100],
    paint: (ctx, _w, _h, c) => {
      ctx.beginPath()
      ctx.arc(50, 50, 47, 0, Math.PI * 2)
      ctx.fillStyle = c.patchBg
      ctx.fill()
      ctx.lineWidth = 5
      ctx.strokeStyle = c.trim
      ctx.beginPath()
      ctx.arc(50, 50, 44, 0, Math.PI * 2)
      ctx.stroke()
      ctx.save()
      ctx.transform(1, 0, -0.2, 1, 12, 0) // itálica
      drawText(ctx, 'R', 44, 69, { size: 54, weight: 900, family: DISPLAY, fill: c.print })
      ctx.restore()
      ctx.fillStyle = '#dfbb49'
      ctx.fill(new Path2D('M66 22 L52 52 L62 52 L54 78 L76 44 L65 44 L72 22 Z'))
    },
  },

  nombre: {
    box: [450, 100],
    paint: (ctx, w, _h, c) =>
      drawText(ctx, 'MEZZAVILLA', w / 2, 82, {
        size: 92,
        weight: 800,
        family: DISPLAY,
        spacing: 0.04,
        fill: c.print,
        stroke: c.printOutline,
        strokeWidth: 5,
        maxWidth: w - 12,
      }),
  },

  numero: {
    box: [200, 200],
    paint: (ctx, w, _h, c) =>
      drawText(ctx, '11', w / 2, 186, {
        size: 228,
        weight: 800,
        family: DISPLAY,
        spacing: 0.02,
        fill: c.print,
        stroke: c.printOutline,
        strokeWidth: 7,
        maxWidth: w - 16,
      }),
  },

  sponsor: {
    box: [469, 253],
    paint: async (ctx, w, h, c) => {
      const img = await loadImage('assets/sponsors/toms-burger.png')
      ctx.drawImage(tinted(img, img.naturalWidth, img.naturalHeight, c.print), 0, 0, w, h)
    },
  },

  escudo: {
    box: [789, 894],
    paint: async (ctx, w, h) => ctx.drawImage(await loadImage('assets/escudo/escudo.png'), 0, 0, w, h),
  },

  shortEscudo: {
    box: [789, 894],
    paint: async (ctx, w, h) => ctx.drawImage(await loadImage('assets/escudo/escudo-512.webp'), 0, 0, w, h),
  },
}

const cache = new Map<KitId, Promise<Record<DecalId, THREE.CanvasTexture>>>()

/** Texturas de todos los calcos de un kit, dibujadas a 1024 px del lado más largo. */
export function decalTextures(kit: KitId, maxAnisotropy = 8): Promise<Record<DecalId, THREE.CanvasTexture>> {
  let p = cache.get(kit)
  if (!p) {
    p = (async () => {
      await fontsReady()
      const c = KIT_COLORS[kit]
      const entries = await Promise.all(
        DECALS.map(async ({ id, size }) => {
          const { box, paint } = PAINTERS[id]
          // El lienzo toma la proporción del calco; el diseño se centra adentro sin deformarse.
          const { canvas, ctx } = makeCanvas(size[0], size[1], 1024)
          const scale = Math.min(size[0] / box[0], size[1] / box[1])
          const k = canvas.width / size[0]
          ctx.setTransform(k * scale, 0, 0, k * scale, (canvas.width - box[0] * scale * k) / 2, (canvas.height - box[1] * scale * k) / 2)
          await paint(ctx, box[0], box[1], c)
          const tex = new THREE.CanvasTexture(canvas)
          tex.colorSpace = THREE.SRGBColorSpace
          tex.anisotropy = maxAnisotropy
          return [id, tex] as const
        }),
      )
      return Object.fromEntries(entries) as Record<DecalId, THREE.CanvasTexture>
    })()
    cache.set(kit, p)
  }
  return p
}
