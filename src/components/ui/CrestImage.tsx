import type { ImgHTMLAttributes } from 'react'
import { asset } from '../../lib/asset'

type CrestImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet' | 'width' | 'height'>

/** Escudo del club sin fondo (789×894), con versión liviana para tamaños chicos. */
export function CrestImage({ alt = 'Escudo de Paisa FC', sizes = '(min-width: 768px) 420px, 70vw', ...props }: CrestImageProps) {
  return (
    <img
      src={asset('assets/escudo/escudo.webp')}
      srcSet={`${asset('assets/escudo/escudo-512.webp')} 512w, ${asset('assets/escudo/escudo.webp')} 789w`}
      sizes={sizes}
      width={789}
      height={894}
      alt={alt}
      decoding="async"
      {...props}
    />
  )
}
