import { ContactShadows } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import * as THREE from 'three'
import { KITS } from '../../../data/kits'
import { useMediaQuery } from '../../../hooks/useMediaQuery'
import { MOTION } from '../../../lib/gsap'
import { KitModel } from '../../../three/KitModel'
import { viewBounds, type KitSceneData } from '../../../three/kitScene'
import { StudioLights } from '../../../three/StudioLights'
import { useKitAssets, type KitTextures } from '../../../three/useKitScene'
import { FOV } from './KitStage'

const PAIR = KITS.slice(0, 2)
const PAIR_IDS = PAIR.map((k) => k.id)
/** Giro de cada camiseta hacia la otra: arrancan de costado y se enderezan con el scroll. */
const FROM = THREE.MathUtils.degToRad(35)
const TO = THREE.MathUtils.degToRad(12)
/** Alto del modelo en pantalla (fracción del alto de la sección) y cuánto ocupa de ancho en su mitad. */
const MODEL_H = 0.5
const MODEL_W = 0.8
/** Centro del modelo en pantalla, bajado esta fracción del alto (deja lugar al título arriba). */
const DROP = 0.04

const ease = (t: number) => 1 - (1 - t) ** 3

interface PairProps {
  scene: KitSceneData
  textures: Record<string, KitTextures>
  progress: RefObject<number>
  reduced: boolean
}

function Pair({ scene, textures, progress, reduced }: PairProps) {
  const camera = useThree((s) => s.camera as THREE.PerspectiveCamera)
  const size = useThree((s) => s.size)
  const turn = useRef<(THREE.Group | null)[]>([])

  // Encuadre: las dos camisetas quedan centradas, cada una en su mitad de la pantalla.
  const frame = useMemo(() => {
    const box = viewBounds(scene, 'full')
    const center = box.getCenter(new THREE.Vector3())
    const dims = box.getSize(new THREE.Vector3())
    const t = Math.tan(THREE.MathUtils.degToRad(FOV / 2))
    const aspect = size.width / size.height
    const dist = Math.max(dims.y / MODEL_H / 2 / t, dims.x / MODEL_W / t / aspect)
    const visH = 2 * dist * t
    return { center, dist, visH, spread: (visH * aspect) / 4 }
  }, [scene, size.width, size.height])

  useEffect(() => {
    const { center, dist, visH } = frame
    const y = center.y + DROP * visH
    camera.position.set(0, y, dist)
    camera.lookAt(0, y, 0)
    camera.updateProjectionMatrix()
  }, [camera, frame])

  useFrame(() => {
    const p = reduced ? 1 : ease(progress.current)
    const angle = THREE.MathUtils.lerp(FROM, TO, p)
    turn.current.forEach((g, i) => g && (g.rotation.y = (i === 0 ? 1 : -1) * angle))
  })

  return (
    <>
      <StudioLights shadowSpan={frame.spread * 2} />
      {PAIR.map((k, i) => {
        const x = (i === 0 ? -1 : 1) * frame.spread
        return (
          <group key={k.id} position={[x, 0, 0]}>
            <group ref={(el) => void (turn.current[i] = el)}>
              <KitModel kit={k.id} view="full" scene={scene} textures={textures[k.id]} instant />
            </group>
            <ContactShadows opacity={0.5} scale={2.4} blur={2.6} far={1.2} resolution={512} frames={1} />
          </group>
        )
      })}
    </>
  )
}

export interface TogetherStageProps {
  /** Avance del scroll, de 0 a 1 (lo maneja la sección). */
  progress: RefObject<number>
  onReady: () => void
  onError: () => void
}

/**
 * "Las dos juntas": un solo canvas sobre las dos mitades de color, con titular y suplente en conjunto
 * completo, una en cada mitad. Con el scroll se giran hacia el centro, mirándose apenas.
 */
export default function TogetherStage({ progress, onReady, onError }: TogetherStageProps) {
  const loaded = useKitAssets(PAIR_IDS)
  const assets = loaded === 'error' ? null : loaded
  const reduced = useMediaQuery(MOTION.reduced)
  const wrap = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: '10% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (loaded === 'error') onError()
    else if (loaded) onReady()
  }, [loaded, onReady, onError])

  return (
    <div ref={wrap} aria-hidden className="pointer-events-none absolute inset-0 z-[5]">
      {assets && (
        <Canvas
          frameloop={inView ? 'always' : 'never'}
          shadows
          dpr={[1, 2]}
          camera={{ fov: FOV, near: 0.05, far: 20 }}
          gl={{ antialias: true, alpha: true, toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1.05 }}
        >
          <Pair scene={assets.scene} textures={assets.textures} progress={progress} reduced={reduced} />
        </Canvas>
      )}
    </div>
  )
}
