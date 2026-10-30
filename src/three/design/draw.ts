import { asset } from '../../lib/asset'

/** Canvas 2D listo para dibujar en unidades propias: `w` × `h` unidades ocupan `px` del lado más largo. */
export function makeCanvas(w: number, h: number, px = 1024) {
  const scale = px / Math.max(w, h)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * scale)
  canvas.height = Math.round(h * scale)
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  return { canvas, ctx }
}

const images = new Map<string, Promise<HTMLImageElement>>()

export function loadImage(path: string): Promise<HTMLImageElement> {
  let p = images.get(path)
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image()
      img.decoding = 'async'
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error(`No se pudo cargar ${path}`))
      img.src = path.startsWith('blob:') ? path : asset(path)
    })
    images.set(path, p)
  }
  return p
}

/** Imagen con su forma (alfa) pintada de un color: para el logo de Tom's Burger. */
export function tinted(img: CanvasImageSource, w: number, h: number, color: string): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  ctx.drawImage(img, 0, 0, w, h)
  ctx.globalCompositeOperation = 'source-in'
  ctx.fillStyle = color
  ctx.fillRect(0, 0, w, h)
  return c
}

/** Espera a que estén las tipografías del sitio: el texto del canvas se dibuja con ellas. */
export async function fontsReady() {
  await Promise.all([
    document.fonts.load('900 100px "Big Shoulders Display Variable"'),
    document.fonts.load('700 100px "Instrument Sans Variable"'),
  ])
}

interface TextStyle {
  size: number
  weight: number
  family: string
  /** Espaciado entre letras, en fracción del tamaño. */
  spacing?: number
  fill: string
  /** Contorno por fuera de la letra (se pinta debajo del relleno). */
  stroke?: string
  strokeWidth?: number
  /** Ancho máximo: si el texto no entra, se comprime en horizontal. */
  maxWidth?: number
}

/** Texto centrado en (x, y) (línea de base alfabética). */
export function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, s: TextStyle) {
  ctx.save()
  ctx.font = `${s.weight} ${s.size}px "${s.family}"`
  ctx.letterSpacing = `${(s.spacing ?? 0) * s.size}px`
  ctx.textAlign = 'center'
  const w = ctx.measureText(text).width
  // letterSpacing también se suma después de la última letra: se compensa para que quede centrado
  ctx.translate(x + ((s.spacing ?? 0) * s.size) / 2, y)
  if (s.maxWidth && w > s.maxWidth) ctx.scale(s.maxWidth / w, 1)
  if (s.stroke) {
    ctx.lineJoin = 'round'
    ctx.lineWidth = s.strokeWidth ?? s.size * 0.06
    ctx.strokeStyle = s.stroke
    ctx.strokeText(text, 0, 0)
  }
  ctx.fillStyle = s.fill
  ctx.fillText(text, 0, 0)
  ctx.restore()
}
