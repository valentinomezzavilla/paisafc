import { Canvas } from '@react-three/fiber'
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import * as THREE from 'three'
import { KITS, type Hotspot, type KitId } from '../../../data/kits'
import { useMediaQuery } from '../../../hooks/useMediaQuery'
import { MOTION } from '../../../lib/gsap'
import type { AnchorId } from '../../../three/anchors'
import type { KitView } from '../../../three/KitModel'
import { useKitAssets } from '../../../three/useKitScene'
import { EXPOSURE } from '../../../three/StudioLights'
import { HotspotPin } from './HotspotPin'
import { FOV, KitStage, MAX_TILT, type SpinControl } from './KitStage'

const KIT_IDS = KITS.map((k) => k.id)
/** Radianes por píxel de arrastre. */
const DRAG_GAIN = 0.0095
/** Giro con cada flecha del teclado. */
const KEY_STEP = THREE.MathUtils.degToRad(20)
/** Píxeles antes de decidir si un gesto táctil es horizontal (gira) o vertical (scrollea). */
const SLOP = 8

export interface KitViewerProps {
  kit: KitId
  view: KitView
  hotspots: Hotspot[]
  activeHotspot: AnchorId | null
  onHotspot: (id: AnchorId | null) => void
  /** Ya se dibujó el modelo: se puede sacar el póster. */
  onReady: () => void
  /** El usuario giró la camiseta: se apaga la pista. */
  onInteract: () => void
  /** No se pudo cargar el modelo: queda el póster. */
  onError: () => void
  label: string
  /** Lugar que ocupa la tarjeta del detalle en desktop (px), para correr el encuadre. */
  focusShift?: number
}

/**
 * Visor 3D de la sección de camisetas. Se gira arrastrando (en el celu solo el gesto horizontal: el
 * vertical sigue scrolleando la página), con las flechas, o tocando un detalle, que lo pone de frente.
 */
export default function KitViewer({ kit, view, hotspots, activeHotspot, onHotspot, onReady, onInteract, onError, label, focusShift = 0 }: KitViewerProps) {
  const loaded = useKitAssets(KIT_IDS)
  const assets = loaded === 'error' ? null : loaded
  const reduced = useMediaQuery(MOTION.reduced)
  const wrap = useRef<HTMLDivElement>(null)
  const spin = useRef<SpinControl>({ angle: -1.1, velocity: 0, tilt: 0, dragging: false, target: null })
  const [inView, setInView] = useState(false)
  const pins = useRef<Partial<Record<AnchorId, HTMLDivElement | null>>>({})

  // Fuera de pantalla no se dibuja. La primera vez que entra, medio giro de presentación.
  const introDone = useRef(false)
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: '10% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  useEffect(() => {
    if (!inView || !assets || introDone.current) return
    introDone.current = true
    if (reduced) spin.current.angle = 0
    else spin.current.target = 0
  }, [inView, assets, reduced])

  useEffect(() => {
    if (loaded === 'error') onError()
    else if (loaded) onReady()
  }, [loaded, onReady, onError])

  // ------------------------------------------------------------ arrastre
  const drag = useRef<{ x: number; y: number; lastX: number; lastT: number; axis: 'x' | 'y' | null; moved: boolean; id: number } | null>(null)

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    drag.current = { x: e.clientX, y: e.clientY, lastX: e.clientX, lastT: e.timeStamp, axis: e.pointerType === 'mouse' ? 'x' : null, moved: false, id: e.pointerId }
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (!d.axis) {
      if (Math.hypot(dx, dy) < SLOP) return
      d.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
      if (d.axis === 'y') {
        drag.current = null // gesto vertical: es scroll, no se toca
        return
      }
    }
    if (!d.moved) {
      d.moved = true
      wrap.current?.setPointerCapture(e.pointerId)
      spin.current.dragging = true
      spin.current.target = null
      if (activeHotspot) onHotspot(null)
      onInteract()
    }
    const s = spin.current
    const step = e.clientX - d.lastX
    s.angle += step * DRAG_GAIN
    const dt = Math.max(1, e.timeStamp - d.lastT)
    s.velocity = THREE.MathUtils.lerp(s.velocity, (step * DRAG_GAIN) / dt, 0.5)
    if (e.pointerType === 'mouse') s.tilt = THREE.MathUtils.clamp((dy / 400) * MAX_TILT * 2, -MAX_TILT, MAX_TILT)
    d.lastX = e.clientX
    d.lastT = e.timeStamp
  }

  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    drag.current = null
    const s = spin.current
    s.dragging = false
    s.tilt = 0
    if (!d || d.id !== e.pointerId) return
    // Si se soltó quieto, sin inercia
    if (e.timeStamp - d.lastT > 80) s.velocity = 0
    // Un toque sin arrastrar sobre el fondo cierra el detalle abierto
    if (!d.moved && e.type === 'pointerup' && activeHotspot) onHotspot(null)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const dir = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0
    if (dir) {
      e.preventDefault()
      const s = spin.current
      s.target = (s.target ?? s.angle) + dir * KEY_STEP
      if (activeHotspot) onHotspot(null)
      onInteract()
    } else if (e.key === 'Escape' && activeHotspot) onHotspot(null)
  }

  return (
    <div
      ref={wrap}
      role="group"
      aria-label={label}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
      className="absolute inset-0 cursor-grab touch-pan-y overflow-hidden outline-none select-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-(--kit-accent) focus-visible:ring-inset"
    >
      {assets && (
        <Canvas
          frameloop={inView ? 'always' : 'never'}
          shadows
          dpr={[1, 2]}
          camera={{ fov: FOV, near: 0.05, far: 20 }}
          gl={{ antialias: true, alpha: true, toneMapping: THREE.NeutralToneMapping, toneMappingExposure: EXPOSURE }}
          aria-hidden
        >
          <KitStage
            kit={kit}
            view={view}
            scene={assets.scene}
            textures={assets.textures}
            hotspots={hotspots}
            activeHotspot={activeHotspot}
            pins={pins}
            spin={spin}
            reduced={reduced}
            focusShift={focusShift}
          />
        </Canvas>
      )}
      {assets &&
        hotspots.map((h, i) => (
          <HotspotPin
            key={h.id}
            ref={(el) => {
              pins.current[h.id] = el
            }}
            hotspot={h}
            index={i}
            active={activeHotspot === h.id}
            onSelect={onHotspot}
          />
        ))}
    </div>
  )
}
