import * as THREE from 'three'
import { BODY } from '../body'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { loft, mirrorX, type Ring } from '../loft'

export interface BootParts {
  upper: THREE.BufferGeometry
  sole: THREE.BufferGeometry
  /** Tapones debajo de la suela. */
  studs: THREE.BufferGeometry
  /** Cordones cruzando el empeine. */
  laces: THREE.BufferGeometry
}

/** Altura de los tapones: el botín entero se levanta esto, así los tapones apoyan en el piso. */
export const STUD_H = 0.011

const SEGMENTS = 72
const SOLE_H = 0.016
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

  // Suela: huella un poco más grande, extruida. La izquierda se arma con la huella espejada (no se
  // escala en -1, que daría vuelta las caras).
  const sign = side === 'L' ? -1 : 1
  const outline = Array.from({ length: SEGMENTS }, (_, j) => {
    const p = place(footprint((j / SEGMENTS) * Math.PI * 2, 0.003))
    return new THREE.Vector2(sign * p.x, p.z)
  })
  const sole = new THREE.ExtrudeGeometry(new THREE.Shape(sign < 0 ? outline.reverse() : outline), {
    depth: SOLE_H,
    bevelEnabled: false,
    curveSegments: 1,
  })
  sole.rotateX(Math.PI / 2)
  sole.translate(0, SOLE_H, 0)

  const upper = loft(side === 'L' ? rings.map(mirrorX) : rings)

  // Todo el botín se levanta la altura de un tapón
  sole.translate(0, STUD_H, 0)
  upper.translate(0, STUD_H, 0)
  return { upper, sole, studs: buildStuds(sign), laces: buildLaces(upper, sign) }
}

/** Tapones: conos truncados repartidos por el antepié (cinco) y el talón (cuatro). */
function buildStuds(sign: number): THREE.BufferGeometry {
  const at = (x: number, u: number) => place(new THREE.Vector3(x, 0, HEEL_Z + LENGTH * u))
  const spots = [
    at(-0.02, 0.86), at(0.021, 0.86), at(0, 0.7), at(-0.024, 0.58), at(0.025, 0.58),
    at(-0.016, 0.14), at(0.017, 0.14), at(-0.014, 0.3), at(0.015, 0.3),
  ]
  const cones = spots.map((p) => {
    const cone = new THREE.CylinderGeometry(0.0042, 0.0068, STUD_H + 0.002, 12, 1)
    cone.translate(sign * p.x, (STUD_H + 0.002) / 2, p.z)
    return cone
  })
  return mergeGeometries(cones)
}

/** Cordones: tubos finos que cruzan el empeine siguiendo la curva de la capellada. */
function buildLaces(upper: THREE.BufferGeometry, sign: number): THREE.BufferGeometry {
  const surface = new THREE.Mesh(upper, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }))
  surface.updateMatrixWorld()
  const ray = new THREE.Raycaster()
  const across = new THREE.Vector3(Math.cos(TOE_OUT), 0, -Math.sin(TOE_OUT))
  const tubes: THREE.BufferGeometry[] = []
  for (let k = 0; k < 6; k++) {
    // De la puntera al cuello del pie, sobre el eje del empeine
    const local = place(new THREE.Vector3(0, 0, HEEL_Z + LENGTH * (0.74 - k * 0.075)))
    const center = new THREE.Vector3(sign * local.x, 0, local.z)
    const points: THREE.Vector3[] = []
    for (let s = -3; s <= 3; s++) {
      const p = center.clone().addScaledVector(across, (s / 3) * 0.0235)
      p.x = center.x + sign * (p.x - center.x)
      ray.set(new THREE.Vector3(p.x, 0.5, p.z), new THREE.Vector3(0, -1, 0))
      const hit = ray.intersectObject(surface)[0]
      if (hit) points.push(new THREE.Vector3(p.x, hit.point.y + 0.0019, p.z))
    }
    if (points.length > 3) tubes.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 10, 0.0017, 6, false))
  }
  return mergeGeometries(tubes)
}

