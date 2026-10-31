import { useRef } from 'react'
import { KITS, type Kit } from '../../data/kits'
import { fullKitsSection } from '../../data/texts'
import { asset } from '../../lib/asset'
import { gsap, MOTION, useGSAP } from '../../lib/gsap'
import { Topo } from '../ui/Topo'
import { kitVars } from './KitBackdrop'

/** Medidas de los recortes (scripts/prepare_full_kits.py), para reservar el lugar antes de que carguen. */
const SIZE = [1120, 3220] as const
const SMALL = 640

function Figure({ kit, side, label }: { kit: Kit; side: 'frente' | 'espalda'; label: string }) {
  const src = `assets/kits/completa/${kit.id}-${side}`
  return (
    <figure data-full-figure className="flex h-full min-h-0 flex-col items-center">
      <img
        src={asset(`${src}.webp`)}
        srcSet={`${asset(`${src}-${SMALL}.webp`)} ${SMALL}w, ${asset(`${src}.webp`)} ${SIZE[0]}w`}
        sizes="(min-width: 1024px) 18vw, 40vw"
        width={SIZE[0]}
        height={SIZE[1]}
        alt={`Equipación ${kit.roleLabel.toLowerCase()} completa de Paisa FC, de ${label.toLowerCase()}`}
        loading="lazy"
        decoding="async"
        draggable={false}
        className="min-h-0 w-auto flex-1 object-contain object-bottom drop-shadow-[0_24px_30px_rgba(0,0,0,0.28)]"
      />
      <figcaption className="mt-3 font-jersey text-xs font-bold tracking-[0.3em] text-(--kit-muted) uppercase">{label}</figcaption>
    </figure>
  )
}

/** Una equipación sobre su color: el nombre y las prendas a un lado, frente y espalda al otro. */
function FullKit({ kit, flip }: { kit: Kit; flip: boolean }) {
  return (
    <article
      aria-labelledby={`completa-${kit.id}`}
      className="relative overflow-hidden text-(--kit-ink)"
      style={{ ...kitVars(kit), background: 'radial-gradient(110% 75% at 50% 45%, var(--kit-bg) 30%, var(--kit-bg-deep) 100%)' }}
    >
      <Topo tone={kit.theme.topo.tone} opacity={kit.theme.topo.opacity} parallax={10} />
      <div
        className={`relative mx-auto grid max-w-6xl items-center gap-8 px-4 py-16 sm:px-8 md:py-24 lg:min-h-svh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-16 ${flip ? 'lg:[&>*:first-child]:order-2' : ''}`}
      >
        <div data-full-copy>
          <p className="font-jersey text-xs font-bold tracking-[0.35em] text-(--kit-accent) uppercase sm:text-sm">{fullKitsSection.eyebrow}</p>
          <h2
            id={`completa-${kit.id}`}
            className="mt-2 font-display text-[clamp(2.6rem,7vw,5rem)] leading-[0.95] font-extrabold"
            style={{ fontVariationSettings: '"SOFT" 60' }}
          >
            {kit.roleLabel}
          </h2>
          <p className="mt-1 font-jersey text-sm font-bold tracking-[0.2em] text-(--kit-muted) uppercase sm:text-base">{kit.colorName}</p>
          <dl className="mt-8 space-y-3 border-t border-current/15 pt-6 text-sm sm:text-base">
            {fullKitsSection.pieces[kit.id].map((p) => (
              <div key={p.label} className="grid grid-cols-[6.5rem_1fr] gap-3">
                <dt className="font-jersey font-bold tracking-[0.15em] text-(--kit-accent) uppercase">{p.label}</dt>
                <dd className="text-(--kit-muted)">{p.text}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="grid h-[min(78svh,46rem)] grid-cols-2 gap-4 sm:gap-8">
          <Figure kit={kit} side="frente" label={fullKitsSection.front} />
          <Figure kit={kit} side="espalda" label={fullKitsSection.back} />
        </div>
      </div>
    </article>
  )
}

/** Cada equipación por separado, de la cabeza a los botines (recortes del mockup). */
export function KitsComplete() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION.full, () => {
        for (const article of gsap.utils.toArray<HTMLElement>('article', root.current)) {
          const q = gsap.utils.selector(article)
          gsap.from(q('[data-full-figure]'), {
            y: 48,
            opacity: 0,
            stagger: 0.12,
            duration: 0.9,
            ease: 'power3.out',
            scrollTrigger: { trigger: article, start: 'top 70%' },
          })
          gsap.from(q('[data-full-copy] > *'), {
            y: 20,
            opacity: 0,
            stagger: 0.06,
            duration: 0.7,
            ease: 'power2.out',
            scrollTrigger: { trigger: article, start: 'top 70%' },
          })
        }
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} aria-label={fullKitsSection.eyebrow}>
      {KITS.slice(0, 2).map((kit, i) => (
        <FullKit key={kit.id} kit={kit} flip={i % 2 === 1} />
      ))}
    </section>
  )
}
