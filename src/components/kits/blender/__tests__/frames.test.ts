import { describe, expect, it } from 'vitest'
import { FRAME_COUNT, frameIndex, frameUrl, loadOrder, nearestLoaded } from '../frames'

const deg = (d: number) => (d * Math.PI) / 180

describe('frameIndex', () => {
  it('de frente es la primera foto', () => {
    expect(frameIndex(0)).toBe(0)
  })

  it('redondea a la foto más cercana', () => {
    expect(frameIndex(deg(14))).toBe(1)
    expect(frameIndex(deg(16))).toBe(2)
  })

  it('da la vuelta en los dos sentidos', () => {
    expect(frameIndex(deg(360))).toBe(0)
    expect(frameIndex(deg(-10))).toBe(FRAME_COUNT - 1)
    expect(frameIndex(deg(-370))).toBe(FRAME_COUNT - 1)
  })
})

describe('loadOrder', () => {
  it('empieza de frente, alterna los dos lados y no repite', () => {
    const order = loadOrder()
    expect(order.slice(0, 5)).toEqual([0, 1, FRAME_COUNT - 1, 2, FRAME_COUNT - 2])
    expect(new Set(order).size).toBe(FRAME_COUNT)
  })
})

describe('nearestLoaded', () => {
  it('usa la pedida si está', () => {
    expect(nearestLoaded(5, () => true)).toBe(5)
  })

  it('si no, la más cercana, pasando por el cero', () => {
    expect(nearestLoaded(1, (i) => i === FRAME_COUNT - 2)).toBe(FRAME_COUNT - 2)
  })

  it('sin ninguna cargada, null', () => {
    expect(nearestLoaded(3, () => false)).toBeNull()
  })
})

describe('frameUrl', () => {
  it('arma la ruta con dos dígitos y la versión chica', () => {
    expect(frameUrl('verde', 3)).toBe('assets/kits/blender/verde/03.webp')
    expect(frameUrl('crema', 12, true)).toBe('assets/kits/blender/crema/12-640.webp')
  })
})
