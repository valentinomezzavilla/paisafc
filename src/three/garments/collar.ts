import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { loft, type Ring } from '../loft'
import { NECK, neckPoint } from './neck'

const PATH_SEGMENTS = 110
/**
 * Hueco adelante entre las dos puntas del cuello (radianes a cada lado del frente). Las solapas terminan
 * donde empieza la V del escote, como en el mockup; de ahí para abajo queda solo el vivo de la V.
 */
const FRONT_GAP = 0.56
/** Hasta dónde llega el vivo de la V (radianes desde el frente). */
const V_END = NECK.vHalfAngle + 0.02
/** Separación entre la tela del cuello y la camiseta de abajo. */
const CLEARANCE = 0.0014
/** Espesor del tejido del cuello. */
const THICK = 0.0026
const TRIM_W = 0.0058
/** Ancho del vivo que remata la V. */
const V_TRIM_W = 0.0034

const smooth = THREE.MathUtils.smoothstep
const lerp = THREE.MathUtils.lerp

/**
 * Proyecta hacia afuera desde el eje del cuello hasta la superficie del torso: devuelve la distancia
 * horizontal a la tela en esa dirección y altura.
 */
function surfaceProbe(body: THREE.BufferGeometry) {
  const mesh = new THREE.Mesh(body, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }))
  mesh.updateMatrixWorld()
  const ray = new THREE.Raycaster()
  return (p: THREE.Vector3) => {
    const origin = new THREE.Vector3(0, p.y, NECK.cz)
    const dir = new THREE.Vector3(p.x, 0, p.z - NECK.cz).normalize()
    ray.set(origin, dir)
    const hits = ray.intersectObject(mesh)
    return hits.length ? hits[hits.length - 1].distance : 0
  }
}

/** Empuja el punto hacia afuera si quedó adentro de la tela. */
function keepOutside(p: THREE.Vector3, probe: (p: THREE.Vector3) => number, clearance: number) {
  const flat = new THREE.Vector3(p.x, 0, p.z - NECK.cz)
  const min = probe(p) + clearance
  if (flat.length() < min) flat.setLength(min)
  return new THREE.Vector3(flat.x, p.y, flat.z + NECK.cz)
}

/**
 * Punto de la solapa sobre la tela del cuerpo: se apoya a `CLEARANCE` y se levanta `lift` según la normal
 * del cuerpo en ese lugar. Con una separación horizontal, sobre el hombro inclinado las dos caras del
 * tejido casi coinciden en altura y se pisan.
 */
function onSurface(p: THREE.Vector3, probe: (p: THREE.Vector3) => number, lift: number): THREE.Vector3 {
  const base = keepOutside(p, probe, CLEARANCE)
  if (lift === 0) return base
  const d = 0.004
  const at = (y: number) => probe(new THREE.Vector3(base.x, y, base.z))
  const slope = (at(base.y + d) - at(base.y - d)) / (2 * d)
  const out = new THREE.Vector3(base.x, 0, base.z - NECK.cz).normalize()
  // Cuerpo de radio r(y): la normal es horizontal hacia afuera menos la pendiente por la vertical
  const normal = out.addScaledVector(new THREE.Vector3(0, 1, 0), -slope).normalize()
  return base.addScaledVector(normal, lift)
}

/** Medidas de la solapa según el ángulo alrededor del cuello (0 = frente, π = atrás). */
function flapShape(a: number) {
  // 0 de costado, 1 en la nuca
  const back = smooth(a, 1.5, 2.8)
  // 1 en las puntas delanteras, 0 a un tramo de ahí
  const front = 1 - smooth(a, FRONT_GAP, FRONT_GAP + 0.7)
  return {
    // Pie de cuello: bajo de costado, más alto en la nuca, donde se ve la cara interna
    stand: lerp(0.0075, 0.0215, back) * (1 - 0.35 * front),
    // Una banda de ancho casi parejo: algo más angosta en la nuca
    reach: lerp(0.064, 0.044, back) + 0.005 * front,
    // Cuánto baja: sobre el hombro sigue la pendiente
    drop: lerp(0.52, 0.66, front),
  }
}

/**
 * Cuello polo retro: un pie de cuello alrededor del escote y una solapa de tejido acanalado que se
 * dobla y apoya sobre los hombros. Cada solapa es una banda con espesor y borde redondeado; adelante
 * las dos terminan arriba de la V. Devuelve además el ribete: franja sobre el borde exterior de la
 * solapa y vivo a lo largo de toda la V.
 */
