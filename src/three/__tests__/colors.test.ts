import { describe, expect, it } from 'vitest'
import { cuffStripeColors, KIT_COLORS } from '../kitColors'

describe('franjas del puño', () => {
  it('la suplente alterna verde y dorado, como en el mockup', () => {
    expect(KIT_COLORS.crema.trim2).toBeDefined()
    expect(cuffStripeColors(KIT_COLORS.crema)).toEqual([KIT_COLORS.crema.trim, KIT_COLORS.crema.trim2])
  })

  it('la titular tiene las dos franjas doradas', () => {
    expect(cuffStripeColors(KIT_COLORS.verde)).toEqual([KIT_COLORS.verde.trim, KIT_COLORS.verde.trim])
  })
})
