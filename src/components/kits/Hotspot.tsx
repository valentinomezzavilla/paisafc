import type { Hotspot as HotspotData } from '../../data/kits'

interface HotspotProps {
  hotspot: HotspotData
  index: number
  side: 'front' | 'back'
  cardId: string
  active: boolean
  /** En desktop la tarjeta va pegada al punto; en mobile se muestra abajo (HotspotCard suelta). */
  showCard: boolean
  onToggle: (id: string) => void
}

const pad = (n: number) => String(n).padStart(2, '0')

export function Hotspot({ hotspot, index, side, cardId, active, showCard, onToggle }: HotspotProps) {
  const toLeft = hotspot.x < 50

  return (
    <div
      data-hotspot={`${side}-${index}`}
      className="absolute z-10 -translate-1/2"
      style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
    >
      <button
        type="button"
        aria-expanded={active}
        aria-controls={cardId}
        aria-label={`${pad(index + 1)}. ${hotspot.title}`}
        onClick={() => onToggle(hotspot.id)}
        className={`group relative grid size-9 place-items-center rounded-full font-jersey text-sm font-extrabold transition-[background-color,color,transform] duration-300 md:size-10 ${
          active
            ? 'scale-110 bg-(--kit-accent) text-(--kit-on-accent)'
            : 'bg-(--kit-bg)/70 text-(--kit-ink) backdrop-blur-sm'
        }`}
      >
        <span
          aria-hidden
          className={`absolute inset-0 rounded-full ring-2 ring-(--kit-accent) ${active ? '' : 'animate-[hotspot-pulse_2.4s_ease-out_infinite] motion-reduce:animate-none'}`}
        />
        <span aria-hidden className="absolute inset-0 rounded-full ring-1 ring-(--kit-accent)" />
        {pad(index + 1)}
      </button>

      {showCard && active && (
        <HotspotCard
          id={cardId}
          hotspot={hotspot}
          index={index}
          className={`absolute top-1/2 w-60 -translate-y-1/2 ${toLeft ? 'right-[calc(100%+14px)]' : 'left-[calc(100%+14px)]'}`}
        />
      )}
    </div>
  )
}

export function HotspotCard({
  id,
  hotspot,
  index,
  className = '',
}: {
  id: string
  hotspot: HotspotData
  index: number
  className?: string
}) {
  return (
    <div
      id={id}
      role="note"
      className={`animate-[card-in_.35s_cubic-bezier(.2,.8,.2,1)] rounded-2xl border border-(--kit-accent)/40 bg-(--kit-bg)/85 p-4 text-left text-(--kit-ink) shadow-[0_20px_50px_-20px_rgb(0_0_0/0.5)] backdrop-blur-md motion-reduce:animate-none ${className}`}
    >
      <p className="font-jersey text-xs font-bold tracking-[0.25em] text-(--kit-accent) uppercase">
        {pad(index + 1)} · Detalle
      </p>
      <p className="mt-1 font-display text-xl leading-tight font-bold">{hotspot.title}</p>
      <p className="mt-1.5 text-sm leading-snug text-(--kit-muted)">{hotspot.text}</p>
    </div>
  )
}
