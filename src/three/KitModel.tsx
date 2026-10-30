import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { KitId } from '../data/kits'
import { DECALS } from './anchors'
import { topoOffset, topoRepeat } from './design/topoTexture'
import { fabricMaterial } from './fabric'
import { cuffStripeColors, KIT_COLORS } from './kitColors'
import type { KitSceneData } from './kitScene'
import type { KitTextures } from './useKitScene'

export type KitView = 'shirt' | 'full'

// Perímetros aproximados de cada pieza, para que la trama y las curvas tengan el mismo tamaño en todas.
const PERIMETER = { torso: 1.1, sleeve: 0.47, collar: 0.09, legs: 0.66, sock: 0.28 }
/** Cuánto bajan short, medias y botines cuando se ocultan en la vista de camiseta. */
const LOWER_DROP = 0.35

function useKitMaterials(kit: KitId, textures: KitTextures) {
  const materials = useMemo(() => {
    const c = KIT_COLORS[kit]
    const topo = (perimeter: number) => {
      const t = textures.topo.clone()
      const [ru, rv] = topoRepeat(perimeter)
      t.repeat.set(ru, rv)
      t.offset.x = topoOffset(ru)
      t.needsUpdate = true
      return t
    }
    const twoSided = (m: THREE.MeshPhysicalMaterial) => {
      m.side = THREE.DoubleSide
      return m
    }
    const pair = (color: string, perimeter: number, withTopo = false) => {
      const map = withTopo ? topo(perimeter) : undefined
      return { outer: fabricMaterial(color, { perimeter, map }), inner: fabricMaterial(color, { perimeter, map, inner: true }) }
    }
    const [stripeA, stripeB] = cuffStripeColors(c)
    const decal = (map: THREE.Texture, roughness: number) =>
      new THREE.MeshPhysicalMaterial({
        map,
        transparent: true,
        roughness,
        specularIntensity: 0.4,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -4,
      })
    return {
      torso: pair(c.fabric, PERIMETER.torso, true),
      sleeve: pair(c.fabric, PERIMETER.sleeve, true),
      collar: twoSided(fabricMaterial(c.fabric, { perimeter: PERIMETER.collar })),
      trim: twoSided(fabricMaterial(c.trim, { perimeter: PERIMETER.collar, roughness: 0.7 })),
      cuffA: twoSided(fabricMaterial(stripeA, { perimeter: PERIMETER.sleeve, roughness: 0.7 })),
      cuffB: twoSided(fabricMaterial(stripeB, { perimeter: PERIMETER.sleeve, roughness: 0.7 })),
      legs: pair(c.shorts, PERIMETER.legs),
      stripe: twoSided(fabricMaterial(c.shortsStripe, { perimeter: PERIMETER.collar, roughness: 0.7 })),
      sock: pair(c.socks, PERIMETER.sock),
      boot: new THREE.MeshPhysicalMaterial({ color: c.boots, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.4 }),
      bootInner: new THREE.MeshStandardMaterial({ color: new THREE.Color(c.boots).multiplyScalar(0.3), side: THREE.BackSide }),
      sole: new THREE.MeshStandardMaterial({ color: c.sole, roughness: 0.65 }),
      // Vinilo estampado: un poco más liso que la tela. El escudo es bordado: más mate.
      decals: Object.fromEntries(
        DECALS.map((d) => [d.id, decal(textures.decals[d.id], d.id === 'escudo' || d.id === 'shortEscudo' ? 0.75 : 0.55)]),
      ) as Record<(typeof DECALS)[number]['id'], THREE.MeshPhysicalMaterial>,
    }
  }, [kit, textures])

  useEffect(
    () => () => {
      const all: THREE.Material[] = []
      for (const m of Object.values(materials)) {
        if (m instanceof THREE.Material) all.push(m)
        else if ('outer' in m) all.push(m.outer, m.inner)
        else all.push(...Object.values(m))
      }
      for (const m of all) {
        const p = m as THREE.MeshPhysicalMaterial
        // Los clones de textura comparten la imagen: liberar el clon no borra el original.
        if (p.map && !Object.values(textures.decals).includes(p.map as THREE.CanvasTexture)) p.map.dispose()
        p.normalMap?.dispose()
        m.dispose()
      }
    },
    [materials, textures],
  )
  return materials
}

