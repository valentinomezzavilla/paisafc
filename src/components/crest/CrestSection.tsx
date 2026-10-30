import { useRef, useState, type CSSProperties } from 'react'
import { crestSection } from '../../data/texts'
import { asset } from '../../lib/asset'
import { gsap, MOTION, useGSAP } from '../../lib/gsap'
import { CrestImage } from '../ui/CrestImage'
import { Topo } from '../ui/Topo'

const pad = (n: number) => String(n).padStart(2, '0')
const crestMask = `url(${asset('assets/escudo/escudo-512.webp')}) center / contain no-repeat`

/** El escudo grande con un desglose de sus partes: tocar una la ilumina y oscurece el resto. */
export function CrestSection() {
  const root = useRef<HTMLElement>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const parts = crestSection.parts
  const active = parts.find((p) => p.id === activeId)

  useGSAP(
    () => {
      const q = gsap.utils.selector(root)
      const mm = gsap.matchMedia()
      mm.add(MOTION.full, () => {
        gsap.from(q('[data-crest-big]'), {
          scale: 0.82,
          rotate: -4,
          opacity: 0,
          ease: 'power2.out',
          scrollTrigger: { trigger: root.current, start: 'top 80%', end: 'top 20%', scrub: 0.8 },
        })
        gsap.from(q('[data-part-pin]'), {
          scale: 0,
          opacity: 0,
          stagger: 0.08,
          duration: 0.5,
          ease: 'back.out(2)',
          scrollTrigger: { trigger: q('[data-crest-big]')[0], start: 'top 55%' },
        })
        gsap.from(q('[data-part-item], [data-crest-copy]'), {
          y: 24,
          opacity: 0,
          stagger: 0.06,
          duration: 0.7,
          ease: 'power2.out',
          scrollTrigger: { trigger: root.current, start: 'top 55%' },
        })
      })
    },
    { scope: root },
  )

  const toggle = (id: string) => setActiveId((cur) => (cur === id ? null : id))

  const spot = {
    '--spot-x': `${active?.x ?? 50}%`,
    '--spot-y': `${active?.y ?? 40}%`,
    '--spot-r': active ? '16%' : '100%',
  } as CSSProperties

  return (
    <section
      id="escudo"
      ref={root}
      aria-labelledby="escudo-title"
      className="relative isolate overflow-hidden bg-night px-4 py-24 sm:px-8 md:py-32"
    >
      <Topo color="color-mix(in oklab, var(--color-gold) 10%, transparent)" parallax={14} className="-z-10" />

      <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-[1.1fr_1fr] md:gap-16">
        <div className="relative mx-auto w-full max-w-[520px]" style={spot}>
          <div
            aria-hidden
            className="absolute inset-[8%] -z-10 rounded-full blur-3xl"
            style={{ background: 'radial-gradient(closest-side, color-mix(in oklab, var(--color-crest-gold) 30%, transparent), transparent)' }}
          />
          <div data-crest-big className="relative">
            <CrestImage
              alt="Escudo de Paisa FC en grande"
              loading="lazy"
              sizes="(min-width: 768px) 520px, 92vw"
              className="h-auto w-full"
            />
            {/* Foco: oscurece todo menos la parte elegida */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 transition-[--spot-x,--spot-y,--spot-r,opacity] duration-700 ease-[cubic-bezier(.2,.8,.2,1)]"
              style={{
                mask: crestMask,
                WebkitMask: crestMask,
                opacity: active ? 1 : 0,
                background:
                  'radial-gradient(circle at var(--spot-x) var(--spot-y), transparent calc(var(--spot-r) * 0.7), rgb(10 33 17 / 0.72) var(--spot-r))',
              }}
            />
            {parts.map((part, i) => (
              <button
                key={part.id}
                data-part-pin
                type="button"
                onClick={() => toggle(part.id)}
                aria-pressed={activeId === part.id}
                aria-label={`${pad(i + 1)}. ${part.title}`}
                className={`absolute grid size-8 -translate-1/2 place-items-center rounded-full font-jersey text-xs font-extrabold ring-2 ring-crest-gold transition-colors duration-300 sm:size-9 sm:text-sm ${
                  activeId === part.id ? 'bg-crest-gold text-forest-deep' : 'bg-night/75 text-cream backdrop-blur-sm hover:bg-forest'
                }`}
                style={{ left: `${part.x}%`, top: `${part.y}%` }}
              >
                {pad(i + 1)}
              </button>
            ))}
          </div>
          {/* En mobile la lista queda abajo: la parte elegida se lee acá mismo */}
          <p aria-live="polite" className="mt-4 min-h-12 text-center text-sm text-cream/80 md:hidden">
            {active && (
              <>
                <span className="font-display font-bold text-cream">{active.title}.</span> {active.text}
              </>
            )}
          </p>
        </div>

        <div>
          <div data-crest-copy>
            <p className="font-jersey text-xs font-bold tracking-[0.35em] text-gold uppercase sm:text-sm">
              {crestSection.eyebrow}
            </p>
            <h2
              id="escudo-title"
              className="mt-2 font-display text-[clamp(2.4rem,6vw,4.5rem)] leading-[0.95] font-extrabold text-cream"
              style={{ fontVariationSettings: '"SOFT" 60' }}
            >
              {crestSection.title}
            </h2>
            <p className="mt-4 text-cream/70">{crestSection.intro}</p>
          </div>

          <ol className="mt-8 divide-y divide-gold/15 border-y border-gold/15">
            {parts.map((part, i) => {
              const isActive = activeId === part.id
              return (
                <li key={part.id} data-part-item>
                  <button
                    type="button"
                    onClick={() => toggle(part.id)}
                    aria-expanded={isActive}
                    aria-controls={`parte-${part.id}`}
                    className="group flex w-full items-baseline gap-4 py-4 text-left"
                  >
                    <span className={`font-jersey text-sm font-extrabold transition-colors ${isActive ? 'text-crest-gold' : 'text-gold/60'}`}>
                      {pad(i + 1)}
                    </span>
                    <span className="flex-1">
                      <span
                        className={`block font-display text-xl font-bold transition-colors sm:text-2xl ${
                          isActive ? 'text-cream' : 'text-cream/75 group-hover:text-cream'
                        }`}
                      >
                        {part.title}
                      </span>
                      <span
                        id={`parte-${part.id}`}
                        className={`grid transition-[grid-template-rows,opacity] duration-500 ${isActive ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                      >
                        <span className="overflow-hidden">
                          <span className="block pt-1.5 text-sm text-cream/70 sm:text-base">{part.text}</span>
                        </span>
                      </span>
                    </span>
                    <span
                      aria-hidden
                      className={`text-lg text-gold transition-transform duration-300 ${isActive ? 'rotate-45' : ''}`}
                    >
                      +
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </section>
  )
}
