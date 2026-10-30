import { describe, expect, it } from 'vitest'
import { BODY } from '../body'
import { buildShirt, SLEEVE_SEGMENTS } from '../garments/shirt'
import { hasNaN, outwardNormalRatio } from '../loft'
import { bbox, firstRingCenter, halfWidthAt, sideExtentAt, yAxis } from './helpers'

const shirt = buildShirt()

describe('buildShirt', () => {
  it('ninguna parte tiene NaN', () => {
    for (const [name, geo] of Object.entries(shirt)) {
      if (typeof geo === 'number') continue
      expect(hasNaN(geo), name).toBe(false)
    }
  })

  it('las normales del torso apuntan hacia afuera', () => {
    expect(outwardNormalRatio(shirt.body, yAxis)).toBeGreaterThan(0.95)
  })

  it('el torso va del ruedo al cuello', () => {
    const box = bbox(shirt.body)
    expect(box.min.y).toBeCloseTo(shirt.hemY, 3)
    expect(shirt.hemY).toBeCloseTo(BODY.crotch + 0.07, 5)
    expect(box.max.y).toBeGreaterThanOrEqual(BODY.neckBase - 0.02)
  })

  it('la raíz de cada manga queda dentro del torso', () => {
    for (const sleeve of [shirt.sleeveL, shirt.sleeveR]) {
      const c = firstRingCenter(sleeve, SLEEVE_SEGMENTS + 1)
      expect(Math.abs(c.x)).toBeLessThan(halfWidthAt(shirt.body, c.y, 0.015))
    }
  })

  it('las mangas son espejo una de la otra', () => {
    const l = bbox(shirt.sleeveL)
    const r = bbox(shirt.sleeveR)
    expect(l.min.x).toBeCloseTo(-r.max.x, 3)
    expect(l.max.x).toBeCloseTo(-r.min.x, 3)
    expect(l.min.y).toBeCloseTo(r.min.y, 3)
  })

  it('el cuello no baja del pecho', () => {
    expect(bbox(shirt.collar).min.y).toBeGreaterThanOrEqual(BODY.chest + 0.08)
  })

  it('el torso es simétrico: los pliegues no cambian de un lado al otro', () => {
    for (const y of [0.95, 1.1, 1.2, 1.26, 1.32]) {
      expect(sideExtentAt(shirt.body, y, 1), `y = ${y}`).toBeCloseTo(sideExtentAt(shirt.body, y, -1), 3)
    }
  })

  it('el dobladillo de cada puño queda afuera del torso', () => {
    for (const [sleeve, sign] of [[shirt.sleeveL, -1], [shirt.sleeveR, 1]] as const) {
      const pos = sleeve.getAttribute('position')
      const hemStart = pos.count - 3 * (SLEEVE_SEGMENTS + 1)
      for (let i = hemStart; i < pos.count; i++) {
        const y = pos.getY(i)
        expect(sign * pos.getX(i)).toBeGreaterThan(sideExtentAt(shirt.body, y, sign, 0.004) - 0.0005)
      }
    }
  })

  it('cada puño tiene dos franjas separadas (pueden ir de distinto color)', () => {
    for (const geo of [shirt.cuffTrimL, shirt.cuffTrimR, shirt.cuffTrim2L, shirt.cuffTrim2R]) {
      expect(geo.getAttribute('position').count).toBeGreaterThan(0)
    }
    expect(bbox(shirt.cuffTrimR).max.y).not.toBeCloseTo(bbox(shirt.cuffTrim2R).max.y, 3)
  })
})