/** Prenda abierta: tela por afuera y su cara interna más oscura (se ve por el cuello, las mangas y el ruedo). */
function Shell({ geometry, pair }: { geometry: THREE.BufferGeometry; pair: { outer: THREE.Material; inner: THREE.Material } }) {
  return (
    <group>
      <mesh geometry={geometry} material={pair.outer} castShadow receiveShadow />
      <mesh geometry={geometry} material={pair.inner} />
    </group>
  )
}

interface KitModelProps {
  kit: KitId
  view: KitView
  scene: KitSceneData
  textures: KitTextures
  /** Sin animación: el short y lo demás aparecen o desaparecen de golpe. */
  instant?: boolean
}

/** Conjunto completo en maniquí invisible. En la vista "shirt" el short, las medias y los botines bajan y se ocultan. */
export function KitModel({ kit, view, scene, textures, instant = false }: KitModelProps) {
  const g = scene.geo
  const m = useKitMaterials(kit, textures)
  const lower = useRef<THREE.Group>(null)
  const show = useRef(view === 'full' ? 1 : 0)

  useFrame((_, dt) => {
    const target = view === 'full' ? 1 : 0
    show.current = instant ? target : THREE.MathUtils.damp(show.current, target, 7, dt)
    const grp = lower.current
    if (!grp) return
    grp.position.y = -LOWER_DROP * (1 - show.current) ** 2
    grp.visible = show.current > 0.02
  })

  return (
    <group>
      <Shell geometry={g['shirt-body']} pair={m.torso} />
      <Shell geometry={g['shirt-sleeveL']} pair={m.sleeve} />
      <Shell geometry={g['shirt-sleeveR']} pair={m.sleeve} />
      <mesh geometry={g['shirt-collar']} material={m.collar} castShadow />
      <mesh geometry={g['shirt-collarTrim']} material={m.trim} />
      <mesh geometry={g['shirt-cuffTrimL']} material={m.cuffA} />
      <mesh geometry={g['shirt-cuffTrimR']} material={m.cuffA} />
      <mesh geometry={g['shirt-cuffTrim2L']} material={m.cuffB} />
      <mesh geometry={g['shirt-cuffTrim2R']} material={m.cuffB} />
      {DECALS.filter((d) => d.id !== 'shortEscudo').map((d) => (
        <mesh key={d.id} geometry={scene.decals[d.id]} material={m.decals[d.id]} renderOrder={1} />
      ))}

      <group ref={lower}>
        <Shell geometry={g['shorts-legL']} pair={m.legs} />
        <Shell geometry={g['shorts-legR']} pair={m.legs} />
        <mesh geometry={g['shorts-stripeL']} material={m.stripe} />
        <mesh geometry={g['shorts-stripeR']} material={m.stripe} />
        <mesh geometry={scene.decals.shortEscudo} material={m.decals.shortEscudo} renderOrder={1} />
        {[0, 1].map((i) => (
          <group key={i}>
            <Shell geometry={g[`socks-${i}-sock`]} pair={m.sock} />
            <Shell geometry={g[`socks-${i}-cuff`]} pair={m.sock} />
            <mesh geometry={g[`boots-${i}-upper`]} material={m.boot} castShadow />
            <mesh geometry={g[`boots-${i}-upper`]} material={m.bootInner} />
            <mesh geometry={g[`boots-${i}-sole`]} material={m.sole} castShadow />
          </group>
        ))}
      </group>
    </group>
  )
}
