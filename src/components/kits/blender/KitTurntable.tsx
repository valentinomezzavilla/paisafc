import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { KitId } from '../../../data/kits'
import { useMediaQuery } from '../../../hooks/useMediaQuery'
import { MOTION } from '../../../lib/gsap'
import { spinStep, type SpinState } from '../viewer/spin'
import { FRAME_COUNT, frameIndex, nearestLoaded, SMALL_WIDTH } from './frames'
import { drawFrame, useFrames } from './useFrames'

/** Radianes por píxel de arrastre. */
const DRAG_GAIN = 0.0095
/** Giro con cada flecha del teclado: dos fotos. */
const KEY_STEP = ((Math.PI * 2) / FRAME_COUNT) * 2
/** Píxeles antes de decidir si un gesto táctil es horizontal (gira) o vertical (scrollea). */
const SLOP = 8

export interface KitTurntableProps {
  kit: KitId
  /** Ya se ve la primera foto: se puede sacar el póster. */
  onReady: () => void
  /** El usuario giró la camiseta: se apaga la pista. */
  onInteract: () => void
  /** No se pudo cargar: queda el póster. */
  onError: () => void
  label: string
}

/**
 * Camiseta renderizada en Blender que se gira arrastrando (en el celu solo el gesto horizontal: el vertical
 * sigue scrolleando la página) o con las flechas. Son 36 fotos de una vuelta completa dibujadas en un canvas.
 */
export default function KitTurntable({ kit, onReady, onInteract, onError, label }: KitTurntableProps) {
  const wrap = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const reduced = useMediaQuery(MOTION.reduced)
  const spin = useRef<SpinState>({ angle: 0, velocity: 0 })
  const shown = useRef(-1)
  // Fotos livianas si el visor no pasa de 640 px reales (celulares)
  const [small] = useState(() => typeof window !== 'undefined' && window.innerWidth * Math.min(window.devicePixelRatio || 1, 2) <= SMALL_WIDTH * 1.25)

  // Cada foto que llega puede ser justo la que corresponde al ángulo actual
  const drawRef = useRef<(force?: boolean) => void>(() => {})
  const onFrame = useCallback(() => drawRef.current(), [])
  const { images, ready, failed } = useFrames(kit, small, onFrame)

  const draw = useCallback(
    (force = false) => {
      const c = canvas.current
      if (!c) return
      const i = nearestLoaded(frameIndex(spin.current.angle), (k) => Boolean(images.current[k]))
      if (i === null || (i === shown.current && !force)) return
      shown.current = i
      drawFrame(c, images.current[i]!)
    },
    [images],
  )
  useEffect(() => {
    drawRef.current = draw
  }, [draw])

  useEffect(() => {
    if (ready) {
      draw(true)
      onReady()
    }
  }, [ready, kit, draw, onReady])
  useEffect(() => {
    if (failed) onError()
  }, [failed, onError])

  // Al cambiar el tamaño se vuelve a dibujar a la nueva resolución
  useEffect(() => {
    const c = canvas.current
    if (!c) return
    const ro = new ResizeObserver(() => draw(true))
    ro.observe(c)
    return () => ro.disconnect()
  }, [draw])

  // ------------------------------------------------------------ inercia
  const raf = useRef(0)
  const dragging = useRef(false)
  const animate = useCallback(() => {
    cancelAnimationFrame(raf.current)
    let last = performance.now()
    const tick = (now: number) => {
      const s = spin.current
      if (!dragging.current) spin.current = spinStep(s, now - last, reduced)
      last = now
      draw()
      if (dragging.current || spin.current.velocity !== 0) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
  }, [draw, reduced])
  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  // ------------------------------------------------------------ arrastre
  const drag = useRef<{ x: number; y: number; lastX: number; lastT: number; axis: 'x' | 'y' | null; moved: boolean; id: number } | null>(null)

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    drag.current = { x: e.clientX, y: e.clientY, lastX: e.clientX, lastT: e.timeStamp, axis: e.pointerType === 'mouse' ? 'x' : null, moved: false, id: e.pointerId }
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (!d.axis) {
      if (Math.hypot(dx, dy) < SLOP) return
      d.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
      if (d.axis === 'y') {
        drag.current = null // gesto vertical: es scroll, no se toca
        return
      }
    }
    if (!d.moved) {
      d.moved = true
      wrap.current?.setPointerCapture(e.pointerId)
      dragging.current = true
      onInteract()
      animate()
    }
    const s = spin.current
    const step = (e.clientX - d.lastX) * DRAG_GAIN
    const dt = Math.max(1, e.timeStamp - d.lastT)
    spin.current = { angle: s.angle + step, velocity: s.velocity + (step / dt - s.velocity) * 0.5 }
    d.lastX = e.clientX
    d.lastT = e.timeStamp
  }

  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    drag.current = null
    dragging.current = false
    if (!d || d.id !== e.pointerId) return
    // Si se soltó quieto, sin inercia
    if (e.timeStamp - d.lastT > 80) spin.current = { ...spin.current, velocity: 0 }
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const dir = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0
    if (!dir) return
    e.preventDefault()
    spin.current = { angle: spin.current.angle + dir * KEY_STEP, velocity: 0 }
    onInteract()
    draw()
  }

  return (
    <div
      ref={wrap}
      role="img"
      aria-label={label}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
      className="absolute inset-0 cursor-grab touch-pan-y outline-none select-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-(--kit-accent) focus-visible:ring-inset"
    >
      <canvas ref={canvas} aria-hidden className="size-full" />
    </div>
  )
}
