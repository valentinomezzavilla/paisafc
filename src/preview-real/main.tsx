import { StrictMode, Suspense, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import '../index.css'
import type { KitId } from '../data/kits'
import { RealShirtModel, RealShirtStudioLights } from '../components/kits/real/RealShirtModel'

const ANGLES = [
  { label: 'Frente (0°)', deg: 0 },
  { label: '3/4 Izq (-32°)', deg: -32 },
  { label: '3/4 Der (+32°)', deg: 32 },
  { label: 'Perfil (75°)', deg: 75 },
  { label: 'Espalda (180°)', deg: 180 },
] as const

// Recortes exactos sobre camiseta-mockup.jpg (1200x896) para comparar pixel a pixel
const MOCKUP_CROPS: Record<KitId, { front: { x: number; y: number }; back: { x: number; y: number } }> = {
  crema: {
    front: { x: 15, y: 50 },
    back: { x: 307, y: 50 },
  },
  verde: {
    front: { x: 606, y: 50 },
    back: { x: 898, y: 50 },
  },
}

function PreviewRealApp() {
  const params = new URLSearchParams(window.location.search)
  const initialKit = (params.get('kit') === 'crema' ? 'crema' : 'verde') as KitId
  const initialDeg = Number(params.get('deg') ?? '0')
  const initialBg = (params.get('bg') === 'dark' ? 'dark' : 'studio') as 'studio' | 'dark'

  const [kit, setKit] = useState<KitId>(initialKit)
  const [deg, setDeg] = useState<number>(Number.isFinite(initialDeg) ? initialDeg : 0)
  const [bgMode, setBgMode] = useState<'studio' | 'dark'>(initialBg)

  const normDeg = ((deg % 360) + 360) % 360
  const isBack = normDeg > 90 && normDeg < 270
  const crop = isBack ? MOCKUP_CROPS[kit].back : MOCKUP_CROPS[kit].front
  const rad = (deg * Math.PI) / 180

  const canvasBg = bgMode === 'studio' ? '#cfd2d7' : '#09110c'

  return (
    <main className="min-h-screen bg-[#080f0b] text-[#EDE8DC] p-5 flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#C9A84C]">
            Paisa FC · Muestra 3D Fotorealista · Paso 2
          </p>
          <h1 className="font-display text-2xl uppercase tracking-wide">
            Comparación lado a lado: <span className="text-[#C9A84C]">camiseta-mockup.jpg</span> vs Modelo 3D Realista
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <div className="flex rounded border border-white/15 overflow-hidden">
            {(['verde', 'crema'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKit(k)}
                className={`px-3 py-1.5 uppercase cursor-pointer ${
                  kit === k ? 'bg-[#C9A84C] text-black font-semibold' : 'bg-white/5 text-[#EDE8DC]/75'
                }`}
              >
                {k === 'verde' ? 'Titular (Verde)' : 'Suplente (Crema)'}
              </button>
            ))}
          </div>

          <div className="flex rounded border border-white/15 overflow-hidden">
            {ANGLES.map((a) => (
              <button
                key={a.deg}
                type="button"
                onClick={() => setDeg(a.deg)}
                className={`px-2.5 py-1.5 cursor-pointer ${
                  deg === a.deg ? 'bg-[#EDE8DC] text-black font-semibold' : 'bg-white/5 text-[#EDE8DC]/75'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>

          <div className="flex rounded border border-white/15 overflow-hidden">
            <button
              type="button"
              onClick={() => setBgMode('studio')}
              className={`px-2.5 py-1.5 cursor-pointer ${
                bgMode === 'studio' ? 'bg-white text-black font-semibold' : 'bg-white/5 text-[#EDE8DC]/75'
              }`}
            >
              Fondo Estudio
            </button>
            <button
              type="button"
              onClick={() => setBgMode('dark')}
              className={`px-2.5 py-1.5 cursor-pointer ${
                bgMode === 'dark' ? 'bg-[#1A3A24] text-white font-semibold' : 'bg-white/5 text-[#EDE8DC]/75'
              }`}
            >
              Fondo Sitio
            </button>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch flex-1">
        {/* Columna izquierda: Referencia oficial camiseta-mockup.jpg */}
        <div className="flex flex-col rounded-xl border border-white/10 overflow-hidden bg-[#121a15]">
          <div className="px-4 py-2.5 border-b border-white/10 flex items-center justify-between text-xs font-mono">
            <span className="uppercase tracking-wider text-[#C9A84C]">
              1. Referencia oficial (public/assets/source/camiseta-mockup.jpg)
            </span>
            <span className="text-[#EDE8DC]/60">
              {kit.toUpperCase()} · {isBack ? 'ESPALDA' : 'FRENTE'}
            </span>
          </div>
          <div
            className="flex-1 flex items-center justify-center p-4"
            style={{ backgroundColor: '#cfd2d7' }}
          >
            {/* Ventana exacta 300x390 escalada x1.45 (435x565) */}
            <div
              className="relative overflow-hidden shadow-sm"
              style={{
                width: 435,
                height: 565,
                backgroundImage: 'url(/assets/source/camiseta-mockup.jpg)',
                backgroundSize: `${1200 * 1.45}px ${896 * 1.45}px`,
                backgroundPosition: `-${crop.x * 1.45}px -${crop.y * 1.45}px`,
                backgroundRepeat: 'no-repeat',
              }}
            />
          </div>
        </div>

        {/* Columna derecha: Visor 3D realista interactivo */}
        <div className="flex flex-col rounded-xl border border-[#C9A84C]/35 overflow-hidden bg-[#121a15]">
          <div className="px-4 py-2.5 border-b border-white/10 flex items-center justify-between text-xs font-mono">
            <span className="uppercase tracking-wider text-[#C9A84C]">
              2. Modelo 3D Realista (Three.js · PBR 4K · Rotable con mouse)
            </span>
            <span className="text-[#EDE8DC]/70">Ángulo: {deg}° (arrastrá para girar)</span>
          </div>
          <div
            className="flex-1 relative min-h-[580px]"
            style={{ backgroundColor: canvasBg }}
          >
            <Canvas
              dpr={[1, 2]}
              camera={{ position: [0, 0.015, 1.54], fov: 33, near: 0.1, far: 20 }}
              gl={{
                antialias: true,
                toneMapping: THREE.NeutralToneMapping,
                toneMappingExposure: 1.0,
              }}
            >
              <Suspense fallback={null}>
                <RealShirtStudioLights />
                <RealShirtModel kit={kit} rotationY={rad} />
                <OrbitControls
                  enablePan={false}
                  enableZoom={true}
                  minDistance={1.0}
                  maxDistance={2.4}
                  minPolarAngle={Math.PI * 0.32}
                  maxPolarAngle={Math.PI * 0.68}
                  target={[0, 0.015, 0]}
                />
              </Suspense>
            </Canvas>
          </div>
        </div>
      </section>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PreviewRealApp />
  </StrictMode>,
)

