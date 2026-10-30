import * as THREE from 'three'
import { buildBoot, type BootParts } from './garments/boots'
import { buildShirt, type ShirtParts } from './garments/shirt'
import { buildShorts, type ShortsParts } from './garments/shorts'
import { buildSock, type SockParts } from './garments/socks'

export interface KitGeometry {
  shirt: ShirtParts
  shorts: ShortsParts
  /** [izquierda, derecha] */
  socks: [SockParts, SockParts]
  boots: [BootParts, BootParts]
  /** Cajas para encuadrar la cámara en cada vista. */
  bounds: { shirt: THREE.Box3; full: THREE.Box3 }
}

let cache: KitGeometry | null = null

const boxOf = (geos: THREE.BufferGeometry[]) =>
  geos.reduce((box, g) => {
    g.computeBoundingBox()
    return box.union(g.boundingBox!)
  }, new THREE.Box3())

/**
 * Todas las prendas en su lugar sobre el mismo maniquí invisible. La geometría es la misma para
 * los dos kits (solo cambian los materiales), así que se arma una vez.
 */
export function buildKitGeometry(): KitGeometry {
  if (cache) return cache
  const shirt = buildShirt()
  const shorts = buildShorts()
  const socks: [SockParts, SockParts] = [buildSock('L'), buildSock('R')]
  const boots: [BootParts, BootParts] = [buildBoot('L'), buildBoot('R')]

  const shirtGeos = [shirt.body, shirt.sleeveL, shirt.sleeveR, shirt.collar]
  const full = boxOf([...shirtGeos, shorts.legL, shorts.legR, ...socks.map((s) => s.cuff), ...boots.flatMap((b) => [b.upper, b.sole, b.studs])])
  cache = { shirt, shorts, socks, boots, bounds: { shirt: boxOf(shirtGeos), full } }
  return cache
}
