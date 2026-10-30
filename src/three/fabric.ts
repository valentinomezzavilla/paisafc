import * as THREE from 'three'

/** Celdas de la trama dentro de la textura (por lado). */
const CELLS = 16
/** Tamaño de una celda de la trama, en metros. */
export const KNIT_CELL = 0.003

let knitMap: THREE.CanvasTexture | null = null

/**
 * Altura de un punto de la trama dentro de su celda: cx, cy en [0, 1). Dos patas de V por celda, con un
 * surco entre filas. La usan el normal map de la tela y el relieve de las estampas.
 */
export function knitHeight(cx: number, cy: number): number {
  const x = cx - 0.5
  const leg = Math.min(Math.abs(x + (cy - 0.5) * 0.55 + 0.22), Math.abs(x - (cy - 0.5) * 0.55 - 0.22))
  return Math.exp(-(leg * leg) / 0.018) * Math.sin(cy * Math.PI) ** 0.6
}

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
      height[y * size + x] = knitHeight((x % cell) / cell, (y % cell) / cell)
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
      // La textura se sube con flipY: v crece hacia arriba y el canvas hacia abajo
      const n = new THREE.Vector3(-dx, dy, 1).normalize()
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

/** Separación entre canales del acanalado de las medias, en metros. */
const RIB_PITCH = 0.0026
/** Canales por baldosa del acanalado. */
const RIB_CHANNELS = 8
let ribMap: THREE.CanvasTexture | null = null
let ribAcrossMap: THREE.CanvasTexture | null = null

/** Normal map de un acanalado vertical (1x1): lomas redondeadas con surcos finos entre ellas. */
export function createRibNormalMap(size = 256, across = false): THREE.CanvasTexture {
  if (across) return ribAcrossMap ?? (ribAcrossMap = buildRibMap(size, true))
  return ribMap ?? (ribMap = buildRibMap(size, false))
}

function buildRibMap(size: number, across: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(size, size)
  const period = size / RIB_CHANNELS
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Pendiente de una loma senoidal; un hilo suelto cada tanto rompe la regularidad
      // `across`: los canales corren a lo largo de u y se repiten en v (cuello: perpendiculares al borde)
      const along = across ? y : x
      const other = across ? x : y
      const phase = ((along % period) / period) * Math.PI * 2
      const wobble = 0.06 * Math.sin(other * 0.11 + Math.floor(along / period) * 2.3)
      const slope = Math.cos(phase) * (0.85 + wobble)
      const n = across ? new THREE.Vector3(0, slope * 0.9, 1).normalize() : new THREE.Vector3(-slope * 0.9, 0, 1).normalize()
      const i = (y * size + x) * 4
      img.data[i] = (n.x * 0.5 + 0.5) * 255
      img.data[i + 1] = (n.y * 0.5 + 0.5) * 255
      img.data[i + 2] = (n.z * 0.5 + 0.5) * 255
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.NoColorSpace
  tex.anisotropy = 8
  return tex
}

/** Repeticiones del acanalado: un número entero de baldosas alrededor, para que no salte en la costura. */
export function ribRepeat(perimeter: number): [number, number] {
  const tile = RIB_PITCH * RIB_CHANNELS
  return [Math.max(1, Math.round(perimeter / tile)), 1 / tile]
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
  /** La geometría trae la oclusión ambiental en el color de los vértices. */
  ao?: boolean
  /** 'rib': acanalado vertical de las medias; 'knit' (default): la trama de la camiseta. */
  weave?: 'knit' | 'rib' | 'ribV'
}

/** Luminosidad percibida de un color CSS, de 0 a 1. */
const luminance = (css: string) => {
  const c = new THREE.Color(css)
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b
}

export function fabricMaterial(
  color: string,
  { perimeter = 1, sheenColor, roughness = 0.66, inner = false, map: colorMap, ao = false, weave = 'knit' }: FabricOptions = {},
): THREE.MeshPhysicalMaterial {
  const map = (weave === 'rib' ? createRibNormalMap() : weave === 'ribV' ? createRibNormalMap(256, true) : createFabricNormalMap()).clone()
  map.needsUpdate = true
  // ribV: el acanalado se repite a lo largo de v (en metros) y no cambia a lo ancho
  map.repeat.set(...(weave === 'rib' ? ribRepeat(perimeter) : weave === 'ribV' ? ([1, 1 / (RIB_PITCH * RIB_CHANNELS)] as [number, number]) : knitRepeat(perimeter)))

  // Con mapa, el color sale de la textura; el blanco no la tiñe.
  const base = new THREE.Color(colorMap ? '#ffffff' : color)
  if (inner) base.multiplyScalar(0.45)
  return new THREE.MeshPhysicalMaterial({
    color: base,
    roughness,
    // Las telas claras ya reflejan mucho: con menos brillo de borde no se lavan
    sheen: inner ? 0 : THREE.MathUtils.lerp(1, 0.4, luminance(color) ** 0.6),
    sheenRoughness: 0.42,
    sheenColor: new THREE.Color(sheenColor ?? color).lerp(new THREE.Color('#ffffff'), 0.5),
    map: colorMap ?? null,
    normalMap: map,
    normalScale: weave === 'knit' ? new THREE.Vector2(0.45, 0.45) : weave === 'ribV' ? new THREE.Vector2(0.38, 0.38) : new THREE.Vector2(1.1, 1.1),
    // Brillo especular bajo: la tela no refleja la caja de luz como un plástico.
    specularIntensity: 0.5,
    side: inner ? THREE.BackSide : THREE.FrontSide,
    vertexColors: ao,
  })
}
