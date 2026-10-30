import * as THREE from 'three'
import { BODY } from '../body'

/** Contorno del escote: un óvalo apenas corrido hacia atrás, con la V del cuello polo adelante. */
export const NECK = {
  rx: BODY.neckRadius + 0.012,
  rz: BODY.neckRadius + 0.004,
  cz: -0.012,
  /** Profundidad de la V, medida desde la base del cuello. */
  vDepth: 0.09,
  /** Media apertura angular de la V (radianes desde el frente). */
  vHalfAngle: 0.62,
} as const

/** Punto del escote para el ángulo t (0 = frente, avanza hacia +x). */
export function neckPoint(t: number): THREE.Vector3 {
  const a = Math.atan2(Math.sin(t), Math.cos(t)) // -π..π, 0 adelante
  const inV = Math.max(0, 1 - Math.abs(a) / NECK.vHalfAngle)
  const x = NECK.rx * Math.sin(t)
  // La V se abre sobre el pecho: los bordes bajan y se adelantan hasta apoyarse en la tela.
  const z = NECK.cz + NECK.rz * Math.cos(t) + inV * 0.055
  const y = BODY.neckBase - NECK.vDepth * inV ** 1.15
  return new THREE.Vector3(x * (1 - inV * 0.65), y, z)
}
