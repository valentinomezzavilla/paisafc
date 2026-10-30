import { describe, expect, it } from 'vitest'
import { TOPO_TILE, topoRepeat } from '../design/topoTexture'

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
