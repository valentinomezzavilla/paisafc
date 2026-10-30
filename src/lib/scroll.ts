import type Lenis from 'lenis'

let lenis: Lenis | null = null

export const setLenis = (instance: Lenis | null) => {
  lenis = instance
}

/** Scroll a una posición absoluta, suave con Lenis si está activo. */
export function scrollToY(y: number, immediate = false) {
  if (lenis) lenis.scrollTo(y, { duration: 1.2, immediate })
  else window.scrollTo({ top: y, behavior: immediate ? 'auto' : 'smooth' })
}
