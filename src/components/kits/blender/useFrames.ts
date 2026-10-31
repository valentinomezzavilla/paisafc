import { useEffect, useRef, useState, type RefObject } from 'react'
import type { KitId } from '../../../data/kits'
import { FRAME_COUNT, frameUrl, loadOrder } from './frames'

/** Fotos ya pedidas, compartidas por la sección de camisetas y "Las dos juntas". */
const cache = new Map<string, Promise<HTMLImageElement>>()

function loadFrame(url: string): Promise<HTMLImageElement> {
  let p = cache.get(url)
  if (!p) {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    p = img.decode().then(() => img)
    // Un fallo no queda guardado: se puede volver a intentar
    p.catch(() => cache.delete(url))
    cache.set(url, p)
  }
  return p
}

/** De a cuántas fotos se piden a la vez. */
const PARALLEL = 4

export interface FrameSet {
  /** Foto i, o null si todavía no llegó. Es un ref: no provoca renders. */
  images: RefObject<(HTMLImageElement | null)[]>
  /** Ya está la primera foto pedida (la de frente, o la primera de `only`). */
  ready: boolean
  /** No se pudo cargar la primera. */
  failed: boolean
}

/**
 * Carga las fotos de la vuelta de un kit: la de frente primero y después hacia los dos lados.
 * `only` limita qué fotos se piden (para "Las dos juntas" alcanza con unas pocas).
 * `onFrame` avisa cada foto que llega, para redibujar sin pasar por React.
 */
export function useFrames(kit: KitId, small: boolean, onFrame?: (i: number) => void, only?: number[]): FrameSet {
  const images = useRef<(HTMLImageElement | null)[]>(Array(FRAME_COUNT).fill(null))
  const [state, setState] = useState({ key: '', ready: false, failed: false })
  const notify = useRef(onFrame)
  useEffect(() => {
    notify.current = onFrame
  }, [onFrame])
  const onlyKey = only?.join(',') ?? ''
  const key = `${kit}:${small}:${onlyKey}`

  useEffect(() => {
    let alive = true
    images.current = Array(FRAME_COUNT).fill(null)
    const queue = onlyKey ? onlyKey.split(',').map(Number) : loadOrder()
    const first = queue.shift()!
    const stateKey = `${kit}:${small}:${onlyKey}`
    const load = async (i: number) => {
      const img = await loadFrame(frameUrl(kit, i, small))
      if (!alive) return
      images.current[i] = img
      notify.current?.(i)
    }
    const worker = async () => {
      while (alive && queue.length) await load(queue.shift()!).catch(() => undefined)
    }
    // La de frente sola, así llega cuanto antes; después el resto, de a varias
    load(first).then(
      () => {
        if (!alive) return
        setState({ key: stateKey, ready: true, failed: false })
        for (let k = 0; k < PARALLEL; k++) void worker()
      },
      () => alive && setState({ key: stateKey, ready: false, failed: true }),
    )
    return () => {
      alive = false
    }
  }, [kit, small, onlyKey])

  const current = state.key === key
  return { images, ready: current && state.ready, failed: current && state.failed }
}

/** Dibuja una foto en el canvas, entera y centrada, a la resolución de la pantalla. */
export function drawFrame(canvas: HTMLCanvasElement, img: HTMLImageElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = Math.round(canvas.clientWidth * dpr)
  const h = Math.round(canvas.clientHeight * dpr)
  if (!w || !h) return
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w
    canvas.height = h
  }
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, w, h)
  const k = Math.min(w / img.naturalWidth, h / img.naturalHeight)
  const dw = img.naturalWidth * k
  const dh = img.naturalHeight * k
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh)
}
