// Exporta la escena de las prendas (sin comprimir y sin AO) para que Blender la simule y la renderice.
//   npx tsx scripts/blender/export-base.ts  →  .cache/blender/kit-base.glb
import { mkdirSync, writeFileSync } from 'node:fs'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'
import { buildKitScene } from '../../src/three/bakeScene'

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
}
Object.assign(globalThis, { FileReader: NodeFileReader })

const out = new URL('../../.cache/blender/', import.meta.url)
mkdirSync(out, { recursive: true })
const glb = (await new GLTFExporter().parseAsync(buildKitScene(), { binary: true })) as ArrayBuffer
writeFileSync(new URL('kit-base.glb', out), Buffer.from(glb))
console.log(`kit-base.glb: ${(glb.byteLength / 1024).toFixed(0)} KB`)
