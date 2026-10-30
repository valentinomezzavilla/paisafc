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
    // Un punto más cálido que --color-cream: el tone mapping lo agrisa.
    fabric: '#ebdfc2',
    trim: '#22432e',
    trim2: '#cdbb8b',
    shorts: '#1d4a2a',
    shortsStripe: '#ebdfc2',
    socks: '#ebdfc2',
    boots: '#f2efe8',
    sole: '#22432e',
    print: '#1f4a2c',
    printOutline: '#cdbb8b',
    patchBg: '#f1e8d2',
    topo: '#d3c7a8',
    topoStrength: 0.5,
  },
}

/** Colores de las dos franjas del puño: la suplente alterna; si no hay trim2, las dos iguales. */
export const cuffStripeColors = (c: KitColors): [string, string] => [c.trim, c.trim2 ?? c.trim]
