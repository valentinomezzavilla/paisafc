import * as THREE from 'three'
import { BODY } from '../body'
import { loft, mirrorX, type Ring } from '../loft'

export interface BootParts {
  upper: THREE.BufferGeometry
  sole: THREE.BufferGeometry
}

const SEGMENTS = 72
const SOLE_H = 0.013
const LENGTH = 0.27
/** El tobillo queda sobre el talón: el pie se extiende hacia adelante (+z). */
const HEEL_Z = -0.085
/** La punta abre un poco hacia afuera, como en el mockup. */
const TOE_OUT = THREE.MathUtils.degToRad(7)
const COLLAR_Y = BODY.ankle + 0.035

const smooth = THREE.MathUtils.smoothstep

/** Contorno de la huella (pie derecho) para el ángulo t: 0 = punta, avanza hacia +x. */
function footprint(t: number, grow = 0): THREE.Vector3 {
  const u = Math.cos(t) // 1 en la punta, -1 en el talón
  const z = HEEL_Z + (LENGTH / 2) * (1 + u) + grow * u
  // Más ancho en el metatarso, angosto en el talón; el lado interno es más recto
  const outerSide = Math.sin(t) > 0 ? 1 : 0.9
  const half = (0.036 + 0.017 * smooth(u, -0.9, 0.15) - 0.012 * smooth(u, 0.7, 1)) * outerSide + grow
  return new THREE.Vector3(Math.sign(Math.sin(t)) * Math.abs(Math.sin(t)) ** 0.85 * half, 0, z)
}

/** Boca del botín: un óvalo alrededor de la media. */
function collar(t: number): THREE.Vector3 {
  return new THREE.Vector3(0.045 * Math.sin(t), COLLAR_Y + 0.012 * (1 - Math.cos(t)) * 0.5, 0.012 + 0.05 * Math.cos(t))
}

const place = (p: THREE.Vector3) =>
  p.applyAxisAngle(new THREE.Vector3(0, 1, 0), TOE_OUT).add(new THREE.Vector3(BODY.legSpacing, 0, 0))

/**
 * Botín de fútbol bajo. Cada punto de la huella sube por una curva hasta la boca: adelante pasa por
 * la puntera baja, atrás sube derecho por el talón.
 */
export function buildBoot(side: 'L' | 'R'): BootParts {
  const steps = 18
  const rings: Ring[] = []
  for (let i = 0; i <= steps; i++) {
    const s = i / steps
    rings.push(
      Array.from({ length: SEGMENTS }, (_, j) => {
        const t = (j / SEGMENTS) * Math.PI * 2
        const u = Math.cos(t)
        const start = footprint(t).setY(SOLE_H)
        const end = collar(t)
        // Altura de la capellada en ese punto: puntera baja, talón alto
        const h = THREE.MathUtils.lerp(0.075, 0.042, smooth(u, -0.2, 0.95))
        const ctrl = start.clone().lerp(end, 0.15).setY(SOLE_H + h)
        const p = new THREE.Vector3()
        new THREE.QuadraticBezierCurve3(start, ctrl, end).getPoint(s, p)
        return place(p)
      }),
    )
  }

  // Suela: huella un poco más grande, extruida
  const shape = new THREE.Shape(
    Array.from({ length: SEGMENTS }, (_, j) => {
      const p = footprint((j / SEGMENTS) * Math.PI * 2, 0.003)
      return new THREE.Vector2(p.x, p.z)
    }),
  )
  const sole = new THREE.ExtrudeGeometry(shape, { depth: SOLE_H, bevelEnabled: false, curveSegments: 1 })
  sole.rotateX(Math.PI / 2)
  sole.translate(0, SOLE_H, 0)
  sole.rotateY(TOE_OUT)
  sole.translate(BODY.legSpacing, 0, 0)
  if (side === 'L') sole.scale(-1, 1, 1)

  const upper = loft(side === 'L' ? rings.map(mirrorX) : rings)
  return { upper, sole: side === 'L' ? flipWinding(sole) : sole }
}

/** scale(-1) invierte las caras: se reordenan los índices para que vuelvan a mirar hacia afuera. */
function flipWinding(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo
  const pos = g.getAttribute('position')
  for (let i = 0; i < pos.count; i += 3) {
    for (let k = 0; k < 3; k++) {
      const a = pos.getComponent(i + 1, k)
      pos.setComponent(i + 1, k, pos.getComponent(i + 2, k))
      pos.setComponent(i + 2, k, a)
    }
  }
  g.computeVertexNormals()
  return g
}
