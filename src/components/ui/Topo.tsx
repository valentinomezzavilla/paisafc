import { useRef } from 'react'
import { asset } from '../../lib/asset'
import { gsap, MOTION, useGSAP } from '../../lib/gsap'

export type TopoTone = 'gold' | 'forest'

interface TopoProps {
  /** Color de las líneas: cada tono es un SVG propio (scripts/make_topo.mjs). */
  tone?: TopoTone
  opacity?: number
  /** Desplazamiento vertical total con el scroll, en % de su alto. 0 = sin parallax. */
  parallax?: number
  className?: string
}

/** Curvas de nivel de fondo, con parallax suave. */
export function Topo({ tone = 'gold', opacity = 0.14, parallax = 12, className = '' }: TopoProps) {
  const ref = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    if (!parallax) return
    const mm = gsap.matchMedia()
    mm.add(MOTION.full, () => {
      gsap.fromTo(
        ref.current,
        { yPercent: -parallax / 2 },
        {
          yPercent: parallax / 2,
          ease: 'none',
          scrollTrigger: { trigger: ref.current?.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
        },
      )
    })
  })

  return (
    <div
      ref={ref}
      aria-hidden
      className={`pointer-events-none absolute -inset-y-[10%] inset-x-0 bg-cover bg-center will-change-transform ${className}`}
      style={{ backgroundImage: `url(${asset(`assets/topo-${tone}.svg`)})`, opacity }}
    />
  )
}
