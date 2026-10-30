import { useRef } from 'react'
import { KITS } from '../../data/kits'
import { kitsSection } from '../../data/texts'
import { useIdleReady } from '../../hooks/useIdleReady'
import { gsap, MOTION, useGSAP } from '../../lib/gsap'
import { KitPicture } from '../ui/KitPicture'
import { Topo } from '../ui/Topo'
import { kitVars } from './KitBackdrop'

/** Cierre de la sección: titular y suplente lado a lado, cada una sobre su color. */
export function KitsTogether() {
  const root = useRef<HTMLElement>(null)
  const ready = useIdleReady()

  useGSAP(
    () => {
      if (!ready) return // las fotos se montan cuando el navegador queda libre
      const q = gsap.utils.selector(root)
      const mm = gsap.matchMedia()
      mm.add(MOTION.full, () => {
        q('[data-half]').forEach((half, i) => {
          const dir = i % 2 === 0 ? -1 : 1
          gsap.from(half.querySelector('[data-shirt-back]'), {
            xPercent: -30 * dir,
            rotate: -8 * dir,
            opacity: 0,
            scrollTrigger: { trigger: root.current, start: 'top 75%', end: 'center center', scrub: 0.8 },
          })
          gsap.from(half.querySelector('[data-shirt-front]'), {
            yPercent: 18,
            opacity: 0,
            scrollTrigger: { trigger: root.current, start: 'top 80%', end: 'center 60%', scrub: 0.8 },
          })
        })
      })
      mm.add(MOTION.reduced, () => {
        gsap.from(q('[data-half]'), {
          opacity: 0,
          duration: 0.6,
          scrollTrigger: { trigger: root.current, start: 'top 70%' },
        })
      })
    },
    { scope: root, dependencies: [ready] },
  )

  return (
    <section ref={root} aria-labelledby="juntas-title" className="relative overflow-hidden">
      {/* mix-blend-difference: el título se invierte sobre cada mitad */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-4 pt-12 text-center text-cream mix-blend-difference sm:pt-16">
        <p className="font-jersey text-xs font-bold tracking-[0.35em] uppercase sm:text-sm">
          {kitsSection.together.eyebrow}
        </p>
        <h2
          id="juntas-title"
          className="mt-2 font-display text-[clamp(2rem,7vw,5.5rem)] leading-[0.95] font-extrabold"
          style={{ fontVariationSettings: '"SOFT" 60' }}
        >
          {kitsSection.together.title}
        </h2>
      </div>

      <div className="grid grid-cols-2">
        {KITS.slice(0, 2).map((kit) => (
          <div
            key={kit.id}
            data-half
            className="relative flex min-h-[78svh] flex-col items-center justify-end overflow-hidden px-2 pt-40 pb-12 text-(--kit-ink) sm:min-h-svh sm:px-6 sm:pt-48 sm:pb-16"
            style={{
              ...kitVars(kit),
              background: 'radial-gradient(90% 70% at 50% 45%, var(--kit-bg) 40%, var(--kit-bg-deep))',
            }}
          >
            <Topo tone={kit.theme.topo.tone} opacity={kit.theme.topo.opacity} parallax={10} />
            <div
              className="relative w-[min(40vw,42svh*0.72,420px)]"
              style={{ aspectRatio: `${kit.pieces.front.width} / ${kit.pieces.front.height}` }}
            >
              {ready && (
                <>
                  <KitPicture
                    data-shirt-back
                    piece={kit.pieces.back}
                    alt=""
                    aria-hidden
                    loading="lazy"
                    sizes="(min-width: 768px) 360px, 36vw"
                    className="absolute top-[-6%] left-[18%] w-[92%] opacity-60 brightness-90"
                  />
                  <KitPicture
                    data-shirt-front
                    piece={kit.pieces.front}
                    alt={`Camiseta ${kit.roleLabel.toLowerCase()} de Paisa FC (${kit.colorName.toLowerCase()}) de frente`}
                    loading="lazy"
                    sizes="(min-width: 768px) 420px, 40vw"
                    className="relative h-auto w-full drop-shadow-[0_30px_40px_rgb(0_0_0/0.35)]"
                  />
                </>
              )}
            </div>
            <div className="relative mt-6 text-center">
              <h3
                className="font-display text-3xl leading-none font-extrabold sm:text-5xl lg:text-6xl"
                style={{ fontVariationSettings: '"SOFT" 60' }}
              >
                {kit.roleLabel}
              </h3>
              <p className="mt-1 font-jersey text-sm font-bold tracking-[0.2em] text-(--kit-muted) uppercase sm:text-base">
                {kit.colorName}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
