import type { ImgHTMLAttributes } from 'react'
import type { KitPiece } from '../../data/kits'
import { asset } from '../../lib/asset'

interface KitPictureProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet' | 'alt'> {
  piece: KitPiece
  alt: string
}

/** Prenda recortada: versión de 640 px para mobile y la grande para pantallas densas. */
export function KitPicture({ piece, alt, sizes = '(min-width: 768px) 520px, 80vw', ...props }: KitPictureProps) {
  return (
    <img
      src={asset(`${piece.src}.webp`)}
      srcSet={`${asset(`${piece.src}-640.webp`)} 640w, ${asset(`${piece.src}.webp`)} ${piece.width}w`}
      sizes={sizes}
      width={piece.width}
      height={piece.height}
      alt={alt}
      decoding="async"
      draggable={false}
      {...props}
    />
  )
}
