/**
 * Esqueleto de referencia del maniquí invisible. Todas las prendas se modelan sobre estas medidas,
 * así el conjunto encaja a una sola escala. Metros, y = 0 en el piso, el maniquí mira a +z.
 */
export const BODY = {
  floor: 0,
  ankle: 0.09,
  calf: 0.33,
  knee: 0.5,
  crotch: 0.8,
  hip: 0.92,
  waist: 1.04,
  chest: 1.3,
  armpit: 1.3,
  shoulder: 1.47,
  neckBase: 1.53,

  hipHalfWidth: 0.18,
  hipHalfDepth: 0.12,
  chestHalfWidth: 0.2,
  chestHalfDepth: 0.125,
  shoulderHalfWidth: 0.215,
  neckRadius: 0.065,
  /** Centro de cada pierna en x = ±legSpacing. */
  legSpacing: 0.115,
} as const
