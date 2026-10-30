import { useEffect, useState, useSyncExternalStore, type RefObject } from 'react'
import { useIdleReady } from './useIdleReady'

let webglSupport: boolean | undefined
function supportsWebGL() {
  webglSupport ??= (() => {
    try {
      const c = document.createElement('canvas')
      return Boolean(c.getContext('webgl2') ?? c.getContext('webgl'))
    } catch {
      return false
    }
  })()
  return webglSupport
}

const noopSubscribe = () => () => {}
const assumeWebGL = () => true

/** Gestos que muestran que alguien está usando la página (no cuentan los movimientos del mouse). */
const ACTIVITY = ['scroll', 'wheel', 'touchstart', 'pointerdown', 'keydown'] as const

function useObserved(ref: RefObject<HTMLElement | null>, rootMargin: string) {
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setSeen(true), { rootMargin })
    io.observe(el)
    return () => io.disconnect()
  }, [ref, rootMargin])
  return seen
}

/**
 * Cuándo montar un visor 3D: el navegador está libre, hay WebGL, y además
 *  - el elemento ya entró en pantalla, o
 *  - alguien empezó a scrollear o tocar la página y el elemento está a menos de una pantalla.
 * `nearMargin` es qué tan lejos cuenta como "a menos de una pantalla". La segunda condición adelanta la carga mientras se recorre lo anterior. No alcanza con la cercanía: la
 * sección de camisetas queda pegada debajo del hero, así que three y el modelo se cargarían durante la carga
 * de la página y trabarían la primera pantalla.
 * En el HTML prerenderizado y en el primer render del cliente da `ready: false` (queda el póster).
 */
export function useViewerGate(ref: RefObject<HTMLElement | null>, nearMargin = '100% 0px') {
  const idle = useIdleReady()
  const near = useObserved(ref, nearMargin)
  // Margen negativo: un elemento que apenas toca el borde de abajo (la sección pegada al hero) no cuenta.
  const shown = useObserved(ref, '-8% 0px')
  const [active, setActive] = useState(false)
  useEffect(() => {
    const on = () => setActive(true)
    for (const type of ACTIVITY) window.addEventListener(type, on, { once: true, passive: true })
    return () => {
      for (const type of ACTIVITY) window.removeEventListener(type, on)
    }
  }, [])
  const wanted = idle && (shown || (near && active))
  // Crear un contexto WebGL de prueba es caro: se hace recién cuando el visor está por montarse.
  const webgl = useSyncExternalStore(noopSubscribe, wanted ? supportsWebGL : assumeWebGL, assumeWebGL)
  return { ready: wanted && webgl, webgl }
}
