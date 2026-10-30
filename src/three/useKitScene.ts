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

const texturePromises = new Map<KitId, Promise<KitTextures>>()

/** Texturas de un kit, dibujadas una sola vez por página (las comparten los dos visores). */
export function loadKitTextures(kit: KitId): Promise<KitTextures> {
  let p = texturePromises.get(kit)
  if (!p) {
    p = Promise.all([topoTexture(kit), decalTextures(kit)]).then(([topo, decals]) => ({ topo, decals }))
    texturePromises.set(kit, p)
  }
  return p
}

export interface KitAssets {
  scene: KitSceneData
  textures: Record<KitId, KitTextures>
}

/** Geometría y texturas de los kits pedidos: null mientras cargan, 'error' si algo falló. */
export function useKitAssets(kits: KitId[]): KitAssets | null | 'error' {
  const [state, setState] = useState<KitAssets | null | 'error'>(null)
  const key = kits.join(',')
  useEffect(() => {
    let alive = true
    const ids = key.split(',') as KitId[]
    Promise.all([loadKitScene(), ...ids.map(loadKitTextures)]).then(
      ([scene, ...tex]) => {
        if (alive) setState({ scene, textures: Object.fromEntries(ids.map((id, i) => [id, tex[i]])) as Record<KitId, KitTextures> })
      },
      () => {
        if (alive) setState('error')
      },
    )
    return () => {
      alive = false
    }
  }, [key])
  return state
}
