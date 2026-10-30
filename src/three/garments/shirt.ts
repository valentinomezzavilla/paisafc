import * as THREE from 'three'
import { BODY } from '../body'
import { loft, superellipse, tubeRing, type Ring } from '../loft'
import { buildCollar } from './collar'
import { neckPoint } from './neck'

export interface ShirtParts {
  body: THREE.BufferGeometry
  sleeveL: THREE.BufferGeometry
  sleeveR: THREE.BufferGeometry
  collar: THREE.BufferGeometry
  collarTrim: THREE.BufferGeometry
  /** Franja del puño más cerca del hombro… */
  cuffTrimL: THREE.BufferGeometry
  cuffTrimR: THREE.BufferGeometry
  /** …y la más cerca del borde. */
  cuffTrim2L: THREE.BufferGeometry
  cuffTrim2R: THREE.BufferGeometry
  hemY: number
}

export const TORSO_SEGMENTS = 96
export const SLEEVE_SEGMENTS = 48

// Como en el mockup: la camiseta termina sobre la cadera y deja ver bien el short.
const HEM_Y = BODY.crotch + 0.07
/** Altura del hombro donde termina el torso y empieza el canesú (a los costados). */
const SHOULDER_Y = BODY.shoulder - 0.015
/** Adelante el canesú arranca más abajo, para que el pecho suba derecho hasta la V. */
const FRONT_DROP = 0.085
/** Espesor de la tela en los dobladillos. */
const HEM_THICKNESS = 0.0035

// Contorno del torso: [altura, medio ancho, media profundidad]. Corte recto, apenas suelto.
const TORSO_PROFILE: [number, number, number][] = [
  [HEM_Y, 0.199, 0.136],
  [0.93, 0.196, 0.134],
  [0.985, 0.192, 0.131],
  [BODY.waist, 0.189, 0.129],
  [1.15, 0.192, 0.132],
  [1.25, 0.197, 0.136],
  [1.33, 0.2, 0.134],
  [1.41, 0.199, 0.126],
  [SHOULDER_Y, 0.196, 0.114],
]
const TORSO_N = 2.5

// Manga: sale del hombro a 32° de la vertical.
export const SLEEVE_ANGLE = THREE.MathUtils.degToRad(32)
export const SLEEVE_LENGTH = 0.235
const SLEEVE_ROOT_R = 0.08
const SLEEVE_CUFF_R = 0.064
const SLEEVE_EMBED = 0.03

const smooth = THREE.MathUtils.smoothstep

/**
 * Pliegues de la tela del torso: desplazamiento radial en metros. Solo términos pares en t (cos, |sin|),
 * así los dos costados quedan iguales.
 */
function torsoFolds(t: number, y: number): number {
  const fadeHem = smooth(y, HEM_Y, HEM_Y + 0.05)
  const fadeTop = 1 - smooth(y, 1.36, SHOULDER_Y)
  const side = Math.abs(Math.sin(t)) ** 5
  // Caída general, de baja frecuencia
  const drape = 0.0022 * Math.cos(5 * t) * Math.sin(7 * y + 0.6) + 0.0012 * Math.cos(11 * t) * Math.sin(17 * y)
  // Arrugas en abanico que bajan desde la axila
  const armpit = 0.0026 * side * smooth(y, 1.14, 1.25) * (1 - smooth(y, 1.27, 1.33)) * Math.sin(40 * (y + 0.04 * Math.cos(t)))
  // Ondas suaves sobre la cintura, a los costados
  const waist = 0.003 * side * smooth(y, 0.9, 0.97) * (1 - smooth(y, 1.05, 1.12)) * Math.sin(42 * y + 1.1)
  // Vuelo del ruedo
  const hem = 0.0035 * (1 - smooth(y, HEM_Y, HEM_Y + 0.12)) * Math.cos(6 * t)
  return (drape + armpit + waist) * fadeHem * fadeTop + hem
}

function torsoRings(): Ring[] {
  const curve = new THREE.CatmullRomCurve3(TORSO_PROFILE.map(([y, rx, rz]) => new THREE.Vector3(y, rx, rz)))
  const steps = 44
  const base: Ring[] = []
  for (let i = 0; i <= steps; i++) {
    const [y, rx, rz] = curve.getPoint(i / steps).toArray()
    base.push(
      superellipse(0, y, 0, rx, rz, TORSO_N, TORSO_SEGMENTS).map((p, j) => {
        const t = (j / TORSO_SEGMENTS) * Math.PI * 2
        // Adelante el torso termina más abajo: se comprimen las alturas de esa columna.
        const top = SHOULDER_Y - FRONT_DROP * Math.max(0, Math.cos(t)) ** 2
        const yy = HEM_Y + ((y - HEM_Y) * (top - HEM_Y)) / (SHOULDER_Y - HEM_Y)
        const out = new THREE.Vector3(p.x, 0, p.z).normalize()
        return new THREE.Vector3(p.x, yy, p.z).addScaledVector(out, torsoFolds(t, y))
      }),
    )
  }

  // Dobladillo del ruedo: la tela da vuelta hacia adentro con su espesor
  const inset = (ring: Ring, d: number, y: number) =>
    ring.map((p) => {
      const out = new THREE.Vector3(p.x, 0, p.z).normalize()
      return p.clone().addScaledVector(out, -d).setY(y)
    })
  const hem = base[0]
  const rings = [
    inset(hem, HEM_THICKNESS, HEM_Y + 0.012),
    inset(hem, HEM_THICKNESS, HEM_Y + 0.0012),
    inset(hem, HEM_THICKNESS / 2, HEM_Y),
    ...base.slice(1),
  ]

  // Canesú: del hombro al escote
  const shoulder = base[base.length - 1]
  const neck = Array.from({ length: TORSO_SEGMENTS }, (_, j) => neckPoint((j / TORSO_SEGMENTS) * Math.PI * 2))
  const yokeSteps = 10
  for (let k = 1; k <= yokeSteps; k++) {
    const s = k / yokeSteps
    rings.push(
      shoulder.map((p, j) => {
        const n = neck[j]
        return new THREE.Vector3(
          THREE.MathUtils.lerp(p.x, n.x, s),
          THREE.MathUtils.lerp(p.y, n.y, s ** 0.9),
          THREE.MathUtils.lerp(p.z, n.z, s),
        )
      }),
    )
  }
  return rings
}

