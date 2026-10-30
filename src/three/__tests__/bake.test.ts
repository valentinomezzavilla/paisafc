import { describe, expect, it } from 'vitest'
import { ANCHORS, DECALS } from '../anchors'
import { buildKitScene } from '../bakeScene'
import { readKitScene } from '../kitScene'

const data = readKitScene(buildKitScene())

describe('escena horneada', () => {
  it('trae todas las prendas', () => {
    for (const name of ['shirt-body', 'shirt-sleeveL', 'shirt-sleeveR', 'shirt-collar', 'shirt-collarTrim', 'shorts-legL', 'shorts-legR', 'socks-0-sock', 'socks-1-cuff', 'boots-0-upper', 'boots-1-sole']) {
      expect(data.geo[name], name).toBeDefined()
    }
  })

  it('trae un calco por cada diseño, con UV de 0 a 1', () => {
    for (const d of DECALS) {
      const geo = data.decals[d.id]
      expect(geo, d.id).toBeDefined()
      expect(geo.getAttribute('position').count, d.id).toBeGreaterThan(30)
      const uv = geo.getAttribute('uv')
      for (let i = 0; i < uv.count; i++) {
        expect(uv.getX(i)).toBeGreaterThanOrEqual(-0.001)
        expect(uv.getX(i)).toBeLessThanOrEqual(1.001)
      }
    }
  })

  it('trae todas las anclas con su normal', () => {
    for (const id of Object.keys(ANCHORS)) {
      const a = data.anchors[id as keyof typeof ANCHORS]
      expect(a, id).toBeDefined()
      expect(a.normal.length(), id).toBeCloseTo(1, 3)
    }
  })
})
