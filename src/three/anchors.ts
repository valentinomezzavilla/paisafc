import * as THREE from 'three'
import type { KitGeometry } from './assembly'
import { BODY } from './body'
import { NECK } from './garments/neck'
import { SLEEVE_ANGLE, SLEEVE_LENGTH, sleeveFrame } from './garments/shirt'

/**
 * Dónde va cada cosa sobre la prenda. El modelo mira a +z; el lado derecho del jugador es -x
 * (`sleeveL`, `legL`), como se ve en el mockup.
 */
export type Piece = 'torso' | 'collar' | 'sleeveL' | 'sleeveR' | 'legL' | 'legR'

export interface AnchorSpec {
  piece: Piece
  /**
   * Grados alrededor del eje de la pieza. Torso, cuello y piernas: 0 = frente, 90 = +x.
   * Mangas: 0 = frente, 90 = cara de afuera de la manga.
   */
  angle: number
  /** Torso, cuello y piernas: altura en metros. Mangas: distancia desde el hombro por el eje. */
  y: number
}

export type AnchorId =
  | 'cuello'
  | 'escudo'
  | 'vezza'
  | 'parche'
  | 'punos'
  | 'textura'
  | 'nombre'
  | 'numero'
  | 'sponsor'
  | 'shortEscudo'

export const ANCHORS: Record<AnchorId, AnchorSpec> = {
  cuello: { piece: 'collar', angle: 28, y: 1.49 },
  escudo: { piece: 'torso', angle: 34, y: 1.335 },
  vezza: { piece: 'torso', angle: 0, y: 1.215 },
  parche: { piece: 'sleeveL', angle: 75, y: 0.085 },
  punos: { piece: 'sleeveL', angle: 35, y: SLEEVE_LENGTH - 0.022 },
  textura: { piece: 'torso', angle: -22, y: 1.0 },
  nombre: { piece: 'torso', angle: 180, y: 1.395 },
  numero: { piece: 'torso', angle: 180, y: 1.205 },
  sponsor: { piece: 'torso', angle: 180, y: 1.015 },
  shortEscudo: { piece: 'legL', angle: -28, y: 0.62 },
}

export type DecalId = 'escudo' | 'vezza' | 'parche' | 'nombre' | 'numero' | 'sponsor' | 'shortEscudo'

export interface DecalSpec {
  id: DecalId
  anchor: AnchorId
  /** Ancho y alto en metros. */
  size: [number, number]
}

// Tamaños medidos sobre el mockup, con la camiseta a escala real.
export const DECALS: DecalSpec[] = [
  { id: 'escudo', anchor: 'escudo', size: [0.07, 0.079] },
  { id: 'vezza', anchor: 'vezza', size: [0.17, 0.102] },
  { id: 'parche', anchor: 'parche', size: [0.072, 0.072] },
  { id: 'nombre', anchor: 'nombre', size: [0.27, 0.06] },
  { id: 'numero', anchor: 'numero', size: [0.2, 0.2] },
  { id: 'sponsor', anchor: 'sponsor', size: [0.21, 0.113] },
  { id: 'shortEscudo', anchor: 'shortEscudo', size: [0.048, 0.054] },
]

const meshCache = new WeakMap<THREE.BufferGeometry, THREE.Mesh>()
const probeMaterial = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })

/** Malla (solo para rayos y calcos) de la pieza. */
export function pieceMesh(kit: KitGeometry, piece: Piece): THREE.Mesh {
  const geo = {
    torso: kit.shirt.body,
    collar: kit.shirt.collar,
    sleeveL: kit.shirt.sleeveL,
    sleeveR: kit.shirt.sleeveR,
    legL: kit.shorts.legL,
    legR: kit.shorts.legR,
  }[piece]
  let mesh = meshCache.get(geo)
  if (!mesh) {
    mesh = new THREE.Mesh(geo, probeMaterial)
    mesh.updateMatrixWorld()
    meshCache.set(geo, mesh)
  }
  return mesh
}

/** Origen y dirección del rayo que, desde adentro de la pieza, sale hacia el punto del ancla. */
function probeRay(spec: AnchorSpec): { origin: THREE.Vector3; dir: THREE.Vector3 } {
  const a = THREE.MathUtils.degToRad(spec.angle)
  const horizontal = new THREE.Vector3(Math.sin(a), 0, Math.cos(a))
  switch (spec.piece) {
    case 'torso':
      return { origin: new THREE.Vector3(0, spec.y, 0), dir: horizontal }
    case 'collar':
      return { origin: new THREE.Vector3(0, spec.y, NECK.cz), dir: horizontal }
    case 'legL':
    case 'legR': {
      const x = (spec.piece === 'legL' ? -1 : 1) * BODY.legSpacing
      return { origin: new THREE.Vector3(x, spec.y, 0), dir: horizontal }
    }
    case 'sleeveL':
    case 'sleeveR': {
      const sign = spec.piece === 'sleeveL' ? -1 : 1
      const frame = sleeveFrame(sign)
      // Perpendicular al eje, hacia arriba y afuera: la cara de la manga que se ve de costado
      const outer = new THREE.Vector3(sign * Math.cos(SLEEVE_ANGLE), Math.sin(SLEEVE_ANGLE), 0)
      const front = new THREE.Vector3(0, 0, 1)
      const dir = front.multiplyScalar(Math.cos(a)).addScaledVector(outer, Math.sin(a)).normalize()
      return { origin: frame.center(spec.y), dir }
    }
  }
}

/** Punto y normal sobre la tela para un ancla. */
export function anchorOnSurface(mesh: THREE.Mesh, spec: AnchorSpec): { position: THREE.Vector3; normal: THREE.Vector3 } {
  const { origin, dir } = probeRay(spec)
  const hits = new THREE.Raycaster(origin, dir).intersectObject(mesh)
  if (!hits.length) throw new Error(`El ancla no toca la prenda: ${JSON.stringify(spec)}`)
  const hit = hits[hits.length - 1]
  const normal = hit.face!.normal.clone()
  // La cara puede estar dada vuelta (cuello de doble faz): que mire hacia afuera del rayo
  if (normal.dot(dir) < 0) normal.negate()
  return { position: hit.point.clone(), normal: normal.normalize() }
}

/** Rotación en y del modelo que deja esa normal mirando a la cámara (+z). */
export function facingAngle(normal: THREE.Vector3): number {
  return -Math.atan2(normal.x, normal.z)
}
