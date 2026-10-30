import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { ANCHORS, anchorOnSurface, DECALS, facingAngle, pieceMesh } from '../anchors'
import { buildKitGeometry } from '../assembly'

const kit = buildKitGeometry()
const resolved = Object.fromEntries(
  Object.entries(ANCHORS).map(([id, spec]) => [id, anchorOnSurface(pieceMesh(kit, spec.piece), spec)]),
)

describe('anclas', () => {
  it('cada ancla cae sobre su prenda con la normal hacia afuera', () => {
    for (const [id, a] of Object.entries(resolved)) {
      expect(a.position.length(), id).toBeGreaterThan(0.1)
      const axisPoint = new THREE.Vector3(0, a.position.y, 0)
      const out = a.position.clone().sub(axisPoint).setY(0)
      expect(a.normal.dot(out.normalize()), id).toBeGreaterThan(0)
      expect(a.normal.length(), id).toBeCloseTo(1, 4)
    }
  })

  it('cada cosa del lado que va, como en el mockup', () => {
    expect(resolved.escudo.position.x).toBeGreaterThan(0.03)
    expect(resolved.parche.position.x).toBeLessThan(-0.15)
    expect(resolved.punos.position.x).toBeLessThan(-0.15)
    expect(resolved.shortEscudo.position.x).toBeLessThan(0)
    expect(resolved.vezza.position.z).toBeGreaterThan(0.1)
    for (const id of ['nombre', 'numero', 'sponsor']) expect(resolved[id].position.z, id).toBeLessThan(-0.1)
  })

  it('cada calco usa un ancla que existe', () => {
    for (const d of DECALS) expect(ANCHORS[d.anchor], d.id).toBeDefined()
  })
})

describe('facingAngle', () => {
  it('gira el modelo para que la normal mire a la cámara (+z)', () => {
    expect(facingAngle(new THREE.Vector3(1, 0, 0))).toBeCloseTo(-Math.PI / 2)
    expect(Math.abs(facingAngle(new THREE.Vector3(0, 0, -1)))).toBeCloseTo(Math.PI)
    const n = new THREE.Vector3(0.6, 0.2, 0.77).normalize()
    const turned = n.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), facingAngle(n))
    expect(turned.x).toBeCloseTo(0)
    expect(turned.z).toBeGreaterThan(0)
  })
})
