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

export const TORSO_SEGMENTS = 128
export const SLEEVE_SEGMENTS = 48

// Como en el mockup: la camiseta es larga, cubre la cintura del short y termina sobre la cadera.
export const HEM_Y = BODY.crotch + 0.05
/** Altura del hombro donde termina el torso y empieza el canesú (a los costados). */
const SHOULDER_Y = BODY.shoulder - 0.006
/** Adelante el canesú arranca más abajo, para que el pecho suba derecho hasta la V. */
const FRONT_DROP = 0.028
/** Espesor de la tela en los dobladillos. */
const HEM_THICKNESS = 0.0035

// Contorno del torso: [altura, medio ancho, media profundidad]. Corte recto, apenas suelto.
const TORSO_PROFILE: [number, number, number][] = [
  [HEM_Y, 0.188, 0.133],
  [0.92, 0.184, 0.13],
  [BODY.waist, 0.177, 0.124],
  [1.14, 0.182, 0.128],
  [1.24, 0.189, 0.132],
  [1.32, 0.192, 0.131],
  [1.39, 0.19, 0.125],
  [1.44, 0.186, 0.118],
  [SHOULDER_Y, 0.176, 0.108],
]
// Casi una elipse: con 2,5 el torso se veía como un cajón
const TORSO_N = 2.18

// Manga: sale del hombro a 38° de la vertical, abierta como en el mockup.
export const SLEEVE_ANGLE = THREE.MathUtils.degToRad(38)
export const SLEEVE_LENGTH = 0.235
const SLEEVE_ROOT_R = 0.08
const SLEEVE_CUFF_R = 0.064
const SLEEVE_EMBED = 0.03

const smooth = THREE.MathUtils.smoothstep

