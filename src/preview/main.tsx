import { ContactShadows, OrbitControls } from '@react-three/drei'
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
import { EXPOSURE, StudioLights } from '../three/StudioLights'
import { bakeVertexAO } from '../three/ao'
import { buildKitScene } from '../three/bakeScene'
import { readKitScene, viewBounds, type KitSceneData } from '../three/kitScene'
import { loadKitTextures, useKitAssets, type KitAssets, type KitTextures } from '../three/useKitScene'

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
  /** bg=0: fondo transparente, para los pósters del sitio. */
  bg: params.get('bg') !== '0',
  /** live=1: arma la geometría en el navegador en vez de leer kit.glb (para probar cambios sin hornear). */
  live: params.get('live') === '1',
  /** noshadow=1: sin sombras proyectadas, para separar defectos de sombra de los de material. */
  noShadow: params.get('noshadow') === '1',
}

function useLiveAssets(kits: KitId[]): KitAssets | null {
  const [assets, setAssets] = useState<KitAssets | null>(null)
  useEffect(() => {
    if (!initial.live) return
    let alive = true
    void Promise.all(kits.map(loadKitTextures)).then((tex) => {
      const built = buildKitScene()
      bakeVertexAO(built, { rays: 24 })
      if (alive) setAssets({ scene: readKitScene(built), textures: Object.fromEntries(kits.map((k, i) => [k, tex[i]])) as KitAssets['textures'] })
    })
    return () => {
      alive = false
    }
  }, [kits])
  return assets
}

const BOTH: KitId[] = ['verde', 'crema']

const BG: Record<KitId, [string, string]> = {
  verde: ['#1a3d24', '#0a2111'],
  crema: ['#ece6d8', '#d6cfbd'],
}
// Igual que el visor del sitio, así los pósters calzan con el 3D
const FOV = 26

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
    const dist = Math.max(fitH, fitW) * (view === 'full' ? 1.18 : 1.32)
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

      <StudioLights />

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
  const loaded = useKitAssets(BOTH)
  const live = useLiveAssets(BOTH)
  const assets = initial.live ? live : loaded === 'error' ? null : loaded

  return (
    <div className={`flex h-svh flex-col text-cream lg:flex-row ${initial.bg ? 'bg-neutral-900' : ''}`}>
      <div className="relative min-h-0 flex-1" style={initial.bg ? { background: `radial-gradient(110% 80% at 50% 40%, ${a} 30%, ${b})` } : undefined}>
        <Canvas
          shadows={initial.noShadow ? false : 'soft'}
          dpr={[1, 2]}
          camera={{ fov: FOV, near: 0.05, far: 20 }}
          gl={{ antialias: true, alpha: true, toneMapping: THREE.NeutralToneMapping, toneMappingExposure: EXPOSURE, preserveDrawingBuffer: true }}
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
