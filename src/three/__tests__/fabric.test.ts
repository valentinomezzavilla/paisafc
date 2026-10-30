import { describe, expect, it } from 'vitest'
import { knitRepeat } from '../fabric'

describe('knitRepeat', () => {
  it('repite la trama un número entero de veces alrededor, así no hay salto en la costura de UV', () => {
    for (const perimeter of [1.15, 0.47, 0.68, 0.3, 0.09]) {
      const [u] = knitRepeat(perimeter)
      expect(Number.isInteger(u), `perímetro ${perimeter}`).toBe(true)
      expect(u).toBeGreaterThanOrEqual(1)
    }
  })

  it('mantiene la celda cerca de su tamaño real en los dos sentidos', () => {
    const [u, v] = knitRepeat(1.15)
    expect(u).toBe(Math.round(1.15 / (0.003 * 16)))
    expect(v).toBeCloseTo(1 / (0.003 * 16))
  })
})
