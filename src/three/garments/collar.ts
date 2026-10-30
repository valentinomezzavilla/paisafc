import * as THREE from 'three'
import { loft, type Ring } from '../loft'
import { NECK, neckPoint } from './neck'

const PATH_SEGMENTS = 96
/** Hueco adelante entre las dos puntas del cuello (radianes a cada lado del frente). */
const FRONT_GAP = 0.2
const STAND_H = 0.022
/** Separación entre la caída del cuello y la tela de abajo. */
const CLEARANCE = 0.0028
const TRIM_W = 0.006

const smooth = THREE.MathUtils.smoothstep

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
 * Cuello polo retro: pie de cuello alrededor del escote y una caída doblada que se apoya sobre los
 * hombros; adelante las puntas bajan sobre el pecho a cada lado de la V.
 */
export function buildCollar(body: THREE.BufferGeometry): { collar: THREE.BufferGeometry; trim: THREE.BufferGeometry } {
  const probe = surfaceProbe(body)
  const profiles: Ring[] = []
  const trims: Ring[] = []
  const up = new THREE.Vector3(0, 1, 0)

  for (let i = 0; i <= PATH_SEGMENTS; i++) {
    const t = FRONT_GAP + (i / PATH_SEGMENTS) * (Math.PI * 2 - 2 * FRONT_GAP)
    const a = Math.abs(Math.atan2(Math.sin(t), Math.cos(t)))
    // 1 en las puntas delanteras, 0 atrás
    const tip = 1 - smooth(a, FRONT_GAP, FRONT_GAP + 1.1)

    const base = neckPoint(t)
    const out = new THREE.Vector3(base.x, 0, base.z - NECK.cz).normalize()
    const stand = STAND_H * (1 - 0.55 * tip)

    const p0 = base.clone().addScaledVector(out, 0.0015)
    const p1 = p0.clone().addScaledVector(up, stand).addScaledVector(out, 0.002)
    const p2 = p1.clone().addScaledVector(up, 0.003).addScaledVector(out, 0.005)
    // Borde de la caída: a los costados se apoya en el hombro; en las puntas baja por el pecho.
    const reach = 0.03
    const drop = THREE.MathUtils.lerp(0.014, 0.072, tip)
    const edge = keepOutside(base.clone().addScaledVector(out, reach).addScaledVector(up, -drop), probe, CLEARANCE)

    const fall = [0.3, 0.6, 0.85, 1].map((f) =>
      keepOutside(new THREE.Vector3().lerpVectors(p2, edge, f).addScaledVector(out, 0.004 * Math.sin(Math.PI * f)), probe, CLEARANCE),
    )
    profiles.push([p0, p1, p2, ...fall])

    // Ribete: una tira sobre el borde de la caída, apenas levantada
    const inner = new THREE.Vector3().lerpVectors(p2, edge, 1 - TRIM_W / p2.distanceTo(edge))
    trims.push([keepOutside(inner, probe, CLEARANCE + 0.0012), keepOutside(edge, probe, CLEARANCE + 0.0012)])
  }

  return { collar: loft(profiles, { closed: false }), trim: loft(trims, { closed: false }) }
}
