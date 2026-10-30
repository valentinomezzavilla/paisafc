import * as THREE from 'three'

/** Celdas de la trama dentro de la textura (por lado). */
const CELLS = 16
/** Tamaño de una celda de la trama, en metros. */
export const KNIT_CELL = 0.003

let knitMap: THREE.CanvasTexture | null = null

/**
 * Normal map de tejido piqué: filas de puntos en V, generado en un canvas. Se comparte entre todas
 * las prendas; cada material clona la textura para su propia repetición.
 */
export function createFabricNormalMap(size = 512): THREE.CanvasTexture {
  if (knitMap) return knitMap
  const cell = size / CELLS
  const height = new Float32Array(size * size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cx = (x % cell) / cell - 0.5
      const cy = (y % cell) / cell
      // Dos patas de la V: cada una es una loma diagonal
      const leg = Math.min(Math.abs(cx + (cy - 0.5) * 0.55 + 0.22), Math.abs(cx - (cy - 0.5) * 0.55 - 0.22))
      const v = Math.exp(-(leg * leg) / 0.018)
      // Surco entre filas
      const row = Math.sin(cy * Math.PI) ** 0.6
      height[y * size + x] = v * row
    }
  }

  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(size, size)
  const h = (x: number, y: number) => height[((y + size) % size) * size + ((x + size) % size)]
  const strength = 2.2
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (h(x + 1, y) - h(x - 1, y)) * strength
      const dy = (h(x, y + 1) - h(x, y - 1)) * strength
      const n = new THREE.Vector3(-dx, -dy, 1).normalize()
      const i = (y * size + x) * 4
      img.data[i] = (n.x * 0.5 + 0.5) * 255
      img.data[i + 1] = (n.y * 0.5 + 0.5) * 255
      img.data[i + 2] = (n.z * 0.5 + 0.5) * 255
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)

  knitMap = new THREE.CanvasTexture(canvas)
  knitMap.wrapS = knitMap.wrapT = THREE.RepeatWrapping
  knitMap.colorSpace = THREE.NoColorSpace
  knitMap.anisotropy = 8
  return knitMap
}

/**
 * Repeticiones de la trama en [u, v]. Alrededor de la pieza (u va de 0 a 1) se redondea a un entero:
 * con un número fraccionario la trama salta en la costura de UV.
 */
export function knitRepeat(perimeter: number): [number, number] {
  const tile = KNIT_CELL * CELLS
  return [Math.max(1, Math.round(perimeter / tile)), 1 / tile]
}

interface FabricOptions {
  /** Perímetro en metros de la pieza (el u del loft va de 0 a 1 alrededor). */
  perimeter?: number
  sheenColor?: string
  roughness?: number
  /** Cara interna de la prenda: más oscura, como la sombra de adentro. */
  inner?: boolean
  /** Mapa de color (curvas de nivel); si no hay, color liso. */
  map?: THREE.Texture
}

export function fabricMaterial(
  color: string,
  { perimeter = 1, sheenColor, roughness = 0.82, inner = false, map: colorMap }: FabricOptions = {},
): THREE.MeshPhysicalMaterial {
  const map = createFabricNormalMap().clone()
  map.needsUpdate = true
  map.repeat.set(...knitRepeat(perimeter))

  // Con mapa, el color sale de la textura; el blanco no la tiñe.
  const base = new THREE.Color(colorMap ? '#ffffff' : color)
  if (inner) base.multiplyScalar(0.45)
  return new THREE.MeshPhysicalMaterial({
    color: base,
    roughness,
    sheen: inner ? 0 : 0.6,
    sheenRoughness: 0.5,
    sheenColor: new THREE.Color(sheenColor ?? color).lerp(new THREE.Color('#ffffff'), 0.35),
    map: colorMap ?? null,
    normalMap: map,
    normalScale: new THREE.Vector2(0.6, 0.6),
    // Brillo especular bajo: la tela no refleja la caja de luz como un plástico.
    specularIntensity: 0.35,
    side: inner ? THREE.BackSide : THREE.FrontSide,
  })
}
