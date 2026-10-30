// Hornea el modelo 3D de las camisetas en public/assets/kits/3d/kit-raw.glb.
// Lo corre `npm run bake:kit`, que después lo comprime con meshopt en kit.glb.
import { mkdirSync, writeFileSync } from 'node:fs'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'
import { bakeVertexAO } from '../src/three/ao'
import { buildKitScene } from '../src/three/bakeScene'

// El exportador usa FileReader (API del navegador) para armar el binario.
class NodeFileReader {
  result: ArrayBuffer | string | null = null
  onloadend: (() => void) | null = null
  readAsArrayBuffer(blob: Blob) {
    void blob.arrayBuffer().then((buf) => {
      this.result = buf
      this.onloadend?.()
    })
  }
  readAsDataURL(blob: Blob) {
    void blob.arrayBuffer().then((buf) => {
      this.result = `data:${blob.type};base64,${Buffer.from(buf).toString('base64')}`
      this.onloadend?.()
    })
  }
}
Object.assign(globalThis, { FileReader: NodeFileReader })

const out = new URL('../public/assets/kits/3d/', import.meta.url)
mkdirSync(out, { recursive: true })

const scene = buildKitScene()
bakeVertexAO(scene, { rays: 64 })
const glb = (await new GLTFExporter().parseAsync(scene, { binary: true })) as ArrayBuffer
writeFileSync(new URL('kit-raw.glb', out), Buffer.from(glb))
console.log(`kit-raw.glb: ${(glb.byteLength / 1024).toFixed(0)} KB`)
