import * as THREE from 'three'
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import { ANCHORS, anchorOnSurface, DECALS, pieceMesh, type AnchorId } from './anchors'
import { buildKitGeometry } from './assembly'

/** Los calcos quedan apenas despegados de la tela para que no titilen contra ella. */
const DECAL_LIFT = 0.0006
/** Profundidad mínima del proyector; los calcos anchos necesitan más para llegar a la tela que se aleja en las curvas. */
const DECAL_DEPTH = 0.05

/** Recorre KitGeometry y devuelve cada geometría con su nombre ("shirt-body", "socks-0-cuff"...). */
function flatten(value: unknown, prefix: string, out: [string, THREE.BufferGeometry][]) {
  if (value instanceof THREE.BufferGeometry) out.push([prefix, value])
  else if (value && typeof value === 'object' && !(value instanceof THREE.Box3)) {
    for (const [k, v] of Object.entries(value)) flatten(v, prefix ? `${prefix}-${k}` : k, out)
  }
  return out
}

function decalGeometry(mesh: THREE.Mesh, position: THREE.Vector3, normal: THREE.Vector3, size: [number, number]) {
  // El proyector mira hacia afuera con el "arriba" vertical: el diseño queda derecho y se lee de frente.
  const helper = new THREE.Object3D()
  helper.position.copy(position)
  helper.lookAt(position.clone().add(normal))
  const geo = new DecalGeometry(mesh, position, helper.rotation, new THREE.Vector3(size[0], size[1], Math.max(DECAL_DEPTH, size[0] * 0.5)))
  const pos = geo.getAttribute('position')
  const nor = geo.getAttribute('normal')
  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(i, pos.getX(i) + nor.getX(i) * DECAL_LIFT, pos.getY(i) + nor.getY(i) * DECAL_LIFT, pos.getZ(i) + nor.getZ(i) * DECAL_LIFT)
  }
  // DecalGeometry sale sin índices (cada triángulo con sus tres vértices): soldarlos achica el archivo a la mitad
  return mergeVertices(geo, 1e-5)
}

/**
 * Escena que se hornea en kit.glb: una malla por pieza, una por calco ("decal-<id>") y un nodo vacío
 * por ancla ("anchor-<id>", con la normal en userData). Los materiales se arman en el cliente.
 */
export function buildKitScene(): THREE.Scene {
  const kit = buildKitGeometry()
  const scene = new THREE.Scene()
  const placeholder = new THREE.MeshStandardMaterial()

  for (const [name, geo] of flatten({ shirt: kit.shirt, shorts: kit.shorts, socks: kit.socks, boots: kit.boots }, '', [])) {
    if (name === 'shorts-waistband') continue // queda tapada por la camiseta
    const mesh = new THREE.Mesh(geo, placeholder)
    mesh.name = name
    scene.add(mesh)
  }

  const resolved = {} as Record<AnchorId, { position: THREE.Vector3; normal: THREE.Vector3 }>
  for (const [id, spec] of Object.entries(ANCHORS) as [AnchorId, (typeof ANCHORS)[AnchorId]][]) {
    resolved[id] = anchorOnSurface(pieceMesh(kit, spec.piece), spec)
    const node = new THREE.Object3D()
    node.name = `anchor-${id}`
    node.position.copy(resolved[id].position)
    node.userData.normal = resolved[id].normal.toArray()
    scene.add(node)
  }

  for (const d of DECALS) {
    const { position, normal } = resolved[d.anchor]
    const mesh = new THREE.Mesh(decalGeometry(pieceMesh(kit, ANCHORS[d.anchor].piece), position, normal, d.size), placeholder)
    mesh.name = `decal-${d.id}`
    scene.add(mesh)
  }
  return scene
}
