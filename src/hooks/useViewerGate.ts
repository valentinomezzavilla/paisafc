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

/**
 * Cuándo montar un visor 3D: el navegador está libre, el elemento está a menos de una pantalla y hay WebGL.
 * En el HTML prerenderizado y en el primer render del cliente da `ready: false` (queda el póster).
 */
export function useViewerGate(ref: RefObject<HTMLElement | null>) {
  const idle = useIdleReady()
  const webgl = useSyncExternalStore(noopSubscribe, supportsWebGL, () => true)
  const [near, setNear] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: '100% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [ref])
  return { ready: idle && near && webgl, webgl }
}
