import type { Ref } from 'react'
import type { Hotspot } from '../../../data/kits'
import type { AnchorId } from '../../../three/anchors'

const pad = (n: number) => String(n).padStart(2, '0')

interface HotspotPinProps {
  hotspot: Hotspot
  index: number
  active: boolean
  onSelect: (id: AnchorId) => void
  /**
   * El escenario 3D lo ubica cuadro a cuadro (transform) y lo muestra u oculta según el detalle mire o
   * no a la cámara (data-visible + inert).
   */
  ref?: Ref<HTMLDivElement>
}

/** Punto numerado pegado a la tela. Es un botón real del DOM, encima del canvas. */
export function HotspotPin({ hotspot, index, active, onSelect, ref }: HotspotPinProps) {
  return (
    <div
      ref={ref}
      data-visible="false"
      inert
      className="group/pin absolute top-0 left-0 z-20 opacity-0 transition-opacity duration-300 will-change-transform data-[visible=true]:opacity-100"
    >
      <button
        type="button"
        aria-expanded={active}
        aria-controls="kit-detalle"
        aria-label={`${pad(index + 1)}. ${hotspot.title}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => onSelect(hotspot.id)}
        className={`relative grid size-8 -translate-1/2 cursor-pointer place-items-center rounded-full font-jersey text-xs font-extrabold transition-[background-color,color,scale] duration-300 group-data-[visible=false]/pin:scale-50 ${
          active ? 'scale-110 bg-(--kit-accent) text-(--kit-on-accent)' : 'bg-(--kit-bg)/75 text-(--kit-ink) backdrop-blur-sm hover:scale-110'
        }`}
      >
        <span
          aria-hidden
          className={`absolute inset-0 rounded-full ring-2 ring-(--kit-accent) ${active ? '' : 'animate-[hotspot-pulse_2.4s_ease-out_infinite] motion-reduce:animate-none'}`}
        />
        <span aria-hidden className="absolute inset-0 rounded-full ring-1 ring-(--kit-accent)" />
        {pad(index + 1)}
      </button>
    </div>
  )
}
