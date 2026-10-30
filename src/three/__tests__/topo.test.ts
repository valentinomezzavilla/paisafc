import { describe, expect, it } from 'vitest'
import { TOPO_TILE, topoOffset, topoRepeat } from '../design/topoTexture'

describe('topoRepeat', () => {
  it('repite en espejo un número par de veces alrededor: así la última repetición empalma con la primera', () => {
    for (const perimeter of [0.3, 0.47, 0.68, 1.15, 1.7]) {
      const [u] = topoRepeat(perimeter)
      expect(u % 2, `perímetro ${perimeter}`).toBe(0)
      expect(u).toBeGreaterThanOrEqual(2)
    }
  })

  it('en v respeta el tamaño real del dibujo', () => {
    expect(topoRepeat(1)[1]).toBeCloseTo(1 / TOPO_TILE[1])
  })
})

describe('topoOffset', () => {
  it('pone los ejes del espejo a los costados (u = 0,25 y 0,75), no en el centro del pecho ni de la espalda', () => {
    for (const perimeter of [0.47, 1.1, 1.7, 2.3]) {
      const [n] = topoRepeat(perimeter)
      const off = topoOffset(n)
      for (const u of [0.25, 0.75]) expect(Math.abs(((u * n + off) % 1) - 0) < 1e-9 || Math.abs(((u * n + off) % 1) - 1) < 1e-9, `n=${n} u=${u}`).toBe(true)
    }
  })
})
