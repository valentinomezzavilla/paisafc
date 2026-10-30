// Capturas del punto de control del modelado 3D (etapa 1).
// Uso: con `npm run dev` corriendo, `node scripts/snap-preview.mjs [url-base] [filtro]`
// (filtro: parte del nombre, p. ej. `verde-full`).
// Guarda docs/superpowers/checkpoints/etapa-1/{kit}-{vista}-{ángulo}.png
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const base = process.argv[2] ?? 'http://localhost:5173'
const only = process.argv[3] ?? ''
const out = new URL('../docs/superpowers/checkpoints/etapa-1/', import.meta.url)
await mkdir(out, { recursive: true })

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: 900, height: 1000 }, deviceScaleFactor: 1.5 })
page.on('pageerror', (e) => console.error('pageerror:', e.message))
page.on('console', (m) => m.type() === 'error' && console.error('console:', m.text()))

for (const kit of ['verde', 'crema']) {
  for (const view of ['shirt', 'full']) {
    for (const angle of [0, 45, 90, 180]) {
      if (!`${kit}-${view}-${angle}`.includes(only)) continue
      await page.goto(`${base}/preview-3d.html?kit=${kit}&view=${view}&angle=${angle}&ui=0`, { timeout: 90_000 })
      await page.waitForSelector('body[data-ready="1"]', { timeout: 60_000 })
      const file = new URL(`${kit}-${view}-${angle}.png`, out)
      await page.screenshot({ path: fileURLToPath(file) })
      console.log('ok', file.pathname.split('/').pop())
    }
  }
}
await browser.close()
