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
  /** Estampados (VEZZA, nombre, número, sponsor) y su contorno. */
  print: string
  printOutline: string
  /** Fondo del parche de la manga. */
  patchBg: string
  /** Curvas de nivel de la tela y cuánto se marcan (0–1). */
  topo: string
  topoStrength: number
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
    print: '#d6c48f',
    printOutline: '#0e2716',
    patchBg: '#1d4a2a',
    topo: '#10301b',
    topoStrength: 0.85,
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
    print: '#1f4a2c',
    printOutline: '#cdbb8b',
    patchBg: '#efe9db',
    topo: '#cfc6b0',
    topoStrength: 0.5,
  },
}
