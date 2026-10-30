import { useEffect, useState } from 'react'

/**
 * false en el HTML prerenderizado y en el primer render; true cuando el navegador queda libre.
 * Sirve para no cargar ni decodificar imágenes que no hacen falta en la primera pantalla.
 */
export function useIdleReady(timeout = 2500) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const done = () => setReady(true)
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(done, { timeout })
      return () => window.cancelIdleCallback(id)
    }
    const id = setTimeout(done, 1200)
    return () => clearTimeout(id)
  }, [timeout])
  return ready
}