export function buildCollar(body: THREE.BufferGeometry): { collar: THREE.BufferGeometry; trim: THREE.BufferGeometry } {
  const probe = surfaceProbe(body)
  const profiles: Ring[] = []
  const edgeTrims: Ring[] = []
  const up = new THREE.Vector3(0, 1, 0)

  for (let i = 0; i <= PATH_SEGMENTS; i++) {
    const t = FRONT_GAP + (i / PATH_SEGMENTS) * (Math.PI * 2 - 2 * FRONT_GAP)
    const a = Math.abs(Math.atan2(Math.sin(t), Math.cos(t)))
    const side = Math.sin(t) >= 0 ? 1 : -1
    const { stand, reach, drop } = flapShape(a)

    const base = neckPoint(t)
    const out = new THREE.Vector3(base.x, 0, base.z - NECK.cz).normalize()

    // Pie de cuello (cara interna) y doblez redondeado
    const lean = 0.0025 * smooth(a, 1.8, 2.8)
    const p0 = base.clone().addScaledVector(out, 0.0012)
    const p1 = p0.clone().addScaledVector(up, stand).addScaledVector(out, 0.0012 + lean)
    const r = 0.0044
    const c1 = p1.clone().addScaledVector(up, r * 0.6).addScaledVector(out, r * 0.5)
    const c2 = p1.clone().addScaledVector(up, r * 1.0).addScaledVector(out, r * 1.5)
    const c3 = p1.clone().addScaledVector(up, r * 0.65).addScaledVector(out, r * 2.6)

    // La solapa nunca queda perfectamente plana ni igual de un lado al otro: ondula y el borde se levanta
    const ripple = (f: number) =>
      0.0013 * Math.sin(5.5 * t + f * 3.1 + side * 1.4) * Math.sin(Math.PI * f) + 0.0016 * smooth(f, 0.55, 1) * (0.55 + 0.45 * Math.sin(3 * t + side))
    const edge = base.clone().addScaledVector(out, reach).addScaledVector(up, -reach * drop)

    const fs = [0.22, 0.48, 0.74, 1]
    const rawAt = (f: number) => new THREE.Vector3().lerpVectors(c3, edge, f).addScaledVector(out, 0.0035 * Math.sin(Math.PI * f) * (1 - 0.6 * f))
    const fallAt = (f: number, lift: number) => onSurface(rawAt(f), probe, lift).addScaledVector(up, ripple(f) * (lift > 0 ? 1 : 0.3))
    const top = fs.map((f) => fallAt(f, THICK))
    // Borde libre redondeado: baja de la cara de arriba a la de abajo pasando por afuera
    const tip = top[3]
    const outAtEdge = new THREE.Vector3(tip.x, 0, tip.z - NECK.cz).normalize()
    const rim = [
      tip.clone().addScaledVector(outAtEdge, 0.0007).addScaledVector(up, -THICK * 0.3),
      tip.clone().addScaledVector(outAtEdge, 0.0009).addScaledVector(up, -THICK * 0.7),
    ]
    // Cara de abajo: vuelve hacia el cuello pegada a la camiseta
    const under = [...fs].reverse().map((f) => fallAt(f, 0))
    const neckSide = keepOutside(base.clone().addScaledVector(out, 0.004), probe, CLEARANCE)
    profiles.push([p0, p1, c1, c2, c3, ...top, ...rim, ...under, neckSide])

    // Franja sobre el borde exterior de la solapa, apenas levantada
    const lift = THICK + 0.0011
    const stripeFrom = 1 - Math.min(0.5, TRIM_W / c3.distanceTo(edge))
    const onTop = (f: number) => onSurface(rawAt(f), probe, lift).addScaledVector(up, ripple(f))
    edgeTrims.push([onTop(stripeFrom), onTop(1)])
  }

  // Vivo de la V: franja sobre el borde del escote, de una punta a la otra pasando por el fondo
  const vTrim: Ring[] = []
  const V_STEPS = 56
  for (let i = 0; i <= V_STEPS; i++) {
    const t = -V_END + (2 * V_END * i) / V_STEPS
    const base = neckPoint(t)
    const out = new THREE.Vector3(base.x, 0, base.z - NECK.cz).normalize()
    const inner = base.clone().addScaledVector(out, 0.0004)
    const outer = base.clone().addScaledVector(up, -V_TRIM_W).addScaledVector(out, 0.0004)
    vTrim.push([keepOutside(outer, probe, 0.0012), keepOutside(inner, probe, 0.0012)])
  }

  const trim = mergeGeometries([loft(edgeTrims, { closed: false }), loft(vTrim, { closed: false })])
  return { collar: loft(profiles, { closed: false }), trim }
}
