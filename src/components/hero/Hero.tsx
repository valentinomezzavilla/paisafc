import { useRef } from 'react'
import { KITS } from '../../data/kits'
import { hero } from '../../data/texts'
import { asset } from '../../lib/asset'
import { gsap, MOTION, SplitText, useGSAP } from '../../lib/gsap'
import { CrestImage } from '../ui/CrestImage'
import { Topo } from '../ui/Topo'

const crestMask = `url(${asset('assets/escudo/escudo-512.webp')}) center / contain no-repeat`

export function Hero() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const q = gsap.utils.selector(root)
      const mm = gsap.matchMedia()

      mm.add(MOTION.full, () => {
        const split = SplitText.create(q('[data-hero-title]'), { type: 'chars', mask: 'chars' })
        const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })

        tl.from(q('[data-glow]'), { opacity: 0, scale: 0.4, duration: 2.4, ease: 'power2.out' })
          .from(
            q('[data-crest]'),
            { clipPath: 'inset(100% 0% 0% 0%)', yPercent: 8, scale: 1.12, duration: 1.8 },
            0.2,
          )
          .from(q('[data-crest] img'), { filter: 'blur(14px) brightness(1.6)', duration: 1.6, ease: 'power2.out' }, 0.2)
          .fromTo(
            q('[data-sheen]'),
            { backgroundPosition: '160% 0' },
            { backgroundPosition: '-60% 0', duration: 1.6, ease: 'power2.inOut' },
            1.1,
          )
          .from(split.chars, { yPercent: 110, duration: 1.2, stagger: 0.05 }, 0.9)
          .from(q('[data-fade]'), { opacity: 0, y: 18, duration: 1, stagger: 0.1 }, 1.3)

        // Al bajar, el escudo se aleja y deja paso a las camisetas.
        gsap.to(q('[data-crest-wrap]'), {
          yPercent: -12,
          scale: 0.88,
          opacity: 0.25,
          ease: 'none',
          scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true },
        })

        return () => split.revert()
      })

      mm.add(MOTION.reduced, () => {
        gsap.from(q('[data-crest], [data-hero-title], [data-fade]'), { opacity: 0, duration: 0.6, stagger: 0.08 })
      })
    },
    { scope: root },
  )

  return (
    <section
      id="inicio"
      ref={root}
      className="relative isolate flex min-h-svh flex-col items-center justify-center overflow-hidden px-4 pt-20 pb-24 text-center"
      style={{
        background:
          'radial-gradient(120% 80% at 50% 40%, var(--color-forest) 0%, var(--color-forest-deep) 45%, var(--color-night) 100%)',
      }}
    >
      <Topo color="color-mix(in oklab, var(--color-gold) 14%, transparent)" parallax={18} className="-z-10" />

      {/* Destello dorado detrás del escudo */}
      <div
        data-glow
        aria-hidden
        className="absolute top-[38%] left-1/2 -z-10 aspect-square w-[130vw] max-w-[900px] -translate-1/2 rounded-full opacity-70"
        style={{
          background:
            'radial-gradient(closest-side, color-mix(in oklab, var(--color-crest-gold) 38%, transparent), transparent 70%)',
        }}
      />

      <div data-crest-wrap className="relative w-[min(62vw,34svh,340px)] sm:w-[min(40vw,36svh,400px)]">
        <div data-crest className="relative">
          <CrestImage
            alt="Escudo de Paisa FC: un paisano con sombrero, poncho y vaso en alto, sobre la cinta con el nombre del club"
            fetchPriority="high"
            className="h-auto w-full drop-shadow-[0_30px_60px_rgb(0_0_0/0.45)]"
          />
          {/* Brillo que cruza el escudo una vez, recortado con la forma del escudo */}
          <div
            data-sheen
            aria-hidden
            className="pointer-events-none absolute inset-0 mix-blend-overlay"
            style={{
              mask: crestMask,
              WebkitMask: crestMask,
              backgroundImage:
                'linear-gradient(105deg, transparent 35%, rgb(255 236 170 / 0.85) 50%, transparent 65%)',
              backgroundSize: '250% 100%',
              backgroundPosition: '-60% 0',
            }}
          />
        </div>
      </div>

      <p data-fade className="mt-8 font-jersey text-sm font-bold tracking-[0.35em] text-gold uppercase">
        {hero.eyebrow}
      </p>
      <h1
        data-hero-title
        className="mt-2 font-display text-[clamp(3.5rem,15vw,9rem)] leading-[0.9] font-extrabold tracking-tight text-cream"
        style={{ fontVariationSettings: '"SOFT" 60' }}
      >
        {hero.title}
      </h1>
      <p data-fade className="mt-5 max-w-md text-base text-balance text-cream/80 sm:text-lg">
        {hero.tagline}
      </p>

      <ul data-fade className="mt-6 flex flex-wrap justify-center gap-2" aria-label="Camisetas">
        {KITS.map((kit) => (
          <li key={kit.id}>
            <a
              href="#camisetas"
              className="flex items-center gap-2 rounded-full border border-gold/30 px-3.5 py-1.5 text-sm text-cream/90 transition-colors hover:border-gold hover:text-cream"
            >
              <span
                aria-hidden
                className="size-3 rounded-full ring-1 ring-gold/60"
                style={{ background: kit.theme.bg }}
              />
              <span className="font-semibold">{kit.roleLabel}</span>
              <span className="text-cream/60">· {kit.colorName}</span>
            </a>
          </li>
        ))}
      </ul>

      <a
        data-fade
        href="#camisetas"
        className="group absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-xs tracking-[0.25em] text-cream/60 uppercase"
      >
        {hero.scrollHint}
        <span aria-hidden className="relative block h-10 w-px overflow-hidden bg-cream/20">
          <span className="absolute inset-x-0 top-0 h-1/2 animate-[scroll-hint_1.8s_ease-in-out_infinite] bg-gold motion-reduce:animate-none" />
        </span>
      </a>
    </section>
  )
}
