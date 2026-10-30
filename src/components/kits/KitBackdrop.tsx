import type { CSSProperties, Ref } from 'react'
import type { Kit } from '../../data/kits'
import { kitsSection } from '../../data/texts'
import { Topo } from '../ui/Topo'

/** Variables CSS del kit; todo lo que está adentro de la sección las usa. */
export const kitVars = (kit: Kit) =>
  ({
    '--kit-bg': kit.theme.bg,
    '--kit-bg-deep': kit.theme.bgDeep,
    '--kit-ink': kit.theme.ink,
    '--kit-muted': kit.theme.muted,
    '--kit-accent': kit.theme.accent,
    '--kit-on-accent': kit.theme.onAccent,
  }) as CSSProperties

interface KitBackdropProps {
  kit: Kit
  /** Visible aunque no esté activo: el fondo saliente durante el wipe. */
  visible: boolean
  ref?: Ref<HTMLDivElement>
}

/**
 * Fondo de un kit en la sección de camisetas: color, curvas de nivel y el título.
 * Hay uno por kit, apilados; el cambio de kit los destapa con un wipe radial. El modelo 3D va encima.
 */
export function KitBackdrop({ kit, visible, ref }: KitBackdropProps) {
  return (
    <div
      ref={ref}
      data-layer={kit.id}
      aria-hidden={!visible}
      className="absolute inset-0 overflow-hidden text-(--kit-ink)"
      style={{
        ...kitVars(kit),
        visibility: visible ? 'visible' : 'hidden',
        background: 'radial-gradient(110% 75% at 50% 45%, var(--kit-bg) 30%, var(--kit-bg-deep) 100%)',
      }}
    >
      <Topo tone={kit.theme.topo.tone} opacity={kit.theme.topo.opacity} parallax={0} />
      <header className="absolute top-20 left-4 z-20 sm:left-8 md:top-28 md:left-12 lg:left-20">
        <p className="font-jersey text-xs font-bold tracking-[0.35em] text-(--kit-accent) uppercase sm:text-sm">{kitsSection.eyebrow}</p>
        <h2 className="mt-1 font-display text-5xl leading-[0.9] font-extrabold sm:text-6xl lg:text-8xl" style={{ fontVariationSettings: '"SOFT" 60' }}>
          {kit.roleLabel}
        </h2>
        <p className="mt-1 font-jersey text-lg font-bold tracking-widest text-(--kit-muted) uppercase sm:text-xl">{kit.colorName}</p>
      </header>
    </div>
  )
}
