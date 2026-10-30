import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { hasNaN, loft, outwardNormalRatio, superellipse } from '../loft'

const axis = (p: THREE.Vector3) => new THREE.Vector3(0, p.y, 0)

describe('superellipse', () => {
  it('arranca en +z (el frente) y gira antihorario visto desde arriba', () => {
    const ring = superellipse(0, 1, 0, 0.2, 0.1, 2, 16)
    expect(ring).toHaveLength(16)
    expect(ring[0].z).toBeCloseTo(0.1)
    expect(ring[0].x).toBeCloseTo(0)
    // un cuarto de vuelta antihoraria desde +z (mirando desde +y) cae en +x
    expect(ring[4].x).toBeCloseTo(0.2)
  })
})

describe('loft', () => {
  const rings = [superellipse(0, 0, 0, 0.1, 0.1, 2, 16), superellipse(0, 0.3, 0, 0.1, 0.1, 2, 16)]
  const geo = loft(rings)

  it('duplica la primera columna para la costura de UV', () => {
    expect(geo.getAttribute('position').count).toBe(17 * 2)
  })

  it('no tiene NaN', () => {
    expect(hasNaN(geo)).toBe(false)
  })

  it('las normales apuntan hacia afuera', () => {
    expect(outwardNormalRatio(geo, axis)).toBeGreaterThan(0.98)
  })

  it('v mide la distancia entre anillos en metros', () => {
    const uv = geo.getAttribute('uv')
    expect(uv.getY(0)).toBeCloseTo(0)
    expect(uv.getY(17)).toBeCloseTo(0.3)
  })

  it('u va de 0 a 1 alrededor del anillo', () => {
    const uv = geo.getAttribute('uv')
    expect(uv.getX(0)).toBeCloseTo(0)
    expect(uv.getX(16)).toBeCloseTo(1)
  })
})
