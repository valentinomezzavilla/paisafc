import * as THREE from 'three'

export const yAxis = (p: THREE.Vector3) => new THREE.Vector3(0, p.y, 0)

export function bbox(geo: THREE.BufferGeometry): THREE.Box3 {
  geo.computeBoundingBox()
  return geo.boundingBox!.clone()
}

/** Centro de los primeros `count` vértices (el primer anillo de un loft). */
export function firstRingCenter(geo: THREE.BufferGeometry, count: number): THREE.Vector3 {
  const pos = geo.getAttribute('position')
  const c = new THREE.Vector3()
  for (let i = 0; i < count; i++) c.add(new THREE.Vector3().fromBufferAttribute(pos, i))
  return c.divideScalar(count)
}

/** Mayor |x| de los vértices que están a ±tol de la altura y. */
export function halfWidthAt(geo: THREE.BufferGeometry, y: number, tol = 0.01): number {
  const pos = geo.getAttribute('position')
  let w = 0
  for (let i = 0; i < pos.count; i++) if (Math.abs(pos.getY(i) - y) < tol) w = Math.max(w, Math.abs(pos.getX(i)))
  return w
}

/** Mayor |z - cz| de los vértices que están a ±tol de la altura y. */
export function halfDepthAt(geo: THREE.BufferGeometry, y: number, tol = 0.01, cz = 0): number {
  const pos = geo.getAttribute('position')
  let d = 0
  for (let i = 0; i < pos.count; i++) if (Math.abs(pos.getY(i) - y) < tol) d = Math.max(d, Math.abs(pos.getZ(i) - cz))
  return d
}
