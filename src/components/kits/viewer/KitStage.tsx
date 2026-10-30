import { ContactShadows } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import * as THREE from 'three'
import type { Hotspot, KitId } from '../../../data/kits'
import { DECALS, facingAngle, type AnchorId } from '../../../three/anchors'
import { KitModel, type KitView } from '../../../three/KitModel'
import { viewBounds, type KitSceneData } from '../../../three/kitScene'
import { StudioLights } from '../../../three/StudioLights'
import type { KitTextures } from '../../../three/useKitScene'
import { isFacing, shortestTurn, spinStep } from './spin'

export const FOV = 26
/** Inclinación máxima con el mouse (radianes). */
export const MAX_TILT = 0.21
/** Duración del giro al cambiar de kit (ms). */
const SWITCH_MS = 800

/** Estado del giro que manejan a la vez el arrastre (afuera del canvas) y el cuadro a cuadro. */
export interface SpinControl {
  angle: number
  velocity: number
  tilt: number
  dragging: boolean
  /** Ángulo al que se lleva el modelo (foco en un detalle, giro de presentación); null = libre. */
  target: number | null
}

interface KitStageProps {
  kit: KitId
  view: KitView
  scene: KitSceneData
  textures: Record<KitId, KitTextures>
  hotspots: Hotspot[]
  activeHotspot: AnchorId | null
  /** Puntos de los detalles (DOM, encima del canvas): el escenario los ubica cada cuadro. */
  pins: RefObject<Partial<Record<AnchorId, HTMLDivElement | null>>>
  spin: RefObject<SpinControl>
  reduced: boolean
  /** Con un detalle en foco, corre el modelo esta cantidad de px a la izquierda (lugar para la tarjeta). */
  focusShift: number
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

export function KitStage({ kit, view, scene, textures, hotspots, activeHotspot, pins, spin, reduced, focusShift }: KitStageProps) {
  const camera = useThree((s) => s.camera as THREE.PerspectiveCamera)
  const size = useThree((s) => s.size)
  const model = useRef<THREE.Group>(null)

  // Cambio de kit: la camiseta da una vuelta entera y cambia de tela en la mitad del giro.
  const [shownKit, setShownKit] = useState(kit)
  const switching = useRef<{ start: number; from: number; swapped: boolean } | null>(null)
  useEffect(() => {
    if (kit === shownKit) return
    if (reduced) {
      setShownKit(kit)
      return
    }
    switching.current = { start: performance.now(), from: spin.current.angle, swapped: false }
  }, [kit, shownKit, reduced, spin])

  // Encuadre de cada vista: centro y distancia de cámara para que entre la caja completa.
  const frames = useMemo(() => {
    const fit = (box: THREE.Box3, margin: number) => {
      const center = box.getCenter(new THREE.Vector3())
      const dims = box.getSize(new THREE.Vector3())
      const t = Math.tan(THREE.MathUtils.degToRad(FOV / 2))
      const dist = Math.max(dims.y / 2 / t, dims.x / 2 / t / (size.width / size.height)) * margin
      return { center, dist }
    }
    return { shirt: fit(viewBounds(scene, 'shirt'), 1.32), full: fit(viewBounds(scene, 'full'), 1.18) }
  }, [scene, size.width, size.height])

  const anchors = scene.anchors
  // Dónde va cada punto: en los diseños, arriba a la derecha del logo (para no taparlo); en lo demás, sobre el ancla.
  const pinPoints = useMemo(() => {
    const up = new THREE.Vector3(0, 1, 0)
    return Object.fromEntries(
      (Object.keys(anchors) as AnchorId[]).map((id) => {
        const a = anchors[id]
        const decal = DECALS.find((d) => d.anchor === id)
        const p = a.position.clone().addScaledVector(a.normal, 0.004)
        if (decal) {
          const right = new THREE.Vector3().crossVectors(up, a.normal).normalize()
          const tUp = new THREE.Vector3().crossVectors(a.normal, right).normalize()
          const [fx, fy] = decal.pinAt ?? [0.5, 0.5]
          p.addScaledVector(right, decal.size[0] * fx + 0.012).addScaledVector(tUp, decal.size[1] * fy - 0.004)
        }
        return [id, p]
      }),
    ) as Record<AnchorId, THREE.Vector3>
  }, [anchors])
  const active = activeHotspot ? anchors[activeHotspot] : null
  const camGoal = useRef({ pos: new THREE.Vector3(), look: new THREE.Vector3() })
  const lookAt = useRef(new THREE.Vector3().copy(frames[view].center))
  const first = useRef(true)

  // Foco en un detalle: el modelo gira hasta dejarlo de frente. Al soltarlo queda donde quedó.
  const hadFocus = useRef(false)
  useEffect(() => {
    if (active) spin.current.target = facingAngle(active.normal)
    else if (hadFocus.current) spin.current.target = null
    hadFocus.current = Boolean(active)
  }, [active, spin])

  useFrame((_, delta) => {
    const s = spin.current
    const dt = Math.min(delta, 0.05) * 1000
    const sw = switching.current

    if (sw) {
      const p = Math.min(1, (performance.now() - sw.start) / SWITCH_MS)
      s.angle = sw.from + ease(p) * Math.PI * 2
      if (p >= 0.5 && !sw.swapped) {
        sw.swapped = true
        setShownKit(kit)
      }
      if (p >= 1) {
        switching.current = null
        s.angle = sw.from
      }
    } else if (s.target !== null && !s.dragging) {
      const d = shortestTurn(s.angle, s.target)
      s.angle = reduced ? s.target : s.angle + d * (1 - Math.exp(-dt / 140))
      s.velocity = 0
      if (Math.abs(d) < 0.001 && !active) s.target = null
    } else if (!s.dragging) {
      Object.assign(s, spinStep(s, dt, reduced))
    }

    const g = model.current
    if (g) {
      g.rotation.y = s.angle
      g.rotation.x = THREE.MathUtils.damp(g.rotation.x, active ? 0 : s.tilt, 8, delta)
    }

    // Cámara: encuadre de la vista, o cerca del detalle en foco
    const f = frames[view]
    const goal = camGoal.current
    if (active && g) {
      const p = active.position.clone().applyEuler(g.rotation)
      goal.look.copy(p).lerp(f.center, 0.25)
      goal.pos.set(goal.look.x, goal.look.y, goal.look.z + f.dist * (view === 'full' ? 0.42 : 0.72))
    } else {
      goal.look.copy(f.center)
      goal.pos.set(f.center.x, f.center.y + f.dist * 0.04, f.center.z + f.dist)
    }
    // Lugar para la tarjeta: el encuadre se corre en pantalla
    camera.setViewOffset(size.width, size.height, active ? focusShift : 0, 0, size.width, size.height)
    const k = first.current || reduced ? 1 : 1 - Math.exp(-delta * 4.5)
    camera.position.lerp(goal.pos, k)
    lookAt.current.lerp(goal.look, k)
    camera.lookAt(lookAt.current)
    first.current = false

    // Detalles: cada punto sigue a su ancla en pantalla; solo se ven y se tocan los que miran a la cámara
    if (g) {
      camera.updateMatrixWorld()
      const toCam = new THREE.Vector3()
      const n = new THREE.Vector3()
      const p = new THREE.Vector3()
      for (const h of hotspots) {
        const el = pins.current[h.id]
        if (!el) continue
        n.copy(anchors[h.id].normal).applyEuler(g.rotation)
        p.copy(pinPoints[h.id]).applyEuler(g.rotation)
        toCam.copy(camera.position).sub(p).normalize()
        const visible = (view === 'full' || h.id !== 'shortEscudo') && !sw && isFacing(n, toCam)
        if (el.dataset.visible !== String(visible)) {
          el.dataset.visible = String(visible)
          el.inert = !visible
        }
        p.project(camera)
        el.style.transform = `translate3d(${((p.x + 1) / 2) * size.width}px, ${((1 - p.y) / 2) * size.height}px, 0)`
      }
    }
  })

  const full = view === 'full'
  const floorY = useMemo(() => viewBounds(scene, 'shirt').min.y - 0.12, [scene])

  return (
    <>
      <StudioLights />
      <group ref={model}>
        <KitModel kit={shownKit} view={view} scene={scene} textures={textures[shownKit]} instant={reduced} />
      </group>
      <ContactShadows position={[0, full ? 0 : floorY, 0]} opacity={full ? 0.5 : 0.28} scale={full ? 2.4 : 1.6} blur={2.6} far={1.2} resolution={512} frames={reduced ? 1 : Infinity} />
    </>
  )
}
