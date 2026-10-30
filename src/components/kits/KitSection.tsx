import { useLayoutEffect, useRef, useState, type PointerEvent } from 'react'
import { DEFAULT_KIT, getKit, KITS, type KitId } from '../../data/kits'
import { kitsSection } from '../../data/texts'
import { useIdleReady } from '../../hooks/useIdleReady'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { gsap, MOTION, ScrollTrigger, useGSAP } from '../../lib/gsap'
import { scrollToY } from '../../lib/scroll'
import { kitVars, KitLayer } from './KitLayer'
import { KitSwitcher } from './KitSwitcher'
import { StepNav } from './StepNav'
import { STEPS, type Step } from './steps'

// Escala de la caja de la camiseta cuando se arma el kit completo (camiseta + short + medias
// ocupan ~2,2 veces el alto de la camiseta sola).
const FULL_KIT_SCALE = 0.455
const FRONT_COUNT = Math.max(...KITS.map((k) => k.frontHotspots.length))
const BACK_COUNT = Math.max(...KITS.map((k) => k.backHotspots.length))
// Largo del recorrido fijo, en altos de pantalla.
const PIN_SCREENS = 5

export function KitSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const layerRefs = useRef<Partial<Record<KitId, HTMLDivElement | null>>>({})
  const stRef = useRef<ScrollTrigger | null>(null)
  const wipeOrigin = useRef<{ x: number; y: number } | null>(null)
  const zIndex = useRef(1)
  const autoHotspot = useRef<string | null>(null)

  const [activeId, setActiveId] = useState<KitId>(DEFAULT_KIT.id)
  const [wipeFrom, setWipeFrom] = useState<KitId | null>(null)
  const [step, setStep] = useState<Step>('front')
  const [activeHotspot, setActiveHotspot] = useState<string | null>(null)
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const finePointer = useMediaQuery('(hover: hover) and (pointer: fine)')
  const assetsReady = useIdleReady()

  const activeKit = getKit(activeId)
  const activeKitRef = useRef(activeKit)
  activeKitRef.current = activeKit

  // ------------------------------------------------------------ historia con scroll
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add({ full: MOTION.full, reduced: MOTION.reduced }, (ctx) => {
        const reduced = Boolean(ctx.conditions?.reduced)
        const q = gsap.utils.selector(stageRef)
        const front = q('[data-view="front"]')
        const back = q('[data-view="back"]')

        const tl = gsap.timeline({ defaults: { ease: 'none' } })

        // 1. Entra la camiseta de frente
        tl.addLabel('enter')
        tl.fromTo(front, reduced ? { opacity: 0 } : { opacity: 0, yPercent: 16, rotateY: -32, scale: 0.84 }, {
          opacity: 1,
          yPercent: 0,
          rotateY: 0,
          scale: 1,
          duration: 1,
          ease: 'power3.out',
        })
        tl.from(q('[data-kit-head]'), { opacity: 0, y: reduced ? 0 : 40, duration: 0.7, ease: 'power2.out' }, 0.1)

        // 2. Hotspots del frente, uno por uno
        for (let i = 0; i < FRONT_COUNT; i++) {
          tl.addLabel(`front-${i}`)
          tl.fromTo(
            q(`[data-hotspot="front-${i}"]`),
            { opacity: 0, scale: reduced ? 1 : 0 },
            { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2.2)' },
          )
          tl.to({}, { duration: 0.45 })
        }

        // 3. Gira y muestra la espalda
        tl.addLabel('flip')
        tl.to(q('[data-hotspot^="front-"]'), { opacity: 0, scale: reduced ? 1 : 0.5, duration: 0.25 })
        if (reduced) {
          tl.to(front, { opacity: 0, duration: 0.5 })
          tl.fromTo(back, { opacity: 0 }, { opacity: 1, duration: 0.5 }, '<')
        } else {
          tl.to(front, { rotateY: 90, duration: 0.5, ease: 'power2.in' })
          tl.set(front, { opacity: 0 })
          tl.fromTo(back, { opacity: 0, rotateY: -90 }, { opacity: 1, rotateY: 0, duration: 0.55, ease: 'power2.out' })
        }
        tl.addLabel('back')
        for (let i = 0; i < BACK_COUNT; i++) {
          tl.addLabel(`back-${i}`)
          tl.fromTo(
            q(`[data-hotspot="back-${i}"]`),
            { opacity: 0, scale: reduced ? 1 : 0 },
            { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2.2)' },
          )
          tl.to({}, { duration: 0.45 })
        }

        // 4. Kit completo: vuelve el frente y se ensamblan short y medias
        tl.addLabel('assemble')
        tl.to(q('[data-hotspot^="back-"]'), { opacity: 0, duration: 0.25 })
        tl.to(back, { opacity: 0, duration: 0.35 })
        tl.set(front, { rotateY: 0 })
        tl.to(front, { opacity: 1, duration: 0.35 }, '<')
        tl.to(q('[data-assembly]'), {
          scale: FULL_KIT_SCALE,
          transformOrigin: '50% 0%',
          duration: 1,
          ease: 'power2.inOut',
        })
        tl.fromTo(
          q('[data-piece="shorts"]'),
          { opacity: 0, yPercent: reduced ? 0 : 70 },
          { opacity: 1, yPercent: 0, duration: 0.7, ease: 'power3.out' },
          '<0.35',
        )
        tl.fromTo(
          q('[data-piece="socks"]'),
          { opacity: 0, yPercent: reduced ? 0 : 70 },
          { opacity: 1, yPercent: 0, duration: 0.7, ease: 'power3.out' },
          '<0.2',
        )
        tl.addLabel('full')
        tl.to({}, { duration: 0.8 })

        // El 11 gigante del fondo se mueve más lento que la prenda
        if (!reduced) tl.fromTo(q('[data-big-number]'), { yPercent: 7 }, { yPercent: -7, duration: tl.duration() }, 0)

        const st = ScrollTrigger.create({
          animation: tl,
          trigger: stageRef.current,
          start: 'top top',
          end: () => `+=${window.innerHeight * PIN_SCREENS}`,
          pin: true,
          scrub: reduced ? true : 0.7,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const t = self.progress * tl.duration()
            const labels = tl.labels
            const nextStep: Step = t < labels.flip + 0.4 ? 'front' : t < labels.assemble ? 'back' : 'full'
            setStep(nextStep)

            // El hotspot que va apareciendo se abre solo; tocar otro lo reemplaza.
            const kit = activeKitRef.current
            let auto: string | null = null
            if (nextStep === 'front') {
              kit.frontHotspots.forEach((h, i) => {
                if (t >= labels[`front-${i}`] + 0.2) auto = h.id
              })
            } else if (nextStep === 'back') {
              kit.backHotspots.forEach((h, i) => {
                if (t >= labels[`back-${i}`] + 0.2) auto = h.id
              })
            }
            if (auto !== autoHotspot.current) {
              autoHotspot.current = auto
              setActiveHotspot(auto)
            }
          },
        })
        stRef.current = st
        return () => {
          stRef.current = null
        }
      })
    },
    { scope: sectionRef },
  )

  const jumpTo = (target: Step) => {
    const st = stRef.current
    if (!st) return
    const label = target === 'front' ? 'front-1' : target === 'back' ? 'back-0' : 'full'
    scrollToY(st.labelToScroll(label) + 4)
  }

  // ------------------------------------------------------------ cambio de kit (wipe)
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

  // ------------------------------------------------------------ tilt + brillo (desktop)
  const tilt = useRef<{ x: gsap.QuickToFunc; y: gsap.QuickToFunc } | null>(null)
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!finePointer || window.matchMedia(MOTION.reduced).matches) return
    const stage = stageRef.current!
    const targets = stage.querySelectorAll('[data-tilt]')
    tilt.current ??= {
      x: gsap.quickTo(targets, 'rotationY', { duration: 0.8, ease: 'power3.out' }),
      y: gsap.quickTo(targets, 'rotationX', { duration: 0.8, ease: 'power3.out' }),
    }
    const box = layerRefs.current[activeId]?.querySelector('[data-assembly]')?.getBoundingClientRect()
    const rect = stage.getBoundingClientRect()
    const nx = (e.clientX - rect.left) / rect.width - 0.5
    const ny = (e.clientY - rect.top) / rect.height - 0.5
    tilt.current.x(nx * 16)
    tilt.current.y(-ny * 10)
    if (box) {
      stage.style.setProperty('--mx', `${((e.clientX - box.left) / box.width) * 100}%`)
      stage.style.setProperty('--my', `${((e.clientY - box.top) / box.height) * 100}%`)
      stage.style.setProperty('--sheen-o', '1')
    }
  }
  const onPointerLeave = () => {
    tilt.current?.x(0)
    tilt.current?.y(0)
    stageRef.current?.style.setProperty('--sheen-o', '0')
  }

  // ------------------------------------------------------------ swipe para girar (mobile)
  const swipeStart = useRef<{ x: number; y: number } | null>(null)
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') swipeStart.current = { x: e.clientX, y: e.clientY }
  }
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const start = swipeStart.current
    swipeStart.current = null
    if (!start) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return
    if (step === 'front') jumpTo('back')
    else if (step === 'back') jumpTo('front')
  }

  const toggleHotspot = (id: string) => setActiveHotspot((cur) => (cur === id ? null : id))
  const stepLabel = STEPS.find((s) => s.id === step)?.label

  return (
    <section id="camisetas" ref={sectionRef} aria-label={kitsSection.eyebrow} className="relative">
      <div
        ref={stageRef}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onKeyDown={(e) => e.key === 'Escape' && setActiveHotspot(null)}
        className="relative h-svh touch-pan-y overflow-hidden [--shirt-w:min(68vw,calc(48svh*0.708))] md:[--shirt-w:min(32vw,calc(62svh*0.708),480px)]"
        style={kitVars(activeKit)}
      >
        {KITS.map((kit) => (
          <KitLayer
            key={kit.id}
            ref={(el) => {
              layerRefs.current[kit.id] = el
            }}
            kit={kit}
            active={kit.id === activeId}
            visible={kit.id === activeId || kit.id === wipeFrom}
            step={step}
            activeHotspot={activeHotspot}
            isDesktop={isDesktop}
            assetsReady={assetsReady}
            onToggleHotspot={toggleHotspot}
          />
        ))}

        {/* Controles: viven arriba de las capas y toman la paleta del kit activo */}
        <div className="absolute inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:flex-row md:justify-between md:px-12 md:pb-8 lg:px-20">
          <StepNav step={step} onJump={jumpTo} />
          <KitSwitcher kits={KITS} activeId={activeId} onSelect={selectKit} />
          <p className="hidden w-48 text-right text-xs text-(--kit-muted) transition-colors duration-700 md:block">
            {step === 'full' ? '' : kitsSection.hotspotHint}
          </p>
        </div>
        <p className="absolute inset-x-0 bottom-28 z-[90] text-center text-xs text-(--kit-muted) md:hidden">
          {step === 'front' && !activeHotspot ? kitsSection.swipeHint : ''}
        </p>

        <p className="sr-only" aria-live="polite">
          {`${activeKit.fullName}, ${stepLabel}`}
        </p>
      </div>
    </section>
  )
}
