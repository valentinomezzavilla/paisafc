import { describe, expect, it } from 'vitest'
import { BODY } from '../body'

describe('BODY', () => {
  it('las alturas suben del tobillo al cuello', () => {
    const order = [BODY.ankle, BODY.calf, BODY.knee, BODY.crotch, BODY.hip, BODY.waist, BODY.chest]
    for (let i = 1; i < order.length; i++) expect(order[i]).toBeGreaterThan(order[i - 1])
    expect(BODY.armpit).toBeGreaterThanOrEqual(BODY.chest)
    expect(BODY.shoulder).toBeGreaterThan(BODY.armpit)
    expect(BODY.neckBase).toBeGreaterThan(BODY.shoulder)
  })

  it('las piernas caben dentro de la cadera', () => {
    expect(BODY.legSpacing).toBeLessThan(BODY.hipHalfWidth)
  })
})
