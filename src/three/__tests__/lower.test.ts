import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { BODY } from '../body'
import { buildBoot, STUD_H } from '../garments/boots'
import { buildShorts } from '../garments/shorts'
import { buildSock } from '../garments/socks'
import { hasNaN, outwardNormalRatio } from '../loft'
import { bbox } from './helpers'

const legAxis = (sign: number) => (p: THREE.Vector3) => new THREE.Vector3(sign * BODY.legSpacing, p.y, 0)

const shorts = buildShorts()
const socks = { L: buildSock('L'), R: buildSock('R') }
const boots = { L: buildBoot('L'), R: buildBoot('R') }

describe('short', () => {
  it('no tiene NaN', () => {
    for (const geo of [shorts.legL, shorts.legR, shorts.waistband, shorts.stripeL, shorts.stripeR]) expect(hasNaN(geo)).toBe(false)
  })

  it('las normales de cada pierna apuntan hacia afuera', () => {
    // El dobladillo del ruedo mira hacia adentro a propósito (~8% de los vértices); una pierna invertida daría ~0.08.
    expect(outwardNormalRatio(shorts.legL, legAxis(-1))).toBeGreaterThan(0.9)
    expect(outwardNormalRatio(shorts.legR, legAxis(1))).toBeGreaterThan(0.9)
  })

  it('las piernas son espejo una de la otra', () => {
    const l = bbox(shorts.legL)
    const r = bbox(shorts.legR)
    expect(l.min.x).toBeCloseTo(-r.max.x, 3)
    expect(l.max.x).toBeCloseTo(-r.min.x, 3)
  })

  it('va de la cintura a arriba de la rodilla', () => {
    expect(shorts.topY).toBeCloseTo(BODY.waist - 0.02, 5)
    expect(shorts.hemY).toBeCloseTo(BODY.knee + 0.045, 5)
    expect(bbox(shorts.legL).max.y).toBeLessThanOrEqual(shorts.topY + 0.001)
  })
})

describe('medias', () => {
  it('no tienen NaN y sus normales apuntan hacia afuera', () => {
    for (const [side, s] of Object.entries(socks)) {
      expect(hasNaN(s.sock)).toBe(false)
      expect(hasNaN(s.cuff)).toBe(false)
      expect(outwardNormalRatio(s.sock, legAxis(side === 'L' ? -1 : 1))).toBeGreaterThan(0.95)
    }
  })

  it('cada media queda centrada bajo su pierna', () => {
    const c = (geo: THREE.BufferGeometry) => bbox(geo).getCenter(new THREE.Vector3())
    expect(c(socks.L.sock).x).toBeCloseTo(-BODY.legSpacing, 2)
    expect(c(socks.R.sock).x).toBeCloseTo(BODY.legSpacing, 2)
  })

  it('entre el short y las medias se ve la rodilla', () => {
    expect(shorts.hemY - socks.L.topY).toBeGreaterThanOrEqual(0.07)
  })
})

describe('botines', () => {
  it('no tienen NaN, apoyan en el piso y la capellada mira hacia afuera', () => {
    for (const [side, b] of Object.entries(boots)) {
      expect(hasNaN(b.upper)).toBe(false)
      expect(hasNaN(b.sole)).toBe(false)
      // Los tapones apoyan en el piso: la suela queda a su altura
      expect(bbox(b.studs).min.y).toBeCloseTo(0, 4)
      expect(bbox(b.sole).min.y).toBeCloseTo(STUD_H, 4)
      const sign = side === 'L' ? -1 : 1
      const center = (p: THREE.Vector3) => new THREE.Vector3(sign * BODY.legSpacing, Math.max(p.y, 0.04), 0.03)
      expect(outwardNormalRatio(b.upper, center)).toBeGreaterThan(0.9)
    }
  })

  it('la suela izquierda es el espejo de la derecha, con las caras hacia afuera', () => {
    const l = bbox(boots.L.sole)
    const r = bbox(boots.R.sole)
    expect(l.min.x).toBeCloseTo(-r.max.x, 4)
    expect(l.max.z).toBeCloseTo(r.max.z, 4)
    for (const [side, b] of Object.entries(boots)) {
      const sign = side === 'L' ? -1 : 1
      const center = (p: THREE.Vector3) => new THREE.Vector3(sign * BODY.legSpacing, STUD_H + 0.0065, 0.04).lerp(p, 0.001)
      b.sole.computeVertexNormals()
      expect(outwardNormalRatio(b.sole, center), side).toBeGreaterThan(0.6)
    }
  })
})
