import type { Kit } from '../../data/kits'
import { asset } from '../../lib/asset'
import type { KitView } from '../../three/KitModel'

/** Medidas de los pósters (scripts/snap-posters.mjs): la vista de camiseta y la del conjunto. */
export const POSTER_SIZE: Record<KitView, [number, number]> = { shirt: [900, 1000], full: [560, 1000] }

/**
 * Render fijo del modelo 3D: se ve en el HTML prerenderizado y mientras carga el visor, y queda si el
 * navegador no tiene WebGL.
 */
export function KitPoster({ kit, view, className = '', loading }: { kit: Kit; view: KitView; className?: string; loading?: 'lazy' | 'eager' }) {
  const [w, h] = POSTER_SIZE[view]
  const src = `assets/kits/3d/posters/${kit.id}-${view}`
  return (
    <img
      src={asset(`${src}.webp`)}
      srcSet={`${asset(`${src}-640.webp`)} 640w, ${asset(`${src}.webp`)} ${w}w`}
      sizes="(min-width: 768px) 40vw, 80vw"
      width={w}
      height={h}
      alt={`${view === 'full' ? 'Conjunto' : 'Camiseta'} ${kit.roleLabel.toLowerCase()} de Paisa FC (${kit.colorName.toLowerCase()})`}
      decoding="async"
      loading={loading}
      draggable={false}
      className={`object-contain ${className}`}
    />
  )
}
