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
const COLLAR_Y = BODY.ankle + 0.03

const smooth = THREE.MathUtils.smoothstep

/** Contorno de la huella (pie derecho) para el ángulo t: 0 = punta, avanza hacia +x. */
function footprint(t: number, grow = 0): THREE.Vector3 {
  const u = Math.cos(t) // 1 en la punta, -1 en el talón
  const z = HEEL_Z + (LENGTH / 2) * (1 + u) + grow * u
  // Angosto en el talón, ancho en el metatarso y la punta afinada; el lado interno es más recto
  const outerSide = Math.sin(t) > 0 ? 1 : 0.88
  const half = (0.03 + 0.014 * smooth(u, -0.85, 0.25) - 0.01 * smooth(u, 0.65, 1)) * outerSide + grow
  return new THREE.Vector3(Math.sign(Math.sin(t)) * Math.abs(Math.sin(t)) ** 0.7 * half, 0, z)
}

/** Boca del botín: un óvalo justo alrededor de la media, más bajo adelante que en el talón. */
function collar(t: number): THREE.Vector3 {
  const u = Math.cos(t)
  return new THREE.Vector3(0.045 * Math.sin(t), COLLAR_Y - 0.02 * Math.max(0, u), -0.033 + 0.052 * u)
}

const place = (p: THREE.Vector3) =>
  p.applyAxisAngle(new THREE.Vector3(0, 1, 0), TOE_OUT).add(new THREE.Vector3(BODY.legSpacing, 0, 0))

/**
 * Botín de fútbol bajo. Cada punto de la huella sube por el lateral y cruza por arriba hasta la boca:
 * adelante la puntera es baja y la capellada larga; atrás el talón sube derecho.
 */
export function buildBoot(side: 'L' | 'R'): BootParts {
  const steps = 22
  const rings: Ring[] = []
  for (let i = 0; i <= steps; i++) {
    const s = i / steps
    rings.push(
      Array.from({ length: SEGMENTS }, (_, j) => {
        const t = (j / SEGMENTS) * Math.PI * 2
        const u = Math.cos(t)
        const start = footprint(t).setY(SOLE_H)
        const end = collar(t)
        // Lateral: sube casi derecho (bajo en la puntera, alto en el talón); después cruza por arriba
        // hasta la boca, con la capellada apenas abombada.
        const wall = THREE.MathUtils.lerp(0.07, 0.024, smooth(u, -0.7, 0.85))
        const top = start.clone().lerpVectors(start, end, 0.06).setY(Math.min(SOLE_H + wall, end.y))
        const p = new THREE.Vector3()
        if (s < 0.35) p.lerpVectors(start, top, smooth(s / 0.35, 0, 1) * 0.5 + (s / 0.35) * 0.5)
        else {
          const ctrl = top.clone().lerp(end, 0.4).setY(Math.max(top.y, end.y - 0.02) + 0.008)
          new THREE.QuadraticBezierCurve3(top, ctrl, end).getPoint((s - 0.35) / 0.65, p)
        }
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
