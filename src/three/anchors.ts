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
  cuello: { piece: 'collar', angle: 44, y: 1.512 },
  escudo: { piece: 'torso', angle: 40, y: 1.335 },
  vezza: { piece: 'torso', angle: 0, y: 1.205 },
  parche: { piece: 'sleeveL', angle: 48, y: 0.105 },
  punos: { piece: 'sleeveL', angle: 35, y: SLEEVE_LENGTH - 0.022 },
  textura: { piece: 'torso', angle: -22, y: 1.0 },
  nombre: { piece: 'torso', angle: 180, y: 1.385 },
  numero: { piece: 'torso', angle: 180, y: 1.21 },
  sponsor: { piece: 'torso', angle: 180, y: 1.0 },
  shortEscudo: { piece: 'legL', angle: -28, y: 0.62 },
}

export type DecalId = 'escudo' | 'vezza' | 'parche' | 'nombre' | 'numero' | 'sponsor' | 'shortEscudo'

export interface DecalSpec {
  id: DecalId
  anchor: AnchorId
  /** Ancho y alto en metros. */
  size: [number, number]
  /**
   * Dónde va el punto del detalle, en fracción del tamaño desde el centro (x a la derecha, y hacia arriba).
   * Por defecto, la esquina superior derecha, apenas afuera.
   */
  pinAt?: [number, number]
}

// Tamaños medidos sobre el mockup (frente y espalda) respecto del ancho del torso, a escala real. Cada
// medida es la de la tinta del diseño: VEZZA ocupa casi la mitad del ancho del pecho; el nombre, el 83 %
// de la espalda; el 11, 23 cm de alto.
export const DECALS: DecalSpec[] = [
  { id: 'escudo', anchor: 'escudo', size: [0.086, 0.0975] },
  // El punto va a la altura de la palabra, para no taparse con el escudo que está más arriba
  { id: 'vezza', anchor: 'vezza', size: [0.178, 0.19], pinAt: [0.64, -0.3] },
  { id: 'parche', anchor: 'parche', size: [0.1, 0.1] },
  { id: 'nombre', anchor: 'nombre', size: [0.31, 0.052] },
  { id: 'numero', anchor: 'numero', size: [0.158, 0.234] },
  { id: 'sponsor', anchor: 'sponsor', size: [0.233, 0.126] },
  { id: 'shortEscudo', anchor: 'shortEscudo', size: [0.05, 0.0567] },
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