export interface SleeveFrame {
  axis: THREE.Vector3
  /** Centro del anillo a distancia s del hombro (s < 0: metido en el torso). */
  center: (s: number) => THREE.Vector3
  radius: (s: number) => number
  offset: (s: number) => (t: number) => number
}

export function sleeveFrame(sign: 1 | -1): SleeveFrame {
  const axis = new THREE.Vector3(sign * Math.sin(SLEEVE_ANGLE), -Math.cos(SLEEVE_ANGLE), 0)
  // Perpendicular hacia arriba y afuera: de ahí sale la costura del hombro
  const up = new THREE.Vector3(sign * Math.cos(SLEEVE_ANGLE), Math.sin(SLEEVE_ANGLE), 0)
  const shoulderPoint = new THREE.Vector3(sign * TORSO_PROFILE[TORSO_PROFILE.length - 1][1], SHOULDER_Y + 0.004, 0)
  const origin = shoulderPoint.addScaledVector(up, -SLEEVE_ROOT_R)
  const radius = (s: number) => {
    const u = THREE.MathUtils.clamp(s / SLEEVE_LENGTH, 0, 1)
    return THREE.MathUtils.lerp(SLEEVE_ROOT_R, SLEEVE_CUFF_R, u ** 0.8) + 0.003 * Math.sin(Math.PI * u)
  }
  // Pliegues diagonales que salen de la axila, más marcados abajo de la manga.
  // En la manga derecha sin(t) = 1 apunta a la axila; la izquierda es su espejo con t → -t.
  const offset = (s: number) => (t: number) => {
    const tt = sign * t
    const under = Math.max(0, Math.sin(tt)) ** 2
    const u = THREE.MathUtils.clamp(s / SLEEVE_LENGTH, 0, 1)
    const fade = smooth(s, 0, 0.03) * (1 - smooth(u, 0.85, 1))
    return fade * (0.004 * under * Math.sin(38 * s + 3 * Math.cos(tt)) + 0.0014 * Math.sin(4 * tt + 20 * s))
  }
  // La parte metida en el torso entra hacia el cuerpo (no sube por el eje), así no asoma sobre el hombro.
  const inward = new THREE.Vector3(-sign, -0.2, 0).normalize()
  const center = (s: number) => (s >= 0 ? origin.clone().addScaledVector(axis, s) : origin.clone().addScaledVector(inward, -s))
  return { axis, center, radius, offset }
}

function buildSleeve(sign: 1 | -1): { sleeve: THREE.BufferGeometry; trims: [THREE.BufferGeometry, THREE.BufferGeometry] } {
  const f = sleeveFrame(sign)
  const ring = (s: number, dr = 0) => tubeRing(f.center(s), f.axis, f.radius(s) + dr, (f.radius(s) + dr) * 0.93, SLEEVE_SEGMENTS, undefined, f.offset(s))
  const rings: Ring[] = []
  const steps = 22
  for (let i = 0; i <= steps; i++) rings.push(ring(-SLEEVE_EMBED + ((SLEEVE_LENGTH + SLEEVE_EMBED) * i) / steps))
  // Dobladillo del puño
  rings.push(ring(SLEEVE_LENGTH + 0.0012, -HEM_THICKNESS / 2), ring(SLEEVE_LENGTH, -HEM_THICKNESS), ring(SLEEVE_LENGTH - 0.012, -HEM_THICKNESS))

  // Dos franjas finas cerca del puño
  const stripe = (s0: number, w: number) => loft([ring(s0, 0.0011), ring(s0 + w, 0.0011)])
  return { sleeve: loft(rings, { v: 'arc' }), trims: [stripe(SLEEVE_LENGTH - 0.03, 0.006), stripe(SLEEVE_LENGTH - 0.017, 0.006)] }
}

export function buildShirt(): ShirtParts {
  const body = loft(torsoRings(), { v: 'arc' })
  const right = buildSleeve(1)
  const left = buildSleeve(-1)
  const { collar, trim } = buildCollar(body)
  return {
    body,
    sleeveL: left.sleeve,
    sleeveR: right.sleeve,
    collar,
    collarTrim: trim,
    cuffTrimL: left.trims[0],
    cuffTrimR: right.trims[0],
    cuffTrim2L: left.trims[1],
    cuffTrim2R: right.trims[1],
    hemY: HEM_Y,
  }
}
