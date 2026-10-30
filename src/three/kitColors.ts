import type { KitId } from '../data/kits'

export interface KitColors {
  fabric: string
  /** Ribete del cuello y franjas de los puños. */
  trim: string
  trim2?: string
  shorts: string
  shortsStripe: string
  socks: string
  boots: string
  sole: string
}

// Colores de src/styles/palette.css. El verde de la tela va un punto más claro que forest-deep:
// bajo luz de estudio el original se ve casi negro.
export const KIT_COLORS: Record<KitId, KitColors> = {
  verde: {
    fabric: '#1d4a2a',
    trim: '#cdbb8b',
    shorts: '#1d4a2a',
    shortsStripe: '#cdbb8b',
    socks: '#1d4a2a',
    boots: '#1f4a2c',
    sole: '#12321c',
  },
  crema: {
    fabric: '#e5decd',
    trim: '#22432e',
    trim2: '#cdbb8b',
    shorts: '#1d4a2a',
    shortsStripe: '#e5decd',
    socks: '#e5decd',
    boots: '#f2efe8',
    sole: '#22432e',
  },
}
