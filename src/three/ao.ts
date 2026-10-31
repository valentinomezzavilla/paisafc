import * as THREE from 'three'
import { MeshBVH } from 'three-mesh-bvh'

interface AOOptions {
  /** Rayos por vértice. */
  rays?: number
  /** Hasta dónde cuenta un obstáculo (metros): más lejos que esto, no tapa. */
  maxDistance?: number
  /** Cuánto oscurece como máximo lo más encerrado (0 = nada, 1 = negro). */
  strength?: number
}

/** Direcciones repartidas parejo sobre el hemisferio (espiral de Fibonacci), con más peso cerca de la normal. */
function hemisphere(rays: number): THREE.Vector3[] {
  const golden = Math.PI * (3 - Math.sqrt(5))
  return Array.from({ length: rays }, (_, i) => {
    const u = (i + 0.5) / rays
    const r = Math.sqrt(u)
    const a = i * golden
    return new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, Math.sqrt(1 - u))
  })
}

/** Aleatorio determinista por vértice, para girar el abanico de rayos y que no se vea un patrón. */
const hash = (i: number) => {
  const s = Math.sin(i * 12.9898) * 43758.5453
  return s - Math.floor(s)
}

/**
 * Oclusión ambiental horneada en el color de los vértices: cada vértice lanza rayos sobre el hemisferio
 * de su normal y se oscurece según cuánto lo tapa el resto de la ropa (axilas, debajo del cuello,
 * adentro de las mangas, el short bajo la camiseta). Es lo que da profundidad sin trazado de luz en vivo.
 * Las mallas de la escena tienen que estar ya en el espacio del mundo.
 */
export function bakeVertexAO(scene: THREE.Object3D, { rays = 32, maxDistance = 0.1, strength = 0.7 }: AOOptions = {}) {
  const pieces: THREE.Mesh[] = []
  scene.traverse((o) => {
    if (o instanceof THREE.Mesh && !o.name.startsWith('decal-')) pieces.push(o)
  })

  // Todas las piezas, juntas, son el obstáculo
  const positions: number[] = []
  const index: number[] = []
  for (const mesh of pieces) {
    const pos = mesh.geometry.getAttribute('position')
    const base = positions.length / 3
    for (let i = 0; i < pos.count; i++) positions.push(pos.getX(i), pos.getY(i), pos.getZ(i))
    const idx = mesh.geometry.index
    if (idx) for (let i = 0; i < idx.count; i++) index.push(base + idx.getX(i))
    else for (let i = 0; i < pos.count; i++) index.push(base + i)
  }
  const all = new THREE.BufferGeometry()
  all.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  all.setIndex(index)
  const bvh = new MeshBVH(all)

  const dirs = hemisphere(rays)
  const ray = new THREE.Ray()
  const n = new THREE.Vector3()
  const t = new THREE.Vector3()
  const b = new THREE.Vector3()
  const d = new THREE.Vector3()
  const origin = new THREE.Vector3()
  let seed = 0

  for (const mesh of pieces) {
    const geo = mesh.geometry
    const pos = geo.getAttribute('position')
    const nor = geo.getAttribute('normal')
    const colors = new Uint8Array(pos.count * 3)
    for (let i = 0; i < pos.count; i++) {
      n.fromBufferAttribute(nor, i).normalize()
      // Base tangente a la normal, girada al azar por vértice
      t.set(Math.abs(n.y) < 0.95 ? 0 : 1, Math.abs(n.y) < 0.95 ? 1 : 0, 0).cross(n).normalize()
      b.crossVectors(n, t)
      const spin = hash(seed++) * Math.PI * 2
      const cs = Math.cos(spin)
      const sn = Math.sin(spin)
      origin.fromBufferAttribute(pos, i).addScaledVector(n, 0.0025)
      let occlusion = 0
      for (const v of dirs) {
        const x = v.x * cs - v.y * sn
        const y = v.x * sn + v.y * cs
        d.set(0, 0, 0).addScaledVector(t, x).addScaledVector(b, y).addScaledVector(n, v.z)
        ray.set(origin, d)
        // Lo que está a menos de 5 mm es la misma tela (ondulaciones, el espesor): no es un obstáculo
        const hit = bvh.raycastFirst(ray, THREE.DoubleSide, 0.005, maxDistance)
        // Lo que tapa de cerca oscurece más que lo que tapa de lejos
        if (hit) occlusion += 1 - hit.distance / maxDistance
      }
      const shade = 1 - strength * (occlusion / dirs.length) * 1.6
      const g = Math.round(255 * THREE.MathUtils.clamp(shade, 0.25, 1))
      colors[i * 3] = colors[i * 3 + 1] = colors[i * 3 + 2] = g
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3, true))
  }
}
