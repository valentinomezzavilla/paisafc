import { lazy, Suspense, useCallback, useLayoutEffect, useRef, useState } from 'react'
import { DEFAULT_KIT, getKit, KITS, type Kit, type KitId } from '../../../data/kits'
import { kitsSection } from '../../../data/texts'
import { useViewerGate } from '../../../hooks/useViewerGate'
import { gsap, MOTION } from '../../../lib/gsap'
import { KitBackdrop, kitVars } from '../KitBackdrop'
import { KitSwitcher } from '../KitSwitcher'
import { ViewerBoundary } from '../viewer/ViewerBoundary'
import { FRAME_SIZE, frameUrl, SMALL_WIDTH } from './frames'

// El visor va en un chunk aparte y sus fotos se piden recién cuando la sección está por verse.
const KitTurntable = lazy(() => import('./KitTurntable'))

/** La foto de frente: se ve en el HTML prerenderizado y mientras carga el visor. */
export function KitFront({ kit, className = '', loading }: { kit: Kit; className?: string; loading?: 'lazy' | 'eager' }) {
  return (
    <img
      src={frameUrl(kit.id, 0)}
      srcSet={`${frameUrl(kit.id, 0, true)} ${SMALL_WIDTH}w, ${frameUrl(kit.id, 0)} ${FRAME_SIZE[0]}w`}
      sizes="(min-width: 768px) 40vw, 80vw"
      width={FRAME_SIZE[0]}
      height={FRAME_SIZE[1]}
      alt={`Camiseta ${kit.roleLabel.toLowerCase()} de Paisa FC (${kit.colorName.toLowerCase()})`}
      decoding="async"
      loading={loading}
      draggable={false}
      className={`object-contain ${className}`}
    />
  )
}

/**
 * Sección #camisetas con las fotos de Blender: el fondo cambia con un barrido circular al elegir kit y la
 * camiseta se gira arrastrando. Reemplaza a ../KitSection.tsx (el visor 3D de three.js), que sigue en el repo.
 */
export function KitSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const layerRefs = useRef<Partial<Record<KitId, HTMLDivElement | null>>>({})
  const wipeOrigin = useRef<{ x: number; y: number } | null>(null)
  const zIndex = useRef(1)

  const [activeId, setActiveId] = useState<KitId>(DEFAULT_KIT.id)
  const [wipeFrom, setWipeFrom] = useState<KitId | null>(null)
  const [viewerReady, setViewerReady] = useState(false)
  const [viewerFailed, setViewerFailed] = useState(false)
  const [hint, setHint] = useState(true)

  const kit = getKit(activeId)
  const details = kit.hotspots.filter((h) => h.id !== 'shortEscudo')

  // El visor se monta cuando el navegador queda libre y la sección está a menos de una pantalla.
  const { ready: gateOpen } = useViewerGate(sectionRef)
  const mountViewer = gateOpen && !viewerFailed
  const showPoster = !viewerReady || viewerFailed

  // ------------------------------------------------------------ cambio de kit (wipe del fondo)
  const selectKit = (id: KitId, button: HTMLElement) => {
    if (id === activeId || wipeFrom) return
    const stage = stageRef.current!.getBoundingClientRect()
    const b = button.getBoundingClientRect()
    wipeOrigin.current = { x: b.left + b.width / 2 - stage.left, y: b.top + b.height / 2 - stage.top }
    setWipeFrom(activeId)
    setActiveId(id)
  }

  useLayoutEffect(() => {
    const origin = wipeOrigin.current
    const layer = layerRefs.current[activeId]
    if (!origin || !layer) return
    wipeOrigin.current = null
    const { width, height } = layer.getBoundingClientRect()
    const r = Math.hypot(Math.max(origin.x, width - origin.x), Math.max(origin.y, height - origin.y))
    const at = `${origin.x}px ${origin.y}px`
    const done = () => {
      gsap.set(layer, { clearProps: 'clipPath,opacity' })
      setWipeFrom(null)
    }
    gsap.set(layer, { zIndex: ++zIndex.current })

    if (window.matchMedia(MOTION.reduced).matches) {
      gsap.fromTo(layer, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power1.out', onComplete: done })
    } else {
      gsap.fromTo(
        layer,
        { clipPath: `circle(0px at ${at})` },
        { clipPath: `circle(${r}px at ${at})`, duration: 1.05, ease: 'power3.inOut', onComplete: done },
      )
    }
  }, [activeId])

  const onViewerReady = useCallback(() => setViewerReady(true), [])
  const onViewerError = useCallback(() => setViewerFailed(true), [])
  const onInteract = useCallback(() => setHint(false), [])

  return (
    <section id="camisetas" ref={sectionRef} aria-label={kitsSection.eyebrow} className="relative">
      <div ref={stageRef} className="relative h-svh min-h-[34rem] overflow-hidden" style={kitVars(kit)}>
        {KITS.map((k) => (
          <KitBackdrop
            key={k.id}
            ref={(el) => {
              layerRefs.current[k.id] = el
            }}
            kit={k}
            visible={k.id === activeId || k.id === wipeFrom}
          />
        ))}

        {/* Foto de frente mientras carga el visor (y si falla) */}
        <div
          aria-hidden={!showPoster}
          className={`pointer-events-none absolute inset-0 z-[5] pt-40 pb-40 transition-opacity duration-700 md:pt-16 md:pb-24 ${showPoster ? 'opacity-100' : 'opacity-0'}`}
        >
          <KitFront kit={kit} className="size-full" />
        </div>

        {mountViewer && (
          <div className="absolute inset-0 z-10 pt-40 pb-40 md:pt-16 md:pb-24">
            <div className="relative size-full">
              <ViewerBoundary onError={onViewerError}>
                <Suspense fallback={null}>
                  <KitTurntable
                    kit={activeId}
                    onReady={onViewerReady}
                    onInteract={onInteract}
                    onError={onViewerError}
                    label={`${kit.fullName}. ${kitsSection.turntableLabel}`}
                  />
                </Suspense>
              </ViewerBoundary>
            </div>
          </div>
        )}

        {/* Los detalles, como lista al costado en desktop */}
        <ul className="absolute top-1/2 right-4 z-20 hidden max-w-60 -translate-y-1/2 space-y-1 text-sm text-(--kit-muted) lg:right-20 lg:block">
          {details.map((h, i) => (
            <li key={h.id}>
              <span className="font-jersey font-bold text-(--kit-accent)">{String(i + 1).padStart(2, '0')}</span> {h.title}
            </li>
          ))}
        </ul>

        {/* Controles: arriba de todo, con la paleta del kit activo */}
        <div className="absolute inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:px-12 md:pb-8 lg:px-20">
          <KitSwitcher kits={KITS} activeId={activeId} onSelect={selectKit} />
        </div>
        <p
          aria-hidden
          className={`pointer-events-none absolute inset-x-0 bottom-28 z-[90] text-center font-jersey text-xs font-bold tracking-[0.25em] text-(--kit-muted) uppercase transition-opacity duration-700 md:bottom-24 ${
            hint && viewerReady ? 'opacity-100' : 'opacity-0'
          }`}
        >
          ← {kitsSection.dragHint} →
        </p>

        {/* Para lectores de pantalla: kit y detalles */}
        <p className="sr-only" aria-live="polite">
          {kit.fullName}
        </p>
        <ul className="sr-only" aria-label={kitsSection.detailsTitle}>
          {details.map((h) => (
            <li key={h.id}>{`${h.title}: ${h.text}`}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}
