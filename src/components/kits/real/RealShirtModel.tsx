import { useEffect, useMemo } from 'react'
import { useGLTF, useTexture, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import type { KitId } from '../../../data/kits'

interface RealShirtModelProps {
  kit: KitId
  rotationY?: number
}

const SHIRT_GLB = '/assets/kits/real/shirt-real.glb'

export function RealShirtModel({ kit, rotationY = 0 }: RealShirtModelProps) {
  const { scene } = useGLTF(SHIRT_GLB)

  const textures = useTexture({
    map: `/assets/kits/real/${kit}-shirt-albedo.webp`,
    normalMap: `/assets/kits/real/${kit}-shirt-normal.webp`,
    ormMap: `/assets/kits/real/${kit}-shirt-orm.webp`,
  })

  // Configurar espacio de color e inversión Y=false para coincidir con el estándar glTF UV
  useMemo(() => {
    textures.map.colorSpace = THREE.SRGBColorSpace
    textures.map.flipY = false
    textures.map.anisotropy = 8
    textures.map.needsUpdate = true

    textures.normalMap.colorSpace = THREE.NoColorSpace
    textures.normalMap.flipY = false
    textures.normalMap.anisotropy = 4
    textures.normalMap.needsUpdate = true

    textures.ormMap.colorSpace = THREE.NoColorSpace
    textures.ormMap.flipY = false
    textures.ormMap.needsUpdate = true
  }, [textures])

  const outerMaterial = useMemo(() => {
    const isVerde = kit === 'verde'
    return new THREE.MeshPhysicalMaterial({
      map: textures.map,
      normalMap: textures.normalMap,
      normalScale: new THREE.Vector2(0.35, 0.35),
      aoMap: textures.ormMap,
      aoMapIntensity: 0.18,
      roughnessMap: textures.ormMap,
      roughness: 0.94,
      metalnessMap: textures.ormMap,
      metalness: 0.02,
      specularIntensity: 0.05,
      sheen: 0.12,
      sheenRoughness: 0.85,
      sheenColor: new THREE.Color(isVerde ? '#2a5236' : '#f2ece1'),
      side: THREE.FrontSide,
    })
  }, [kit, textures])

  const innerMaterial = useMemo(() => {
    const isVerde = kit === 'verde'
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(isVerde ? '#0b1910' : '#8e877c'),
      roughness: 0.95,
      metalness: 0.0,
      side: THREE.FrontSide,
    })
  }, [kit])

  const clonedScene = useMemo(() => {
    const root = scene.clone(true)
    root.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        const mesh = node as THREE.Mesh
        // Asegurar uv1 para aoMap en Three.js r160+
        if (mesh.geometry && mesh.geometry.attributes.uv && !mesh.geometry.attributes.uv1) {
          mesh.geometry.setAttribute('uv1', mesh.geometry.attributes.uv)
        }
        if (mesh.name.includes('inner')) {
          mesh.material = innerMaterial
          mesh.castShadow = false
          mesh.receiveShadow = false
        } else {
          mesh.material = outerMaterial
          mesh.castShadow = true
          mesh.receiveShadow = true
        }
      }
    })
    return root
  }, [scene, outerMaterial, innerMaterial])

  useEffect(() => {
    return () => {
      outerMaterial.dispose()
      innerMaterial.dispose()
    }
  }, [outerMaterial, innerMaterial])

  return (
    <group rotation={[0, rotationY, 0]}>
      <primitive object={clonedScene} />
    </group>
  )
}

export function RealShirtStudioLights() {
  return (
    <>
      {/* Iluminación de estudio balanceada para respetar los tonos exactos de fotografía de producto */}
      <ambientLight intensity={2.15} color="#ffffff" />
      <hemisphereLight args={['#ffffff', '#d8d5ce', 0.65]} position={[0, 2, 0]} />
      {/* Luz principal frontal superior suave para dar relieve especular al normal map al rotar */}
      <directionalLight position={[0.6, 1.4, 2.6]} intensity={0.48} color="#fffdf9" />
      {/* Luz principal dorsal simétrica para que al girar 180° la espalda tenga la misma claridad de estudio */}
      <directionalLight position={[-0.6, 1.4, -2.6]} intensity={0.48} color="#fffdf9" />
      {/* Luces de recorte lateral (rim lights) para resaltar la curvatura 3D de mangas y costados al girar */}
      <directionalLight position={[2.4, 0.5, 0.4]} intensity={0.28} color="#f7f2e7" />
      <directionalLight position={[-2.4, 0.5, -0.4]} intensity={0.28} color="#f7f2e7" />
      <ContactShadows
        position={[0, -0.46, 0]}
        opacity={0.32}
        scale={1.4}
        blur={2.4}
        far={0.8}
        resolution={256}
        color="#050a07"
      />
    </>
  )
}

useGLTF.preload(SHIRT_GLB)

