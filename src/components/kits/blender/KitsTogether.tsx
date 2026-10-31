import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { KITS, type Kit } from '../../../data/kits'
import { kitsSection } from '../../../data/texts'
import { useViewerGate } from '../../../hooks/useViewerGate'
import { gsap, MOTION, useGSAP } from '../../../lib/gsap'
import { Topo } from '../../ui/Topo'
import { kitVars } from '../KitBackdrop'
import { FRAME_COUNT, frameIndex, nearestLoaded, SMALL_WIDTH } from './frames'
import { KitFront } from './KitSection'
import { drawFrame, useFrames } from './useFrames'

/** Cuánto arranca girada cada camiseta (radianes): de costado, mirando hacia el centro. */
const START_TURN = (60 * Math.PI) / 180
const STEP = (Math.PI * 2) / FRAME_COUNT
/** Fotos de 0° a 60° hacia un lado: alcanza con esas para el giro con el scroll. */
const turnFrames = (sign: 1 | -1) =>
  Array.from({ length: Math.round(START_TURN / STEP) + 1 }, (_, k) => (((sign * k) % FRAME_COUNT) + FRAME_COUNT) % FRAME_COUNT)

/** Una camiseta que gira con el scroll: dibuja la foto del ángulo que marca `progress` (0 = de costado, 1 = de frente). */
function TurningShirt({ kit, sign, progress, onReady }: { kit: Kit; sign: 1 | -1; progress: RefObject<number>; onReady: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const shown = useRef(-1)
  const [small] = useState(() => window.innerWidth * Math.min(window.devicePixelRatio || 1, 2) <= SMALL_WIDTH * 2.5)
  const [only] = useState(() => turnFrames(sign))
  const { images, ready } = useFrames(kit.id, small, undefined, only)

  useEffect(() => {
    if (ready) onReady()
  }, [ready, onReady])

  // Mientras se ve, en cada cuadro: la foto del ángulo actual (solo se redibuja si cambió)
  useEffect(() => {
    const c = canvas.current
    if (!c || !ready) return
    let raf = 0
    let visible = false
    const tick = () => {
      const angle = sign * START_TURN * (1 - progress.current)
      const i = nearestLoaded(frameIndex(angle), (k) => Boolean(images.current[k]))
      if (i !== null && i !== shown.current) {
        shown.current = i
        drawFrame(c, images.current[i]!)
      }
      if (visible) raf = requestAnimationFrame(tick)
    }
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      cancelAnimationFrame(raf)
      if (visible) raf = requestAnimationFrame(tick)
    })
    io.observe(c)
    const ro = new ResizeObserver(() => {
      shown.current = -1
      tick()
    })
    ro.observe(c)
    return () => {
      io.disconnect()
      ro.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [ready, images, progress, sign])

  return <canvas ref={canvas} aria-hidden className="size-full" />
}

/**
 * Cierre de la sección: titular y suplente lado a lado, cada una sobre su color, con las fotos de Blender.
 * Reemplaza a ../KitsTogether.tsx (la escena de three.js), que sigue en el repo.
 */
export function KitsTogether() {
  const root = useRef<HTMLElement>(null)
  const progress = useRef(1)
  const [readyCount, setReadyCount] = useState(0)
  // Más corto que el margen por defecto: así no arranca a la vez que el visor de #camisetas.
  const gate = useViewerGate(root, '30% 0px')
  const onReady = useCallback(() => setReadyCount((n) => n + 1), [])

  // Con el scroll, las camisetas giran de costado hacia el centro. Sin animación, quedan ya de frente.
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION.full, () => {
        progress.current = 0
        gsap.to(progress, {
          current: 1,
          ease: 'none',
          scrollTrigger: { trigger: root.current, start: 'top 80%', end: 'center center', scrub: 0.8 },
        })
        return () => {
          progress.current = 1
        }
      })
    },
    { scope: root },
  )

  const kits = KITS.slice(0, 2)
  const showPoster = readyCount < kits.length

  return (
    <section ref={root} aria-labelledby="juntas-title" className="relative overflow-hidden">
      {/* mix-blend-difference: el título se invierte sobre cada mitad */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-4 pt-12 text-center text-cream mix-blend-difference sm:pt-16">
        <p className="font-jersey text-xs font-bold tracking-[0.35em] uppercase sm:text-sm">{kitsSection.together.eyebrow}</p>
        <h2
          id="juntas-title"
          className="mt-2 font-display text-[clamp(2rem,7vw,5.5rem)] leading-[0.95] font-extrabold"
          style={{ fontVariationSettings: '"SOFT" 60' }}
        >
          {kitsSection.together.title}
        </h2>
      </div>

      <div className="grid grid-cols-2">
        {kits.map((kit, n) => (
          <div
            key={kit.id}
            data-half
            className="relative min-h-[78svh] overflow-hidden text-(--kit-ink) sm:min-h-svh"
            style={{
              ...kitVars(kit),
              background: 'radial-gradient(90% 70% at 50% 45%, var(--kit-bg) 40%, var(--kit-bg-deep))',
            }}
          >
            <Topo tone={kit.theme.topo.tone} opacity={kit.theme.topo.opacity} parallax={10} />
            <div className="absolute inset-x-0 top-[22%] flex h-[56%] justify-center">
              {/* De frente hasta que llegan las fotos del giro */}
              <KitFront
                kit={kit}
                loading="lazy"
                className={`pointer-events-none absolute inset-0 size-full transition-opacity duration-700 ${showPoster ? 'opacity-100' : 'opacity-0'}`}
              />
              {gate.ready && <TurningShirt kit={kit} sign={n === 0 ? 1 : -1} progress={progress} onReady={onReady} />}
            </div>
            <div className="absolute inset-x-0 bottom-0 pb-12 text-center sm:pb-16">
              <h3 className="font-display text-3xl leading-none font-extrabold sm:text-5xl lg:text-6xl" style={{ fontVariationSettings: '"SOFT" 60' }}>
                {kit.roleLabel}
              </h3>
              <p className="mt-1 font-jersey text-sm font-bold tracking-[0.2em] text-(--kit-muted) uppercase sm:text-base">{kit.colorName}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
