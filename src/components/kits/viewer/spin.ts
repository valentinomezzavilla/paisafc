import type * as THREE from 'three'

export interface SpinState {
  angle: number
  /** rad/ms */
  velocity: number
}

/** Fricción: la velocidad se multiplica por esto cada 16 ms. */
const FRICTION = 0.92
const STOP_BELOW = 0.0005

/** Un paso del giro con inercia. `dt` en ms; el frenado es el mismo a cualquier cantidad de cuadros por segundo. */
export function spinStep(s: SpinState, dt: number, reduced: boolean): SpinState {
  if (reduced) return { angle: s.angle, velocity: 0 }
  const velocity = s.velocity * FRICTION ** (dt / 16)
  // Ángulo con la velocidad media del paso
  const angle = s.angle + ((s.velocity + velocity) / 2) * dt
  return { angle, velocity: Math.abs(velocity) < STOP_BELOW ? 0 : velocity }
}

/** Diferencia de ángulo por el camino corto, en (-π, π]. */
export function shortestTurn(from: number, to: number): number {
  // d = (diferencia + π) llevada a [0, 2π)
  const d = (((to - from) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)
  return d === 0 ? Math.PI : d - Math.PI
}

/** Un detalle se ve (y se puede tocar) si su normal mira hacia la cámara. Ambos vectores normalizados. */
export function isFacing(normal: THREE.Vector3, toCamera: THREE.Vector3): boolean {
  return normal.dot(toCamera) > 0.15
}
