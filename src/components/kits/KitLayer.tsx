import type { CSSProperties, Ref } from 'react'
import type { Kit } from '../../data/kits'
import { kitsSection } from '../../data/texts'
import { KitPicture } from '../ui/KitPicture'
import { Topo } from '../ui/Topo'
import { cardId, GarmentView } from './GarmentView'
import { HotspotCard } from './Hotspot'
import type { Step } from './steps'

/** Variables CSS del kit; todo lo que está adentro de la capa las usa. */
export const kitVars = (kit: Kit) =>
  ({
    '--kit-bg': kit.theme.bg,
    '--kit-bg-deep': kit.theme.bgDeep,
    '--kit-ink': kit.theme.ink,
    '--kit-muted': kit.theme.muted,
    '--kit-accent': kit.theme.accent,
    '--kit-on-accent': kit.theme.onAccent,
  }) as CSSProperties

interface KitLayerProps {
  kit: Kit
  active: boolean
  /** Visible aunque no esté activa: la capa saliente durante el wipe. */
  visible: boolean
  step: Step
  activeHotspot: string | null
  isDesktop: boolean
  /** Hasta que el navegador queda libre solo se carga el frente del kit activo. */
  assetsReady: boolean
  onToggleHotspot: (id: string) => void
  ref?: Ref<HTMLDivElement>
}

/**
 * Todo lo que se ve de un kit en la sección fija. Hay una capa por kit, apiladas;
 * la línea de tiempo anima las mismas piezas en todas, por eso el paso se mantiene
 * al cambiar de kit.
 */
export function KitLayer({
  kit,
  active,
  visible,
  step,
  activeHotspot,
  isDesktop,
  assetsReady,
  onToggleHotspot,
  ref,
}: KitLayerProps) {
  const side = step === 'back' ? 'back' : 'front'
  const hotspots = side === 'front' ? kit.frontHotspots : kit.backHotspots
  const mobileIndex = hotspots.findIndex((h) => h.id === activeHotspot)

  return (
    <div
      ref={ref}
      data-layer={kit.id}
      inert={!active}
      aria-hidden={!active}
      className="absolute inset-0 overflow-hidden text-(--kit-ink)"
      style={{
        ...kitVars(kit),
        visibility: visible ? 'visible' : 'hidden',
        background: 'radial-gradient(110% 75% at 50% 45%, var(--kit-bg) 30%, var(--kit-bg-deep) 100%)',
      }}
    >
      <Topo tone={kit.theme.topo.tone} opacity={kit.theme.topo.opacity} parallax={0} />

      <span
        data-big-number
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-jersey text-[clamp(22rem,78svh,52rem)] leading-none font-black text-transparent opacity-30 select-none [-webkit-text-stroke:2px_var(--kit-accent)]"
      >
        11
      </span>

      <header data-kit-head className="absolute top-20 left-4 z-20 sm:left-8 md:top-28 md:left-12 lg:left-20">
        <p className="font-jersey text-xs font-bold tracking-[0.35em] text-(--kit-accent) uppercase sm:text-sm">
          {kitsSection.eyebrow}
        </p>
        <h2
          className="mt-1 font-display text-5xl leading-[0.9] font-extrabold sm:text-6xl lg:text-8xl"
          style={{ fontVariationSettings: '"SOFT" 60' }}
        >
          {kit.roleLabel}
        </h2>
        <p className="mt-1 font-jersey text-lg font-bold tracking-widest text-(--kit-muted) uppercase sm:text-xl">
          {kit.colorName}
        </p>
      </header>

      {/* Escenario: perspectiva para el giro, tilt del mouse y ensamblado del kit completo */}
      <div className="absolute inset-0 flex items-center justify-center pt-28 pb-36 [perspective:1600px] md:pt-16 md:pb-24">
        <div data-tilt className="transform-3d">
          <div
            data-assembly
            className="relative w-(--shirt-w) transform-3d"
            style={{ aspectRatio: `${kit.pieces.front.width} / ${kit.pieces.front.height}` }}
          >
            {/* Short y medias: debajo de la camiseta, aparecen en "kit completo" */}
            <div data-piece="shorts" className="absolute top-[99%] left-1/2 w-[83%] -translate-x-1/2 opacity-0">
              {assetsReady && (
                <KitPicture
                  piece={kit.pieces.shorts}
                  alt={`Short de la ${kit.roleLabel.toLowerCase()} de Paisa FC: ${kit.pieces.shorts.alt}`}
                  loading="lazy"
                  sizes="(min-width: 768px) 260px, 40vw"
                  className="h-auto w-full"
                />
              )}
            </div>
            <div data-piece="socks" className="absolute top-[153%] left-1/2 w-[96%] -translate-x-1/2 opacity-0">
              {assetsReady && (
                <KitPicture
                  piece={kit.pieces.socks}
                  alt={`Medias de la ${kit.roleLabel.toLowerCase()} de Paisa FC: ${kit.pieces.socks.alt}`}
                  loading="lazy"
                  sizes="(min-width: 768px) 300px, 44vw"
                  className="h-auto w-full"
                />
              )}
            </div>
            <GarmentView
              kit={kit}
              side="front"
              piece={kit.pieces.front}
              hotspots={kit.frontHotspots}
              activeId={side === 'front' ? activeHotspot : null}
              isDesktop={isDesktop}
              onToggle={onToggleHotspot}
              showImage={active || assetsReady}
            />
            <GarmentView
              kit={kit}
              side="back"
              piece={kit.pieces.back}
              hotspots={kit.backHotspots}
              activeId={side === 'back' ? activeHotspot : null}
              isDesktop={isDesktop}
              onToggle={onToggleHotspot}
              showImage={assetsReady}
            />
          </div>
        </div>
      </div>

      {!isDesktop && step !== 'full' && mobileIndex >= 0 && (
        <div
          // Si el punto está en la mitad de abajo, la tarjeta va arriba para no taparlo.
          className={`absolute inset-x-4 z-30 ${hotspots[mobileIndex].y > 55 ? 'top-44' : 'bottom-32'}`}
        >
          <HotspotCard
            key={hotspots[mobileIndex].id}
            id={cardId(kit.id, side, hotspots[mobileIndex].id)}
            hotspot={hotspots[mobileIndex]}
            index={mobileIndex}
          />
        </div>
      )}
    </div>
  )
}
