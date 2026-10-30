import { useEffect, useState } from 'react'
import type * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import type { KitId } from '../data/kits'
import { asset } from '../lib/asset'
import type { DecalId } from './anchors'
import { decalTextures } from './design/decalTextures'
import { topoTexture } from './design/topoTexture'
import { readKitScene, type KitSceneData } from './kitScene'

let scenePromise: Promise<KitSceneData> | null = null

/** Carga kit.glb una sola vez por página (lo comparten el visor y "Las dos juntas"). */
export function loadKitScene(): Promise<KitSceneData> {
  scenePromise ??= new GLTFLoader()
    .setMeshoptDecoder(MeshoptDecoder)
    .loadAsync(asset('assets/kits/3d/kit.glb'))
    .then((gltf) => readKitScene(gltf.scene))
  return scenePromise
}

export interface KitTextures {
  topo: THREE.CanvasTexture
  decals: Record<DecalId, THREE.CanvasTexture>
}

export function loadKitTextures(kit: KitId): Promise<KitTextures> {
  return Promise.all([topoTexture(kit), decalTextures(kit)]).then(([topo, decals]) => ({ topo, decals }))
}

/** Geometría y texturas de los kits pedidos; null hasta que está todo. */
export function useKitAssets(kits: KitId[]): { scene: KitSceneData; textures: Record<KitId, KitTextures> } | null {
  const [state, setState] = useState<{ scene: KitSceneData; textures: Record<KitId, KitTextures> } | null>(null)
  const key = kits.join(',')
  useEffect(() => {
    let alive = true
    const ids = key.split(',') as KitId[]
    Promise.all([loadKitScene(), ...ids.map(loadKitTextures)]).then(([scene, ...tex]) => {
      if (alive) setState({ scene, textures: Object.fromEntries(ids.map((id, i) => [id, tex[i]])) as Record<KitId, KitTextures> })
    })
    return () => {
      alive = false
    }
  }, [key])
  return state
}
