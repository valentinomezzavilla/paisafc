import * as THREE from 'three'
import { BODY } from '../body'
import { loft, mirrorX, superellipse, type Ring } from '../loft'

export interface ShortsParts {
  legL: THREE.BufferGeometry
  legR: THREE.BufferGeometry
  waistband: THREE.BufferGeometry
  stripeL: THREE.BufferGeometry
  stripeR: THREE.BufferGeometry
  topY: number
  hemY: number
}

const TOP_Y = BODY.waist - 0.02
// Como en el mockup: el short llega casi a la rodilla.
const HEM_Y = BODY.knee + 0.045
/** Puntos del arco exterior de cada pierna (del frente a la espalda) y de la costura interior. */
const OUTER = 48
const INNER = 16
const SEGMENTS = OUTER + INNER
const HEM_THICKNESS = 0.0035
const STRIPE_W = 0.018

const smooth = THREE.MathUtils.smoothstep

// Cadera: [altura, medio ancho, media profundidad] del contorno completo, centrado en x = 0.
const HIP_PROFILE: [number, number, number][] = [
  [TOP_Y, 0.174, 0.118],
  [BODY.hip, 0.181, 0.124],
  [BODY.crotch, 0.19, 0.13],
]
// Pierna: [altura, centro x, medio ancho, media profundidad]
const LEG_PROFILE: [number, number, number, number][] = [
  [BODY.crotch - 0.07, BODY.legSpacing - 0.004, 0.1, 0.104],
  [HEM_Y, BODY.legSpacing + 0.004, 0.101, 0.104],
]

const lerpProfile = <T extends number[]>(rows: T[], y: number): T => {
  if (y >= rows[0][0]) return rows[0]
  for (let i = 1; i < rows.length; i++) {
    if (y >= rows[i][0]) {
      const f = (rows[i - 1][0] - y) / (rows[i - 1][0] - rows[i][0])
      return rows[i].map((v, k) => THREE.MathUtils.lerp(rows[i - 1][k], v, smooth(f, 0, 1))) as T
    }
  }
  return rows[rows.length - 1]
}

/** Ángulo (0 = frente, avanza hacia +x) del punto j de la pierna derecha. */
const angleOf = (j: number) => (j <= OUTER ? (j / OUTER) * Math.PI : Math.PI + ((j - OUTER) / INNER) * Math.PI)

/**
 * Anillo de la pierna derecha a la altura y. Arriba de la entrepierna es una "D": media cadera por
 * afuera y la costura central plana en x = 0 (ahí se toca con la otra pierna). Abajo es un óvalo.
 */
function legRing(y: number): Ring {
  const [, hx, hz] = lerpProfile(HIP_PROFILE, Math.max(y, BODY.crotch))
  const [, cx, lx, lz] = lerpProfile(LEG_PROFILE, Math.min(y, LEG_PROFILE[0][0]))
  const b = 1 - smooth(y, LEG_PROFILE[0][0], BODY.crotch)
  return Array.from({ length: SEGMENTS }, (_, j) => {
    const t = angleOf(j)
    const d =
      j <= OUTER
        ? new THREE.Vector3(hx * Math.sin(t), y, hz * Math.cos(t))
        : new THREE.Vector3(0, y, THREE.MathUtils.lerp(-hz, hz, (j - OUTER) / INNER))
    const o = new THREE.Vector3(cx + lx * Math.sin(t), y, lz * Math.cos(t))
    const p = d.lerp(o, b)
    // Caída de la tela: pliegues verticales suaves que se abren hacia el ruedo
    const fold = 0.0028 * (1 - smooth(y, HEM_Y, BODY.crotch)) * Math.sin(5 * t + 1.7) * (j <= OUTER ? 1 : 0.4)
    const out = new THREE.Vector3(p.x - cx * b, 0, p.z).normalize()
    return p.addScaledVector(out, fold)
  })
}

function legRings(): Ring[] {
  const rings: Ring[] = []
  const steps = 36
  for (let i = 0; i <= steps; i++) rings.push(legRing(HEM_Y + ((TOP_Y - HEM_Y) * i) / steps))
  // Dobladillo del ruedo hacia adentro
  const hem = rings[0]
  const center = hem.reduce((c, p) => c.add(p), new THREE.Vector3()).divideScalar(hem.length)
  const inset = (d: number, y: number) =>
    hem.map((p) => {
      const out = new THREE.Vector3(p.x - center.x, 0, p.z - center.z).normalize()
      return p.clone().addScaledVector(out, -d).setY(y)
    })
  return [inset(HEM_THICKNESS, HEM_Y + 0.012), inset(HEM_THICKNESS, HEM_Y + 0.0012), inset(HEM_THICKNESS / 2, HEM_Y), ...rings.slice(1)]
}

/** Franja lateral: una tira sobre la cara externa de la pierna (punto `side` de cada anillo), apenas levantada. */
function stripe(rings: Ring[], side: number): THREE.BufferGeometry {
  const strips = rings.slice(3).map((ring) => {
    const p = ring[side]
    const half = STRIPE_W / 2
    const center = ring.reduce((c, q) => c.add(q), new THREE.Vector3()).divideScalar(ring.length)
    const out = new THREE.Vector3(p.x - center.x, 0, p.z - center.z).normalize()
    const along = new THREE.Vector3(0, 1, 0).cross(out).normalize()
    const lift = out.clone().multiplyScalar(0.0012)
    return [p.clone().add(lift).addScaledVector(along, -half), p.clone().add(lift).addScaledVector(along, half)]
  })
  return loft(strips, { closed: false })
}

export function buildShorts(): ShortsParts {
  const right = legRings()
  const left = right.map(mirrorX)

  // Cintura elástica: una banda completa, apenas más ancha que la cadera
  const band = [TOP_Y - 0.035, TOP_Y - 0.001].map((y) => superellipse(0, y, 0, 0.176, 0.12, 2.3, 96))

  return {
    legL: loft(left, { v: 'arc' }),
    legR: loft(right, { v: 'arc' }),
    waistband: loft(band),
    // mirrorX invierte el orden de los puntos: el costado externo de la izquierda es SEGMENTS - OUTER / 2
    stripeL: stripe(left, SEGMENTS - OUTER / 2),
    stripeR: stripe(right, OUTER / 2),
    topY: TOP_Y,
    hemY: HEM_Y,
  }
}
