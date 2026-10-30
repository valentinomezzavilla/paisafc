// Pósters del visor 3D: render fijo de cada kit y vista, con fondo transparente.
// Uso: con `npm run dev` corriendo, `node scripts/snap-posters.mjs [url-base]`.
// Guarda public/assets/kits/3d/posters/{kit}-{vista}.webp y su versión de 640 px.
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const base = process.argv[2] ?? 'http://localhost:5173'
const out = fileURLToPath(new URL('../public/assets/kits/3d/posters/', import.meta.url))
mkdirSync(out, { recursive: true })
// Mismas medidas que POSTER_SIZE en src/components/kits/KitPoster.tsx
const SIZE = { shirt: [900, 1000], full: [560, 1000] }

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
for (const kit of ['verde', 'crema']) {
  for (const view of ['shirt', 'full']) {
    const [width, height] = SIZE[view]
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
    await page.goto(`${base}/preview-3d.html?kit=${kit}&view=${view}&angle=0&ui=0&bg=0`, { timeout: 90_000 })
    await page.waitForSelector('body[data-ready="1"]', { timeout: 120_000 })
    const png = `${out}${kit}-${view}.png`
    await page.screenshot({ path: png, omitBackground: true, timeout: 180_000 })
    await page.close()
    // webp grande y de 640 px de ancho
    execFileSync('python', ['-c', `
from PIL import Image
im = Image.open(r'${png}')
im.save(r'${out}${kit}-${view}.webp', 'WEBP', quality=84, method=6)
w = 640 if im.width > 640 else im.width
im.resize((w, round(im.height * w / im.width)), Image.LANCZOS).save(r'${out}${kit}-${view}-640.webp', 'WEBP', quality=82, method=6)
`])
    rmSync(png)
    console.log('ok', kit, view)
  }
}
await browser.close()
