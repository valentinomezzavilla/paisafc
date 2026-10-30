import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { isFacing, shortestTurn, spinStep } from '../spin'

describe('spinStep', () => {
  it('avanza el ángulo con la velocidad y la va frenando', () => {
    const next = spinStep({ angle: 0, velocity: 0.01 }, 16, false)
    expect(next.angle).toBeGreaterThan(0.1)
    expect(next.angle).toBeLessThan(0.17)
    expect(next.velocity).toBeCloseTo(0.0092, 5)
  })

  it('el frenado no depende de los cuadros por segundo', () => {
    const a = spinStep({ angle: 0, velocity: 0.01 }, 32, false)
    const b = spinStep(spinStep({ angle: 0, velocity: 0.01 }, 16, false), 16, false)
    expect(a.velocity).toBeCloseTo(b.velocity, 6)
  })

  it('se detiene del todo cuando la velocidad es muy chica', () => {
    expect(spinStep({ angle: 1, velocity: 0.0004 }, 16, false).velocity).toBe(0)
  })

  it('con movimiento reducido no hay inercia', () => {
    expect(spinStep({ angle: 1, velocity: 0.01 }, 16, true)).toEqual({ angle: 1, velocity: 0 })
  })
})

describe('shortestTurn', () => {
  it('gira por el camino corto', () => {
    expect(shortestTurn(0, Math.PI / 2)).toBeCloseTo(Math.PI / 2)
    expect(shortestTurn(0.2, -0.2 + Math.PI * 2)).toBeCloseTo(-0.4)
    expect(shortestTurn(Math.PI * 7, 0)).toBeCloseTo(Math.PI)
  })
})

describe('isFacing', () => {
  const toCam = new THREE.Vector3(0, 0, 1)
  it('un detalle de frente a la cámara se ve; uno de costado o de espaldas no', () => {
    expect(isFacing(new THREE.Vector3(0, 0, 1), toCam)).toBe(true)
    expect(isFacing(new THREE.Vector3(0.6, 0, 0.8), toCam)).toBe(true)
    expect(isFacing(new THREE.Vector3(1, 0, 0.1).normalize(), toCam)).toBe(false)
    expect(isFacing(new THREE.Vector3(0, 0, -1), toCam)).toBe(false)
  })
})
