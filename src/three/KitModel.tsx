import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { KitId } from '../data/kits'
import { buildKitGeometry } from './assembly'
import { fabricMaterial } from './fabric'
import { KIT_COLORS } from './kitColors'

export type KitView = 'shirt' | 'full'

// Perímetros aproximados de cada pieza, para que la trama tenga el mismo tamaño en todas.
const PERIMETER = { torso: 1.15, sleeve: 0.47, collar: 0.09, legs: 0.68, sock: 0.3 }

function useKitMaterials(kit: KitId) {
  const materials = useMemo(() => {
    const c = KIT_COLORS[kit]
    const twoSided = (m: THREE.MeshPhysicalMaterial) => {
      m.side = THREE.DoubleSide
      return m
    }
    const pair = (color: string, perimeter: number) => ({
      outer: fabricMaterial(color, { perimeter }),
      inner: fabricMaterial(color, { perimeter, inner: true }),
    })
    return {
      torso: pair(c.fabric, PERIMETER.torso),
      sleeve: pair(c.fabric, PERIMETER.sleeve),
      collar: twoSided(fabricMaterial(c.fabric, { perimeter: PERIMETER.collar })),
      trim: twoSided(fabricMaterial(c.trim, { perimeter: PERIMETER.collar, roughness: 0.7 })),
      legs: pair(c.shorts, PERIMETER.legs),
      stripe: twoSided(fabricMaterial(c.shortsStripe, { perimeter: PERIMETER.collar, roughness: 0.7 })),
      sock: pair(c.socks, PERIMETER.sock),
      boot: new THREE.MeshPhysicalMaterial({ color: c.boots, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.4 }),
      bootInner: new THREE.MeshStandardMaterial({ color: new THREE.Color(c.boots).multiplyScalar(0.3), side: THREE.BackSide }),
      sole: new THREE.MeshStandardMaterial({ color: c.sole, roughness: 0.65 }),
    }
  }, [kit])

  useEffect(
    () => () => {
      for (const m of Object.values(materials)) {
        const list = m instanceof THREE.Material ? [m] : [m.outer, m.inner]
        list.forEach((x) => {
          ;(x as THREE.MeshPhysicalMaterial).normalMap?.dispose()
          x.dispose()
        })
      }
    },
    [materials],
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
}

/** Conjunto completo en maniquí invisible. En la vista "shirt" se muestra solo la camiseta. */
export function KitModel({ kit, view }: KitModelProps) {
  const geo = buildKitGeometry()
  const m = useKitMaterials(kit)
  const full = view === 'full'

  return (
    <group>
      <Shell geometry={geo.shirt.body} pair={m.torso} />
      <Shell geometry={geo.shirt.sleeveL} pair={m.sleeve} />
      <Shell geometry={geo.shirt.sleeveR} pair={m.sleeve} />
      <mesh geometry={geo.shirt.collar} material={m.collar} castShadow />
      <mesh geometry={geo.shirt.collarTrim} material={m.trim} />
      <mesh geometry={geo.shirt.cuffTrimL} material={m.trim} />
      <mesh geometry={geo.shirt.cuffTrimR} material={m.trim} />

      <group visible={full}>
        <Shell geometry={geo.shorts.legL} pair={m.legs} />
        <Shell geometry={geo.shorts.legR} pair={m.legs} />
        <mesh geometry={geo.shorts.stripeL} material={m.stripe} />
        <mesh geometry={geo.shorts.stripeR} material={m.stripe} />
        {geo.socks.map((s, i) => (
          <group key={i}>
            <Shell geometry={s.sock} pair={m.sock} />
            <Shell geometry={s.cuff} pair={m.sock} />
          </group>
        ))}
        {geo.boots.map((b, i) => (
          <group key={i}>
            <mesh geometry={b.upper} material={m.boot} castShadow />
            <mesh geometry={b.upper} material={m.bootInner} />
            <mesh geometry={b.sole} material={m.sole} castShadow />
          </group>
        ))}
      </group>
    </group>
  )
}
