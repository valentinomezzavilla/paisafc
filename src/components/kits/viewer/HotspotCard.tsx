import type { Hotspot } from '../../../data/kits'
import { kitsSection } from '../../../data/texts'

const pad = (n: number) => String(n).padStart(2, '0')

/** Tarjeta del detalle abierto. En desktop va al costado del modelo; en mobile, abajo. */
export function HotspotCard({ hotspot, index, onClose, className = '' }: { hotspot: Hotspot; index: number; onClose: () => void; className?: string }) {
  return (
    <div
      id="kit-detalle"
      role="note"
      className={`animate-[card-in_.35s_cubic-bezier(.2,.8,.2,1)] rounded-2xl border border-(--kit-accent)/40 bg-(--kit-bg)/85 p-4 pr-11 text-left text-(--kit-ink) shadow-[0_20px_50px_-20px_rgb(0_0_0/0.5)] backdrop-blur-md motion-reduce:animate-none ${className}`}
    >
      <p className="font-jersey text-xs font-bold tracking-[0.25em] text-(--kit-accent) uppercase">{pad(index + 1)} · Detalle</p>
      <p className="mt-1 font-display text-xl leading-tight font-bold">{hotspot.title}</p>
      <p className="mt-1.5 text-sm leading-snug text-(--kit-muted)">{hotspot.text}</p>
      <button
        type="button"
        onClick={onClose}
        aria-label={kitsSection.closeDetail}
        className="absolute top-3 right-3 grid size-7 place-items-center rounded-full text-(--kit-muted) transition-colors hover:bg-(--kit-accent)/15 hover:text-(--kit-ink)"
      >
        <svg viewBox="0 0 16 16" aria-hidden className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M3 3l10 10M13 3L3 13" />
        </svg>
      </button>
    </div>
  )
}
