import { lazy, Suspense, useCallback, useRef, useState } from 'react'
import { KITS } from '../../data/kits'
import { kitsSection } from '../../data/texts'
import { useViewerGate } from '../../hooks/useViewerGate'
import { gsap, MOTION, useGSAP } from '../../lib/gsap'
import { Topo } from '../ui/Topo'
import { kitVars } from './KitBackdrop'
import { KitPoster } from './KitPoster'
import { ViewerBoundary } from './viewer/ViewerBoundary'

// Comparte chunk con el visor de #camisetas: three se baja una sola vez.
const TogetherStage = lazy(() => import('./viewer/TogetherStage'))

/** Cierre de la sección: titular y suplente lado a lado, cada una sobre su color. */
export function KitsTogether() {
  const root = useRef<HTMLElement>(null)
  const progress = useRef(1)
  const [failed, setFailed] = useState(false)
  const [ready, setReady] = useState(false)
  const gate = useViewerGate(root)
  const mount = gate.ready && !failed
  const onReady = useCallback(() => setReady(true), [])
  const onError = useCallback(() => setFailed(true), [])

  // Con el scroll, las camisetas giran de costado hacia el centro. Sin animación, quedan ya giradas.
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

  const showPoster = !ready || failed || !gate.webgl

  return (
    <section ref={root} aria-labelledby="juntas-title" className="relative overflow-hidden">
      {/* mix-blend-difference: el título se invierte sobre cada mitad */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-4 pt-12 text-center text-cream mix-blend-difference sm:pt-16">
        <p className="font-jersey text-xs font-bold tracking-[0.35em] uppercase sm:text-sm">
          {kitsSection.together.eyebrow}
        </p>
        <h2
          id="juntas-title"
          className="mt-2 font-display text-[clamp(2rem,7vw,5.5rem)] leading-[0.95] font-extrabold"
          style={{ fontVariationSettings: '"SOFT" 60' }}
        >
          {kitsSection.together.title}
        </h2>
      </div>

      <div className="grid grid-cols-2">
        {KITS.slice(0, 2).map((kit) => (
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
            {/* Póster hasta que el 3D está dibujado (y si no hay WebGL) */}
            <div
              className={`pointer-events-none absolute inset-x-0 top-[24%] flex h-[52%] justify-center transition-opacity duration-700 ${showPoster ? 'opacity-100' : 'opacity-0'}`}
            >
              <KitPoster kit={kit} view="full" loading="lazy" className="h-full w-auto max-w-full" />
            </div>
            <div className="absolute inset-x-0 bottom-0 pb-12 text-center sm:pb-16">
              <h3
                className="font-display text-3xl leading-none font-extrabold sm:text-5xl lg:text-6xl"
                style={{ fontVariationSettings: '"SOFT" 60' }}
              >
                {kit.roleLabel}
              </h3>
              <p className="mt-1 font-jersey text-sm font-bold tracking-[0.2em] text-(--kit-muted) uppercase sm:text-base">
                {kit.colorName}
              </p>
            </div>
          </div>
        ))}
      </div>

      {mount && (
        <ViewerBoundary onError={onError}>
          <Suspense fallback={null}>
            <TogetherStage progress={progress} onReady={onReady} onError={onError} />
          </Suspense>
        </ViewerBoundary>
      )}
    </section>
  )
}
