import * as THREE from 'three'
import { BODY } from '../body'
import { loft, mirrorX, superellipse, type Ring } from '../loft'

export interface SockParts {
  sock: THREE.BufferGeometry
  cuff: THREE.BufferGeometry
  topY: number
}

const TOP_Y = BODY.knee - 0.03
const CUFF_H = 0.06
/** Arranca adentro del botín. */
const BOTTOM_Y = 0.055
const SEGMENTS = 64

const smooth = THREE.MathUtils.smoothstep

// Pantorrilla: [altura, medio ancho, media profundidad, corrimiento z del centro]
const PROFILE: [number, number, number, number][] = [
  [BOTTOM_Y, 0.03, 0.038, 0.004],
  [BODY.ankle + 0.025, 0.031, 0.037, 0],
  [0.15, 0.037, 0.042, -0.002],
  [0.2, 0.043, 0.047, -0.004],
  [BODY.calf, 0.05, 0.055, -0.011],
  [0.41, 0.047, 0.05, -0.008],
  [TOP_Y, 0.046, 0.048, -0.004],
]

/**
 * Tela que se junta sobre el tobillo: arruguitas horizontales que se abren y cierran alrededor de la
 * pierna y se alisan hacia la pantorrilla.
 */
function ankleGather(y: number, t: number): number {
  const fade = smooth(y, 0.075, 0.1) * (1 - smooth(y, 0.17, 0.26))
  const wave = Math.sin(y * 165 + 2.4 * Math.sin(2 * t + 0.7) + 1.3 * Math.cos(3 * t))
  return 0.0017 * fade * wave * (0.6 + 0.4 * Math.sin(t * 2 + 1))
}

function ringAt(y: number, grow = 0, rib = 0): Ring {
  const curve = PROFILE
  let i = 1
  while (i < curve.length - 1 && y > curve[i][0]) i++
  const [y0, rx0, rz0, z0] = curve[i - 1]
  const [y1, rx1, rz1, z1] = curve[i]
  const f = smooth(y, y0, y1)
  const L = THREE.MathUtils.lerp
  // Acanalado fino del tejido, apenas marcado
  return superellipse(BODY.legSpacing, y, L(z0, z1, f), L(rx0, rx1, f) + grow, L(rz0, rz1, f) + grow, 2, SEGMENTS).map((p, j) => {
    const t = (j / SEGMENTS) * Math.PI * 2
    const out = new THREE.Vector3(p.x - BODY.legSpacing, 0, p.z - L(z0, z1, f)).normalize()
    return p.addScaledVector(out, rib * Math.cos(t * 32) + (rib === 0 && grow === 0 ? ankleGather(y, t) : 0))
  })
}

export function buildSock(side: 'L' | 'R'): SockParts {
  const rings: Ring[] = []
  const steps = 24
  const bodyTop = TOP_Y - 0.01
  for (let i = 0; i <= steps; i++) rings.push(ringAt(BOTTOM_Y + ((bodyTop - BOTTOM_Y) * i) / steps))

  // Puño doblado: la tela sube, da vuelta arriba y baja por adentro, con su espesor
  const g = 0.004
  const cuffBottom = TOP_Y - CUFF_H
  const cuff: Ring[] = [
    ringAt(cuffBottom + 0.012, g - 0.002, 0).map((p) => p.setY(cuffBottom + 0.012)),
    ringAt(cuffBottom, g + 0.0005, 0).map((p) => p.setY(cuffBottom)),
    ...[0.25, 0.5, 0.75].map((f) => ringAt(cuffBottom + CUFF_H * f, g + 0.001, 0)),
    ringAt(TOP_Y - 0.002, g, 0),
    ringAt(TOP_Y, g - 0.003, 0).map((p) => p.setY(TOP_Y)),
    ringAt(TOP_Y - 0.015, -0.002),
  ]

  const flip = (list: Ring[]) => (side === 'L' ? list.map(mirrorX) : list)
  return { sock: loft(flip(rings), { v: 'arc' }), cuff: loft(flip(cuff)), topY: TOP_Y }
}
