// Exporta a PNG los diseños que dibuja el sitio (calcos y tela) para usarlos como texturas en Blender.
//   npx vite --port 5199  y después  node scripts/blender/export-textures.mjs  →  .cache/blender/tex/
// Se dibujan en el navegador con el mismo código del sitio: mismas tipografías, mismas medidas.
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const url = process.argv[2] ?? 'http://localhost:5199/preview-3d.html'
const out = fileURLToPath(new URL('../../.cache/blender/tex/', import.meta.url))
mkdirSync(out, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(url, { waitUntil: 'networkidle' })
const files = await page.evaluate(async () => {
  const { decalTextures } = await import('/src/three/design/decalTextures.ts')
  const { topoTexture } = await import('/src/three/design/topoTexture.ts')
  const result = {}
  for (const kit of ['verde', 'crema']) {
    const decals = await decalTextures(kit)
    for (const [id, { map }] of Object.entries(decals)) result[`${kit}-${id}.png`] = map.image.toDataURL('image/png')
    result[`${kit}-fabric.png`] = (await topoTexture(kit)).image.toDataURL('image/png')
  }
  return result
})
for (const [name, data] of Object.entries(files)) {
  writeFileSync(out + name, Buffer.from(data.split(',')[1], 'base64'))
  console.log(name)
}
await browser.close()
