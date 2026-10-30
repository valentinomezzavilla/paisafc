/**
 * Kits del club. Todo lo que muestra la sección de camisetas sale de acá.
 *
 * ¿Cuál es titular y cuál suplente? Se define SOLO en `ROLES` (abajo).
 * Para invertirlos, cambiá esa línea. Para agregar un tercer kit, sumá su id
 * a `KitId`, su rol a `ROLES` y su objeto a `KIT_LIST`.
 */

import type { TopoTone } from '../components/ui/Topo'
import type { AnchorId } from '../three/anchors'

export type KitId = 'verde' | 'crema'
export type KitRole = 'titular' | 'suplente' | 'alternativa'

// ← ÚNICO lugar donde se asigna titular / suplente.
export const ROLES: Record<KitId, KitRole> = { verde: 'titular', crema: 'suplente' }

export const ROLE_LABEL: Record<KitRole, string> = {
  titular: 'Titular',
  suplente: 'Suplente',
  alternativa: 'Alternativa',
}
const ROLE_ORDER: KitRole[] = ['titular', 'suplente', 'alternativa']

/** Un detalle tocable. `id` es también su ancla sobre la prenda 3D: dónde va, en `src/three/anchors.ts`. */
export interface Hotspot {
  id: AnchorId
  title: string
  text: string
}

/** Variables CSS que toma la sección cuando el kit está activo. */
export interface KitTheme {
  bg: string // fondo de la sección
  bgDeep: string // degradé / viñeta
  ink: string // texto principal
  muted: string // texto secundario
  accent: string // detalles, hotspots, contornos
  onAccent: string // texto sobre el acento
  topo: { tone: TopoTone; opacity: number } // curvas de nivel del fondo
}

export interface KitData {
  id: KitId
  colorName: string
  theme: KitTheme
  /** En el orden en que se numeran: frente, espalda y short. */
  hotspots: Hotspot[]
}

export interface Kit extends KitData {
  role: KitRole
  roleLabel: string
  /** "Titular · Verde bosque" */
  fullName: string
}

const KIT_LIST: KitData[] = [
  {
    id: 'verde',
    colorName: 'Verde bosque',
    theme: {
      bg: 'var(--color-forest-deep)',
      bgDeep: '#0a2111',
      ink: 'var(--color-cream)',
      muted: 'color-mix(in oklab, var(--color-cream) 70%, transparent)',
      accent: 'var(--color-gold)',
      onAccent: 'var(--color-forest-deep)',
      topo: { tone: 'gold', opacity: 0.16 },
    },
    hotspots: [
      { id: 'cuello', title: 'Cuello polo', text: 'Solapa en V con ribete dorado.' },
      { id: 'escudo', title: 'El escudo', text: 'Sobre el pecho izquierdo, del lado del corazón.' },
      { id: 'vezza', title: 'VEZZA', text: 'El logo del sponsor, centrado en el pecho.' },
      { id: 'parche', title: 'Parche de manga', text: 'Círculo con la “R” y el rayo.' },
      { id: 'punos', title: 'Puños', text: 'Franjas doradas que cierran la manga.' },
      {
        id: 'textura',
        title: 'Curvas de nivel',
        text: 'Textura topográfica en toda la tela, como un mapa del pago.',
      },
      { id: 'nombre', title: 'MEZZAVILLA', text: 'Nombre en la espalda, en dorado.' },
      { id: 'numero', title: 'El 11', text: 'Número grande con contorno.' },
      { id: 'sponsor', title: 'Tom’s Burger', text: 'Sponsor trasero en letra script retro.' },
      { id: 'shortEscudo', title: 'Escudo en el short', text: 'Abajo, en la pierna derecha, junto a la franja dorada.' },
    ],
  },
  {
    id: 'crema',
    colorName: 'Crema',
    theme: {
      bg: 'var(--color-cream)',
      bgDeep: 'var(--color-cream-shade)',
      ink: 'var(--color-forest-deep)',
      muted: 'color-mix(in oklab, var(--color-forest-deep) 72%, transparent)',
      accent: 'var(--color-forest)',
      onAccent: 'var(--color-cream)',
      topo: { tone: 'forest', opacity: 0.14 },
    },
    hotspots: [
      { id: 'cuello', title: 'Cuello polo', text: 'Solapa en V con ribete verde y dorado.' },
      { id: 'escudo', title: 'El escudo', text: 'Sobre el pecho izquierdo, del lado del corazón.' },
      { id: 'vezza', title: 'VEZZA', text: 'El logo del sponsor, centrado en el pecho.' },
      { id: 'parche', title: 'Parche de manga', text: 'Círculo con la “R” y el rayo.' },
      { id: 'punos', title: 'Puños', text: 'Franjas verde y dorada que cierran la manga.' },
      { id: 'textura', title: 'Textura', text: 'Curvas de nivel apenas marcadas en la tela.' },
      { id: 'nombre', title: 'MEZZAVILLA', text: 'Nombre en la espalda, en verde.' },
      { id: 'numero', title: 'El 11', text: 'Número grande con contorno.' },
      { id: 'sponsor', title: 'Tom’s Burger', text: 'Sponsor trasero en letra script retro.' },
      { id: 'shortEscudo', title: 'Escudo en el short', text: 'Abajo, en la pierna derecha, junto a la franja crema.' },
    ],
  },
]

export const KITS: Kit[] = KIT_LIST.map((kit) => {
  const role = ROLES[kit.id]
  return { ...kit, role, roleLabel: ROLE_LABEL[role], fullName: `${ROLE_LABEL[role]} · ${kit.colorName}` }
}).sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role))

/** El sitio abre en la titular. */
export const DEFAULT_KIT: Kit = KITS.find((k) => k.role === 'titular') ?? KITS[0]

export const getKit = (id: KitId): Kit => KITS.find((k) => k.id === id) ?? DEFAULT_KIT
