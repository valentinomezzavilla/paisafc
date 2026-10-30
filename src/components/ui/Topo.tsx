import { useRef } from 'react'
import { asset } from '../../lib/asset'
import { gsap, MOTION, useGSAP } from '../../lib/gsap'

interface TopoProps {
  /** Color de las líneas (acepta variables CSS). */
  color?: string
  /** Desplazamiento vertical total con el scroll, en % de su alto. 0 = sin parallax. */
  parallax?: number
  className?: string
}

/** Curvas de nivel de fondo: el SVG es una máscara, el color lo define quien lo usa. */
export function Topo({ color = 'var(--kit-topo)', parallax = 12, className = '' }: TopoProps) {
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

  const mask = `url(${asset('assets/topo.svg')}) center / cover no-repeat`
  return (
    <div
      ref={ref}
      aria-hidden
      className={`pointer-events-none absolute -inset-y-[10%] inset-x-0 ${className}`}
      style={{ background: color, mask, WebkitMask: mask }}
    />
  )
}
