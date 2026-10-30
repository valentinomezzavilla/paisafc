import { ContactShadows, Environment, Lightformer, OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { StrictMode, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import '@fontsource-variable/big-shoulders-display/wght'
import '@fontsource-variable/instrument-sans/wght'
import '../index.css'
import type { KitId } from '../data/kits'
import { KitModel, type KitView } from '../three/KitModel'
import { viewBounds, type KitSceneData } from '../three/kitScene'
import { useKitAssets, type KitTextures } from '../three/useKitScene'

/**
 * Punto de control de la etapa 1: el modelo sin logos, girable, al lado del mockup.
 * ?kit=verde|crema&view=shirt|full&angle=0 fija el estado (lo usa scripts/snap-preview.mjs).
 */

const params = new URLSearchParams(location.search)
const initial = {
  kit: (params.get('kit') === 'crema' ? 'crema' : 'verde') as KitId,
  view: (params.get('view') === 'full' ? 'full' : 'shirt') as KitView,
  angle: Number(params.get('angle') ?? 0),
  ui: params.get('ui') !== '0',
}

const BG: Record<KitId, [string, string]> = {
  verde: ['#1a3d24', '#0a2111'],
  crema: ['#ece6d8', '#d6cfbd'],
}
const FOV = 28

/** Encuadra la cámara a la caja de la vista. */
function Framing({ view, scene, controls }: { view: KitView; scene: KitSceneData; controls: React.RefObject<OrbitControlsImpl | null> }) {
  const camera = useThree((s) => s.camera as THREE.PerspectiveCamera)
  const size = useThree((s) => s.size)
  useEffect(() => {
    const box = viewBounds(scene, view)
    const center = box.getCenter(new THREE.Vector3())
    const dims = box.getSize(new THREE.Vector3())
    const fitH = dims.y / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2))
    const fitW = dims.x / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2)) / (size.width / size.height)
    const dist = Math.max(fitH, fitW) * 1.18
    camera.position.set(center.x, center.y + dims.y * 0.04, center.z + dist)
    camera.lookAt(center)
    controls.current?.target.copy(center)
    controls.current?.update()
  }, [view, scene, camera, controls, size])
  return null
}

/**
 * Avisa al script de capturas cuando ya se dibujaron unos cuadros. Sin la interfaz (modo captura)
 * deja de dibujar: con el render por software cada cuadro tarda y la captura se quedaría esperando.
 */
function ReadySignal() {
  const frames = useRef(0)
  const setFrameloop = useThree((s) => s.setFrameloop)
  useFrame(() => {
    if (++frames.current !== 20) return
    document.body.dataset.ready = '1'
    if (!initial.ui) setFrameloop('never')
  })
  return null
}

function Scene({ kit, view, angle, scene, textures }: { kit: KitId; view: KitView; angle: number; scene: KitSceneData; textures: KitTextures }) {
  const controls = useRef<OrbitControlsImpl>(null)
  return (
    <>
      <Framing view={view} scene={scene} controls={controls} />
      <ReadySignal />
      <OrbitControls ref={controls} enablePan={false} enableDamping minPolarAngle={Math.PI * 0.32} maxPolarAngle={Math.PI * 0.62} />

      <ambientLight intensity={0.2} />
      <directionalLight
        position={[1.6, 3.2, 2.4]}
        intensity={2.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-1}
        shadow-camera-right={1}
        shadow-camera-top={2}
        shadow-camera-bottom={-0.2}
      />
      <Environment resolution={256}>
        {/* Estudio: caja de luz grande arriba, dos rebotes laterales y un contraluz */}
        <Lightformer form="rect" intensity={2.2} position={[0, 4, 1]} rotation-x={Math.PI / 2} scale={[4, 2, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[-3, 1.2, 1.5]} rotation-y={Math.PI / 2.6} scale={[2, 3, 1]} />
        <Lightformer form="rect" intensity={0.8} position={[3, 1, 1]} rotation-y={-Math.PI / 2.4} scale={[2, 3, 1]} />
        <Lightformer form="ring" intensity={1.5} position={[0, 1.4, -3]} scale={1.5} />
      </Environment>

      <group rotation-y={THREE.MathUtils.degToRad(angle)}>
        <KitModel kit={kit} view={view} scene={scene} textures={textures} instant />
      </group>
      {view === 'full' && <ContactShadows position={[0, 0, 0]} opacity={0.55} scale={2.4} blur={2.4} far={1} resolution={1024} />}
    </>
  )
}

function Button({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 font-jersey text-sm font-bold tracking-wider uppercase ${active ? 'bg-gold text-forest-deep' : 'bg-black/25 text-cream hover:bg-black/40'}`}
    >
      {children}
    </button>
  )
}

function Preview() {
  const [kit, setKit] = useState<KitId>(initial.kit)
  const [view, setView] = useState<KitView>(initial.view)
  const [angle, setAngle] = useState(initial.angle)
  const [a, b] = BG[kit]
  const assets = useKitAssets(['verde', 'crema'])

  return (
    <div className="flex h-svh flex-col bg-neutral-900 text-cream lg:flex-row">
      <div className="relative min-h-0 flex-1" style={{ background: `radial-gradient(110% 80% at 50% 40%, ${a} 30%, ${b})` }}>
        <Canvas
          shadows="soft"
          dpr={[1, 2]}
          camera={{ fov: FOV, near: 0.05, far: 20 }}
          gl={{ antialias: true, toneMapping: THREE.AgXToneMapping, toneMappingExposure: 1.35, preserveDrawingBuffer: true }}
        >
          {assets && <Scene kit={kit} view={view} angle={angle} scene={assets.scene} textures={assets.textures[kit]} />}
        </Canvas>
        {initial.ui && (
          <div className="absolute inset-x-0 bottom-4 flex flex-wrap justify-center gap-2 px-4">
            <Button active={kit === 'verde'} onClick={() => setKit('verde')}>Titular</Button>
            <Button active={kit === 'crema'} onClick={() => setKit('crema')}>Suplente</Button>
            <span className="w-4" />
            <Button active={view === 'shirt'} onClick={() => setView('shirt')}>Camiseta</Button>
            <Button active={view === 'full'} onClick={() => setView('full')}>Conjunto</Button>
            <span className="w-4" />
            {[0, 45, 90, 180].map((deg) => (
              <Button key={deg} active={angle === deg} onClick={() => setAngle(deg)}>{`${deg}°`}</Button>
            ))}
          </div>
        )}
      </div>
      {initial.ui && (
        <figure className="flex max-h-[40svh] items-center justify-center bg-neutral-200 p-4 lg:max-h-none lg:w-[38%]">
          <img src="/assets/source/camiseta-mockup.jpg" alt="Mockup de referencia" className="max-h-full max-w-full object-contain" />
        </figure>
      )}
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Preview />
  </StrictMode>,
)
