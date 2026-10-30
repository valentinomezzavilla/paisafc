import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { DEFAULT_KIT, getKit, KITS, type KitId } from '../../data/kits'
import { kitsSection } from '../../data/texts'
import { useIdleReady } from '../../hooks/useIdleReady'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { gsap, MOTION } from '../../lib/gsap'
import type { AnchorId } from '../../three/anchors'
import type { KitView } from '../../three/KitModel'
import { KitBackdrop, kitVars } from './KitBackdrop'
import { KitPoster } from './KitPoster'
import { KitSwitcher } from './KitSwitcher'
import { ViewToggle } from './ViewToggle'
import { HotspotCard } from './viewer/HotspotCard'
import { ViewerBoundary } from './viewer/ViewerBoundary'

// three y el modelo van en un chunk aparte: no pesan en la primera pantalla.
const KitViewer = lazy(() => import('./viewer/KitViewer'))

/** Ancho que ocupa la tarjeta del detalle en desktop; el modelo se corre la mitad para dejarle lugar. */
const CARD_W = 288

function supportsWebGL() {
  try {
    const c = document.createElement('canvas')
    return Boolean(c.getContext('webgl2') ?? c.getContext('webgl'))
  } catch {
    return false
  }
}

export function KitSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const layerRefs = useRef<Partial<Record<KitId, HTMLDivElement | null>>>({})
  const wipeOrigin = useRef<{ x: number; y: number } | null>(null)
  const zIndex = useRef(1)

  const [activeId, setActiveId] = useState<KitId>(DEFAULT_KIT.id)
  const [wipeFrom, setWipeFrom] = useState<KitId | null>(null)
  const [view, setView] = useState<KitView>('shirt')
  const [activeHotspot, setActiveHotspot] = useState<AnchorId | null>(null)
  const [viewerReady, setViewerReady] = useState(false)
  const [viewerFailed, setViewerFailed] = useState(false)
  const [hint, setHint] = useState(true)
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const idle = useIdleReady()

  const kit = getKit(activeId)
  const hotspots = kit.hotspots.filter((h) => view === 'full' || h.id !== 'shortEscudo')
  const activeIndex = hotspots.findIndex((h) => h.id === activeHotspot)

  // El visor se monta cuando el navegador queda libre y la sección está a menos de una pantalla.
  const [near, setNear] = useState(false)
  const [webgl, setWebgl] = useState(true)
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: '100% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  useEffect(() => setWebgl(supportsWebGL()), [])
  const mountViewer = idle && near && webgl && !viewerFailed
  const showPoster = !viewerReady || viewerFailed || !webgl

  // ------------------------------------------------------------ cambio de kit (wipe del fondo)
  const selectKit = (id: KitId, button: HTMLElement) => {
    if (id === activeId || wipeFrom) return
    const stage = stageRef.current!.getBoundingClientRect()
    const b = button.getBoundingClientRect()
    wipeOrigin.current = { x: b.left + b.width / 2 - stage.left, y: b.top + b.height / 2 - stage.top }
    setActiveHotspot(null)
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
  const onInteract = useCallback(() => setHint(false), [])
  const selectHotspot = useCallback((id: AnchorId | null) => {
    setActiveHotspot(id)
    if (id) setHint(false)
  }, [])
  const changeView = (v: KitView) => {
    setView(v)
    setActiveHotspot(null)
  }

  const card = activeIndex >= 0 && (
    <HotspotCard key={hotspots[activeIndex].id} hotspot={hotspots[activeIndex]} index={activeIndex} onClose={() => setActiveHotspot(null)} />
  )

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

        {/* Póster mientras carga el visor (y si no hay WebGL) */}
        <div
          aria-hidden={!showPoster}
          className={`pointer-events-none absolute inset-0 z-[5] pt-40 pb-40 transition-opacity duration-700 md:pt-16 md:pb-24 ${showPoster ? 'opacity-100' : 'opacity-0'}`}
        >
          <KitPoster kit={kit} view={view} className="size-full" />
        </div>

        {mountViewer && (
          <div className="absolute inset-0 z-10 pt-40 pb-40 md:pt-16 md:pb-24">
            <div className="relative size-full">
              <ViewerBoundary onError={() => setViewerFailed(true)}>
                <Suspense fallback={null}>
                  <KitViewer
                    kit={activeId}
                    view={view}
                    hotspots={hotspots}
                    activeHotspot={activeHotspot}
                    onHotspot={selectHotspot}
                    onReady={onViewerReady}
                    onInteract={onInteract}
                    onError={() => setViewerFailed(true)}
                    label={`${kit.fullName}. ${kitsSection.viewerLabel}`}
                    focusShift={isDesktop ? CARD_W / 2 + 24 : 0}
                  />
                </Suspense>
              </ViewerBoundary>
            </div>
          </div>
        )}

        {/* Detalle abierto: al costado del modelo en desktop, abajo en mobile */}
        {card && (
          <div className="absolute inset-x-4 bottom-36 z-[95] md:inset-x-auto md:top-1/2 md:right-12 md:bottom-auto md:w-72 md:-translate-y-1/2 lg:right-20">
            {card}
          </div>
        )}

        {/* Sin visor 3D: los detalles como lista */}
        {(viewerFailed || !webgl) && (
          <ul className="absolute top-1/2 right-4 z-20 hidden max-w-60 -translate-y-1/2 space-y-1 text-sm text-(--kit-muted) md:right-12 md:block">
            {hotspots.map((h, i) => (
              <li key={h.id}>
                <span className="font-jersey font-bold text-(--kit-accent)">{String(i + 1).padStart(2, '0')}</span> {h.title}
              </li>
            ))}
          </ul>
        )}

        {/* Controles: arriba de todo, con la paleta del kit activo */}
        <div className="absolute inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:flex-row md:justify-between md:px-12 md:pb-8 lg:px-20">
          <ViewToggle view={view} onChange={changeView} />
          <KitSwitcher kits={KITS} activeId={activeId} onSelect={selectKit} />
          <p className="hidden w-56 text-right text-xs text-(--kit-muted) transition-opacity duration-700 md:block">{kitsSection.hotspotHint}</p>
        </div>
        <p
          aria-hidden
          className={`pointer-events-none absolute inset-x-0 bottom-36 z-[90] text-center font-jersey text-xs font-bold tracking-[0.25em] text-(--kit-muted) uppercase transition-opacity duration-700 md:bottom-28 ${
            hint && viewerReady && !activeHotspot ? 'opacity-100' : 'opacity-0'
          }`}
        >
          ← {kitsSection.dragHint} →
        </p>

        {/* Para lectores de pantalla: kit, vista y detalles */}
        <p className="sr-only" aria-live="polite">
          {`${kit.fullName}, ${kitsSection.views[view]}`}
        </p>
        <ul className="sr-only" aria-label={kitsSection.detailsTitle}>
          {hotspots.map((h) => (
            <li key={h.id}>{`${h.title}: ${h.text}`}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}