/** Generador pseudoaleatorio con semilla: los pliegues son siempre los mismos entre horneados. */
function rng(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Un pliegue: una línea en el plano (arco, altura) con perfil de loma y valle a los lados.
 * `arc` es la distancia por el perímetro desde el frente (+ hacia +x).
 */
interface Crease {
  arc: number
  y: number
  /** Dirección de la línea, en radianes (0 = horizontal, hacia el lado de crecimiento del arco). */
  angle: number
  length: number
  /** Altura de la loma en metros (con signo: hacia afuera o hacia adentro). */
  amp: number
  /** Ancho del pliegue (desviación estándar, metros). */
  sigma: number
}

/** Radio medio del torso para pasar de ángulo a metros por el perímetro. */
const ARM_R = 0.155
const SIDE_ARC = (Math.PI / 2) * ARM_R

/**
 * Arrugas del torso, armadas como lo hace la tela de verdad: tirones desde la axila hacia el pecho y la
 * cintura, tela que se junta sobre la cintura a los costados y caída vertical abajo. Cada lado usa su
 * propia semilla: nunca son espejo exacto.
 */
function buildCreases(): Crease[] {
  const out: Crease[] = []
  for (const side of [1, -1] as const) {
    const rand = rng(side === 1 ? 7 : 19)
    const j = (v: number, spread: number) => v + (rand() - 0.5) * spread
    // Una línea que sale de (arc, y) hacia el frente (fx > 0) y hacia arriba (fy > 0)
    const line = (arc: number, y: number, fx: number, fy: number, length: number, amp: number, sigma: number): Crease => ({
      arc,
      y,
      // En el lado +x el frente queda hacia el arco decreciente; en el -x, hacia el creciente
      angle: Math.atan2(fy, -side * fx),
      length,
      amp,
      sigma,
    })
    // Tirones que bajan en abanico desde la axila hacia el frente y la cintura
    for (const [dArc, dy, fx, fy, len, amp] of [
      [0.0, 0.0, 0.35, -1, 0.15, 0.0026],
      [0.012, 0.01, 0.55, -1, 0.17, 0.0022],
      [0.03, 0.0, 0.9, -1, 0.12, 0.002],
      [-0.015, 0.02, 0.15, -1, 0.14, 0.0019],
      [0.045, 0.015, 1.4, -1, 0.09, 0.0016],
    ] as const) {
      out.push(line(side * SIDE_ARC - side * j(dArc, 0.01), 1.265 + j(dy, 0.012), fx, fy, j(len, 0.03), j(amp, 0.0006), j(0.0092, 0.002)))
    }
    // Hacia el pecho: casi horizontales
    for (const [dArc, dy, fx, fy, len, amp] of [
      [0.02, 0.03, 1, 0.12, 0.09, 0.0016],
      [0.035, -0.012, 1, 0.3, 0.08, 0.0014],
    ] as const) {
      out.push(line(side * SIDE_ARC - side * j(dArc, 0.01), 1.26 + dy, fx, fy, j(len, 0.02), j(amp, 0.0005), j(0.0065, 0.0015)))
    }
    // Tela que se junta sobre la cintura, a los costados
    for (let k = 0; k < 3; k++) {
      out.push(line(side * j(SIDE_ARC - 0.012 + k * 0.014, 0.012), 0.99 + k * 0.026 + j(0, 0.01), 1, j(0.08, 0.3), j(0.1, 0.03), j(0.0017, 0.0006) * (k === 1 ? -1 : 1), j(0.009, 0.002)))
    }
    // Caídas verticales sobre la parte baja, de a pares
    for (let k = 0; k < 5; k++) {
      out.push(line(side * j(0.09 + k * 0.05, 0.03), j(0.96, 0.05), j(0, 0.25), 1, j(0.14, 0.05), j(0.0018, 0.0008) * (rand() > 0.5 ? 1 : -1), j(0.011, 0.003)))
    }
  }
  return out
}
const CREASES = buildCreases()
/** Cuánto se marcan las arrugas en conjunto (1 = como se armaron). */
const CREASE_GAIN = 1.35

/** Una loma con su valle (derivada de una gaussiana) alrededor de la línea del pliegue. */
function creaseAt(c: Crease, arc: number, y: number): number {
  const dx = arc - c.arc
  const dy = y - c.y
  const cos = Math.cos(c.angle)
  const sin = Math.sin(c.angle)
  const along = dx * cos + dy * sin
  const perp = -dx * sin + dy * cos
  // La arruga nace en un extremo y se desvanece hacia el otro
  const u = along / c.length
  if (u < -0.15 || u > 1.15) return 0
  const bell = Math.sin(Math.PI * THREE.MathUtils.clamp((u + 0.15) / 1.3, 0, 1)) ** 1.5
  const z = perp / c.sigma
  return c.amp * z * Math.exp(0.5 - 0.5 * z * z) * bell
}

/**
 * Pliegues de la tela del torso: desplazamiento radial en metros. Cada lado tiene arrugas propias.
 */
function torsoFolds(t: number, y: number): number {
  const fadeHem = smooth(y, HEM_Y, HEM_Y + 0.04)
  const fadeTop = 1 - smooth(y, 1.36, SHOULDER_Y)
  // Ángulo con signo (-π, π], 0 adelante
  const ta = Math.atan2(Math.sin(t), Math.cos(t))
  const arc = ta * ARM_R
  let d = 0
  for (const c of CREASES) d += CREASE_GAIN * creaseAt(c, arc, y)
  // Costura lateral: una ranura fina que baja por los dos costados
  const seam = -0.0011 * Math.exp(-(((Math.abs(ta) - Math.PI / 2) * ARM_R) ** 2) / (2 * 0.0026 ** 2))
  d += seam
  // Caída general, de baja frecuencia: la tela no cuelga perfectamente derecha
  const drape = 0.0016 * Math.cos(5 * ta + 0.4) * Math.sin(6 * y + 0.6) + 0.001 * Math.cos(9 * ta - 0.7) * Math.sin(15 * y + 1.3)
  // Vuelo del ruedo
  const hem = 0.0035 * (1 - smooth(y, HEM_Y, HEM_Y + 0.14)) * (0.6 * Math.cos(6 * ta + 0.2) + 0.4 * Math.cos(11 * ta))
  return (d + drape) * fadeHem * fadeTop + hem
}

function torsoRings(): Ring[] {
  const curve = new THREE.CatmullRomCurve3(TORSO_PROFILE.map(([y, rx, rz]) => new THREE.Vector3(y, rx, rz)))
  const steps = 58
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
          THREE.MathUtils.lerp(p.y, n.y, 1 - (1 - s) ** 1.35),
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
  const steps = 18
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
