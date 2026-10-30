import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { describe, expect, it } from 'vitest'
import { buildKitGeometry } from '../assembly'
import { BODY } from '../body'
import { bbox, halfDepthAt, halfWidthAt } from './helpers'

const kit = buildKitGeometry()
const legs = mergeGeometries([kit.shorts.legL, kit.shorts.legR, kit.shorts.waistband].map((g) => g.toNonIndexed()))

describe('conjunto en maniquí invisible', () => {
  it('la camiseta tapa la cintura del short', () => {
    expect(kit.shorts.topY - kit.shirt.hemY).toBeGreaterThan(0.149)
  })

  it('el short no atraviesa la camiseta por arriba del ruedo', () => {
    for (let y = kit.shirt.hemY + 0.01; y <= kit.shorts.topY; y += 0.01) {
      expect(halfWidthAt(legs, y, 0.006), `ancho a ${y.toFixed(2)}`).toBeLessThan(halfWidthAt(kit.shirt.body, y, 0.006))
      expect(halfDepthAt(legs, y, 0.006), `profundidad a ${y.toFixed(2)}`).toBeLessThan(halfDepthAt(kit.shirt.body, y, 0.006))
    }
  })

  it('el conjunto está centrado y apoya en el piso', () => {
    const c = kit.bounds.full.getCenter(new THREE.Vector3())
    expect(c.x).toBeCloseTo(0, 2)
    expect(kit.bounds.full.min.y).toBeCloseTo(0, 4)
  })

  it('medias y botines siguen el centro de cada pierna', () => {
    const cx = (g: THREE.BufferGeometry) => bbox(g).getCenter(new THREE.Vector3()).x
    for (const [i, sign] of [[0, -1], [1, 1]] as const) {
      expect(cx(kit.socks[i].sock)).toBeCloseTo(sign * BODY.legSpacing, 2)
      // la punta abre hacia afuera: el centro del botín puede correrse unos milímetros
      expect(Math.abs(cx(kit.boots[i].upper) - sign * BODY.legSpacing)).toBeLessThan(0.02)
    }
  })

  it('la vista de camiseta encuadra solo la camiseta', () => {
    expect(kit.bounds.shirt.min.y).toBeGreaterThan(kit.shorts.hemY)
  })
})
