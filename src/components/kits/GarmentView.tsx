import type { Hotspot as HotspotData, Kit, KitPiece } from '../../data/kits'
import { asset } from '../../lib/asset'
import { KitPicture } from '../ui/KitPicture'
import { Hotspot } from './Hotspot'

interface GarmentViewProps {
  kit: Kit
  side: 'front' | 'back'
  piece: KitPiece
  hotspots: HotspotData[]
  activeId: string | null
  isDesktop: boolean
  onToggle: (id: string) => void
  eager?: boolean
  /** false: la caja y los hotspots están, la foto todavía no (se carga cuando el navegador queda libre). */
  showImage?: boolean
}

export const cardId = (kitId: string, side: string, hotspotId: string) => `${kitId}-${side}-${hotspotId}-detalle`

/**
 * Una vista de la camiseta (frente o espalda) dentro de la caja de la prenda.
 * La caja respeta la proporción de la foto para que los hotspots (en %) caigan en su lugar.
 */
export function GarmentView({
  kit,
  side,
  piece,
  hotspots,
  activeId,
  isDesktop,
  onToggle,
  eager,
  showImage = true,
}: GarmentViewProps) {
  const mask = `url(${asset(`${piece.src}-640.webp`)}) center / contain no-repeat`
  const label = side === 'front' ? 'de frente' : 'de espalda'

  return (
    <div data-view={side} className="absolute inset-0 flex items-center justify-center backface-hidden">
      <div className="relative w-full" style={{ aspectRatio: `${piece.width} / ${piece.height}` }}>
        {showImage && (
          <KitPicture
            piece={piece}
            alt={`Camiseta ${kit.roleLabel.toLowerCase()} de Paisa FC (${kit.colorName.toLowerCase()}) ${label}: ${piece.alt}`}
            loading={eager ? 'eager' : 'lazy'}
            fetchPriority={eager ? 'high' : 'low'}
            className="absolute inset-0 size-full drop-shadow-[0_40px_50px_rgb(0_0_0/0.35)]"
          />
        )}
        {/* Brillo que sigue al cursor, recortado con la silueta de la prenda */}
        {showImage && (
          <div
            aria-hidden
            data-sheen
            className="pointer-events-none absolute inset-0 opacity-(--sheen-o,0) mix-blend-soft-light transition-opacity duration-500"
            style={{
              mask,
              WebkitMask: mask,
              background:
                'radial-gradient(circle at var(--mx, 50%) var(--my, 30%), rgb(255 255 255 / 0.75), transparent 45%)',
            }}
          />
        )}
        {hotspots.map((h, i) => (
          <Hotspot
            key={h.id}
            hotspot={h}
            index={i}
            side={side}
            cardId={cardId(kit.id, side, h.id)}
            active={activeId === h.id}
            showCard={isDesktop}
            onToggle={onToggle}
          />
        ))}
      </div>
    </div>
  )
}
