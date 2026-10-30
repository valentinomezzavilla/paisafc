import Lenis from 'lenis'
import { useEffect } from 'react'
import { gsap, MOTION, ScrollTrigger } from '../lib/gsap'

/** Scroll suave con Lenis, sincronizado con ScrollTrigger. Se desactiva con reduced motion. */
export function useSmoothScroll() {
  useEffect(() => {
    if (!window.matchMedia(MOTION.full).matches) return

    const lenis = new Lenis({ lerp: 0.11, anchors: { offset: -64 } })
    lenis.on('scroll', ScrollTrigger.update)
    const tick = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(tick)
      lenis.destroy()
    }
  }, [])
}
