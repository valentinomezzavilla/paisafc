import * as THREE from 'three'
import type { AnchorId, DecalId } from './anchors'

export interface Anchor {
  position: THREE.Vector3
  normal: THREE.Vector3
}

export interface KitSceneData {
  /** Piezas por nombre: "shirt-body", "socks-0-cuff", "boots-1-sole"... */
  geo: Record<string, THREE.BufferGeometry>
  decals: Record<DecalId, THREE.BufferGeometry>
  anchors: Record<AnchorId, Anchor>
}

/**
 * Pasa los atributos a float y les aplica la transformación del nodo: el .glb viene cuantizado
 * (enteros + escala en el nodo) y acá se quiere la geometría ya en su lugar.
 */
function bakeTransform(mesh: THREE.Mesh): THREE.BufferGeometry {
  const src = mesh.geometry
  const geo = new THREE.BufferGeometry()
  for (const name of ['position', 'normal', 'uv'] as const) {
    const attr = src.getAttribute(name)
    if (!attr) continue
    const out = new Float32Array(attr.count * attr.itemSize)
    for (let i = 0; i < attr.count; i++) for (let k = 0; k < attr.itemSize; k++) out[i * attr.itemSize + k] = attr.getComponent(i, k)
    geo.setAttribute(name, new THREE.BufferAttribute(out, attr.itemSize))
  }
  if (src.index) geo.setIndex(src.index)
  geo.applyMatrix4(mesh.matrixWorld)
  return geo
}

/** Lee la escena de kit.glb (o la de buildKitScene) y separa piezas, calcos y anclas. */
export function readKitScene(root: THREE.Object3D): KitSceneData {
  root.updateMatrixWorld(true)
  const data: KitSceneData = { geo: {}, decals: {} as KitSceneData['decals'], anchors: {} as KitSceneData['anchors'] }
  root.traverse((obj) => {
    if (obj.name.startsWith('anchor-')) {
      const n = obj.userData.normal as [number, number, number]
      data.anchors[obj.name.slice(7) as AnchorId] = {
        position: obj.getWorldPosition(new THREE.Vector3()),
        normal: new THREE.Vector3(...n).normalize(),
      }
    } else if (obj instanceof THREE.Mesh) {
      const geo = bakeTransform(obj)
      if (obj.name.startsWith('decal-')) data.decals[obj.name.slice(6) as DecalId] = geo
      else data.geo[obj.name] = geo
    }
  })
  return data
}
