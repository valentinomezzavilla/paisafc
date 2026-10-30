import { Html } from '@react-three/drei'
import type { Ref } from 'react'
import type * as THREE from 'three'
import type { Hotspot } from '../../../data/kits'
import type { AnchorId } from '../../../three/anchors'

const pad = (n: number) => String(n).padStart(2, '0')

interface HotspotPinProps {
  hotspot: Hotspot
  index: number
  position: THREE.Vector3
  active: boolean
  onSelect: (id: AnchorId) => void
  /** El escenario muestra u oculta el punto según mire o no a la cámara (data-visible + inert). */
  ref?: Ref<HTMLDivElement>
}

/** Punto numerado pegado a la tela. Es un botón real del DOM, encima del canvas. */
export function HotspotPin({ hotspot, index, position, active, onSelect, ref }: HotspotPinProps) {
  return (
    <Html position={position} center zIndexRange={[40, 10]} style={{ pointerEvents: 'none' }}>
      <div
        ref={ref}
        data-visible="false"
        inert
        className="opacity-0 transition-[opacity,scale] duration-300 data-[visible=true]:opacity-100 data-[visible=false]:scale-50"
      >
        <button
          type="button"
          aria-expanded={active}
          aria-controls="kit-detalle"
          aria-label={`${pad(index + 1)}. ${hotspot.title}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onSelect(hotspot.id)}
          className={`pointer-events-auto relative grid size-9 cursor-pointer place-items-center rounded-full font-jersey text-sm font-extrabold transition-[background-color,color,scale] duration-300 md:size-10 ${
            active ? 'scale-110 bg-(--kit-accent) text-(--kit-on-accent)' : 'bg-(--kit-bg)/70 text-(--kit-ink) backdrop-blur-sm hover:scale-110'
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
    </Html>
  )
}
