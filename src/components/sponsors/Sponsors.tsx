import type { ComponentType } from 'react'
import { contact, sponsorsSection } from '../../data/texts'
import { CrestImage } from '../ui/CrestImage'
import { Topo } from '../ui/Topo'
import { PatchMark, TomsMark, VezzaMark } from './marks'

const MARKS: Record<string, ComponentType<{ className?: string }>> = {
  vezza: VezzaMark,
  toms: TomsMark,
  parche: PatchMark,
}

/** Sponsors que aparecen en la camiseta, redes y footer. */
export function Sponsors() {
  return (
    <section
      id="contacto"
      aria-labelledby="sponsors-title"
      className="relative isolate overflow-hidden bg-forest-deep text-cream"
    >
      <Topo opacity={0.09} parallax={10} className="-z-10" />

      <div className="mx-auto max-w-6xl px-4 pt-24 pb-16 sm:px-8 md:pt-32">
        <p className="font-jersey text-xs font-bold tracking-[0.35em] text-gold uppercase sm:text-sm">
          {sponsorsSection.eyebrow}
        </p>
        <h2
          id="sponsors-title"
          className="mt-2 font-display text-[clamp(2.4rem,6vw,4.5rem)] leading-[0.95] font-extrabold"
          style={{ fontVariationSettings: '"SOFT" 60' }}
        >
          {sponsorsSection.title}
        </h2>

        <ul className="mt-10 grid gap-4 sm:grid-cols-3">
          {sponsorsSection.sponsors.map((s) => {
            const Mark = MARKS[s.id]
            const body = (
              <>
                <span className="grid h-28 place-items-center text-gold transition-colors duration-300 group-hover:text-crest-gold">
                  {Mark && <Mark className="h-full max-h-24 w-auto max-w-[70%]" />}
                </span>
                <span className="mt-4 flex items-baseline justify-between border-t border-gold/15 pt-3">
                  <span className="font-display text-lg font-bold">{s.name}</span>
                  <span className="font-jersey text-xs font-bold tracking-[0.25em] text-cream/60 uppercase">
                    {s.where}
                  </span>
                </span>
              </>
            )
            return (
              <li key={s.id}>
                {s.href ? (
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    className="group block rounded-3xl border border-gold/15 bg-night/40 p-6 transition-colors hover:border-gold/40"
                  >
                    {body}
                  </a>
                ) : (
                  <div className="group rounded-3xl border border-gold/15 bg-night/40 p-6">{body}</div>
                )}
              </li>
            )
          })}
        </ul>

        <div className="mt-24 flex flex-col items-start justify-between gap-8 border-t border-gold/15 pt-12 md:flex-row md:items-end">
          <div>
            <p className="font-jersey text-xs font-bold tracking-[0.35em] text-gold uppercase sm:text-sm">
              {contact.eyebrow}
            </p>
            <p
              className="mt-2 font-display text-4xl font-extrabold sm:text-5xl"
              style={{ fontVariationSettings: '"SOFT" 60' }}
            >
              {contact.title}
            </p>
          </div>
          <ul className="flex flex-wrap gap-2">
            {contact.socials.map((social) => (
              <li key={social.label}>
                <a
                  href={social.href}
                  className="inline-flex items-center rounded-full border border-gold/30 px-5 py-2.5 text-sm font-semibold transition-colors hover:border-gold hover:bg-gold hover:text-forest-deep"
                >
                  {social.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <footer className="border-t border-gold/10 bg-night/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-6 text-sm text-cream/60 sm:px-8">
          <span className="flex items-center gap-3">
            <CrestImage alt="" sizes="32px" loading="lazy" className="h-8 w-auto" />
            <span className="font-jersey text-base font-extrabold tracking-wide text-cream uppercase">
              {contact.footer}
            </span>
          </span>
          <a href="#inicio" className="hover:text-cream">
            Volver arriba ↑
          </a>
        </div>
        <p className="mx-auto max-w-6xl px-4 pb-5 text-xs text-cream/40 sm:px-8">
          <a href={contact.modelCredit.href} target="_blank" rel="noopener noreferrer" className="hover:text-cream/70">
            {contact.modelCredit.text}
          </a>{' '}
          (
          <a href={contact.modelCredit.licenseHref} target="_blank" rel="noopener noreferrer" className="hover:text-cream/70">
            {contact.modelCredit.license}
          </a>
          ).
        </p>
      </footer>
    </section>
  )
}
