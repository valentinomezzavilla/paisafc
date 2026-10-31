import type { KitId } from '../../../data/kits'
import { asset } from '../../../lib/asset'

/**
 * Vuelta completa de cada camiseta renderizada en Blender (scripts/blender/render_jersey.py): una foto
 * cada 10°, empezando de frente. Con el ángulo creciente la camiseta gira hacia la derecha de la pantalla.
 */
export const FRAME_COUNT = 36
export const FRAME_SIZE: [number, number] = [900, 1000]
/** Ancho de la versión liviana, para pantallas chicas. */
export const SMALL_WIDTH = 640

const TAU = Math.PI * 2

/** Foto más cercana a un ángulo (radianes, cualquier valor). */
export function frameIndex(angle: number): number {
  const step = TAU / FRAME_COUNT
  return ((Math.round(angle / step) % FRAME_COUNT) + FRAME_COUNT) % FRAME_COUNT
}

/** Orden de carga: primero el frente y después hacia los dos lados, para poder girar enseguida. */
export function loadOrder(): number[] {
  const order = [0]
  for (let k = 1; order.length < FRAME_COUNT; k++) {
    order.push(k)
    if (order.length < FRAME_COUNT) order.push(FRAME_COUNT - k)
  }
  return order
}

/** La foto cargada más cercana a la pedida (si ninguna está, null). */
export function nearestLoaded(wanted: number, loaded: (i: number) => boolean): number | null {
  for (let d = 0; d <= FRAME_COUNT / 2; d++) {
    const a = (wanted + d) % FRAME_COUNT
    const b = (wanted - d + FRAME_COUNT) % FRAME_COUNT
    if (loaded(a)) return a
    if (loaded(b)) return b
  }
  return null
}

export const frameUrl = (kit: KitId, i: number, small = false) =>
  asset(`assets/kits/blender/${kit}/${String(i).padStart(2, '0')}${small ? '-640' : ''}.webp`)
