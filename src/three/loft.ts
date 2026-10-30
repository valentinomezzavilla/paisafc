import * as THREE from 'three'

/** Sección transversal de una prenda. Todos los anillos de un loft tienen la misma cantidad de puntos. */
export type Ring = THREE.Vector3[]

interface LoftOptions {
  /** true (default): cada anillo es un contorno cerrado. false: tira abierta. */
  closed?: boolean
  uvScale?: [number, number]
}

/**
 * Une anillos consecutivos en una malla. u = largo de arco / perímetro del anillo; v = distancia
 * acumulada entre centros de anillo, en metros. Con anillos antihorarios (vistos desde la punta de
 * avance) las normales salen hacia afuera.
 */
export function loft(rings: Ring[], { closed = true, uvScale = [1, 1] }: LoftOptions = {}): THREE.BufferGeometry {
  const n = rings[0].length
  const cols = closed ? n + 1 : n
  const positions = new Float32Array(rings.length * cols * 3)
  const uvs = new Float32Array(rings.length * cols * 2)

  let v = 0
  let prevCenter: THREE.Vector3 | null = null
  rings.forEach((ring, i) => {
    const center = ring.reduce((c, p) => c.add(p), new THREE.Vector3()).divideScalar(n)
    if (prevCenter) v += center.distanceTo(prevCenter)
    prevCenter = center

    const arcs = [0]
    for (let j = 1; j < cols; j++) arcs.push(arcs[j - 1] + ring[j % n].distanceTo(ring[j - 1]))
    const total = arcs[cols - 1] || 1

    for (let j = 0; j < cols; j++) {
      const p = ring[j % n]
      const k = i * cols + j
      positions.set([p.x, p.y, p.z], k * 3)
      uvs.set([(arcs[j] / total) * uvScale[0], v * uvScale[1]], k * 2)
    }
  })

  const index: number[] = []
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < cols - 1; j++) {
      const a = i * cols + j
      const b = a + 1
      const c = a + cols
      const d = c + 1
      index.push(a, b, c, b, d, c)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geo.setIndex(index)
  geo.computeVertexNormals()
  if (closed) weldSeamNormals(geo, rings.length, cols)
  return geo
}

/** La columna duplicada de la costura tiene la misma posición: promedia sus normales para que no se vea la línea. */
function weldSeamNormals(geo: THREE.BufferGeometry, rows: number, cols: number) {
  const normal = geo.getAttribute('normal') as THREE.BufferAttribute
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  for (let i = 0; i < rows; i++) {
    const first = i * cols
    const last = first + cols - 1
    a.fromBufferAttribute(normal, first)
    b.fromBufferAttribute(normal, last)
    a.add(b).normalize()
    normal.setXYZ(first, a.x, a.y, a.z)
    normal.setXYZ(last, a.x, a.y, a.z)
  }
  normal.needsUpdate = true
}

/**
 * Contorno superelíptico horizontal a la altura y. n = 2 es una elipse; más alto, más cuadrado.
 * El punto 0 está en +z (el frente) y avanza hacia +x.
 */
export function superellipse(
  cx: number,
  y: number,
  cz: number,
  rx: number,
  rz: number,
  n: number,
  segments: number,
  startAngle = 0,
): Ring {
  const e = 2 / n
  const pow = (t: number) => Math.sign(t) * Math.abs(t) ** e
  return Array.from({ length: segments }, (_, j) => {
    const t = startAngle + (j / segments) * Math.PI * 2
    return new THREE.Vector3(cx + rx * pow(Math.sin(t)), y, cz + rz * pow(Math.cos(t)))
  })
}

/**
 * Anillo elíptico perpendicular a `axis` (la dirección de avance del tubo). Usa una base con la misma
 * orientación que `superellipse` sobre +y, así un loft de estos anillos también tiene normales hacia afuera.
 * `front` marca hacia dónde cae el punto 0.
 */
export function tubeRing(
  center: THREE.Vector3,
  axis: THREE.Vector3,
  rx: number,
  rz: number,
  segments: number,
  front = new THREE.Vector3(0, 0, 1),
  offset: (t: number) => number = () => 0,
): Ring {
  const a = axis.clone().normalize()
  const zb = front.clone().sub(a.clone().multiplyScalar(front.dot(a))).normalize()
  const xb = new THREE.Vector3().crossVectors(a, zb)
  return Array.from({ length: segments }, (_, j) => {
    const t = (j / segments) * Math.PI * 2
    const d = offset(t)
    return center
      .clone()
      .addScaledVector(xb, (rx + d) * Math.sin(t))
      .addScaledVector(zb, (rz + d) * Math.cos(t))
  })
}

/** Espejo en x de un anillo, conservando el punto 0 y el sentido de giro (y con él, las normales hacia afuera). */
export function mirrorX(ring: Ring): Ring {
  const m = ring.map((p) => new THREE.Vector3(-p.x, p.y, p.z))
  return [m[0], ...m.slice(1).reverse()]
}

/** Fracción de normales que apuntan hacia afuera de `center(p)`. Lo usan los tests. */
export function outwardNormalRatio(geo: THREE.BufferGeometry, center: (p: THREE.Vector3) => THREE.Vector3): number {
  const pos = geo.getAttribute('position')
  const nor = geo.getAttribute('normal')
  const p = new THREE.Vector3()
  const nv = new THREE.Vector3()
  let out = 0
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i)
    nv.fromBufferAttribute(nor, i)
    if (nv.dot(p.clone().sub(center(p))) > 0) out++
  }
  return out / pos.count
}

export function hasNaN(geo: THREE.BufferGeometry): boolean {
  return Object.values(geo.attributes).some((attr) => Array.from(attr.array as ArrayLike<number>).some(Number.isNaN))
}
