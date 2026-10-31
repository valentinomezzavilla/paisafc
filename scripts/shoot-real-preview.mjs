// Captura vistas lado a lado de preview-real.html en memoria (sin puertos TCP) usando Vite middlewareMode + Playwright route
import fs from 'node:fs'
import path from 'node:path'
import { createServer } from 'vite'
import { chromium } from 'playwright'

const SCRATCH = 'C:/Users/valen/.gemini/antigravity/brain/2fcbbfd0-23fc-457d-8a66-0a3ba81cb840/scratch'
const ROOT = process.cwd()

const MIME_MAP = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.ts': 'application/javascript; charset=utf-8',
  '.tsx': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.glb': 'model/gltf-binary',
  '.woff2': 'font/woff2',
}

const vite = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
})

try {
  const browser = await chromium.launch()
  const page = await browser.newPage({
    viewport: { width: 1380, height: 820 },
    deviceScaleFactor: 1.5,
  })

  page.on('pageerror', (e) => console.error('pageerror:', e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') console.error('console error:', m.text())
  })

  await page.route('http://paisa.local/**', async (route) => {
    const reqUrl = new URL(route.request().url())
    const urlPath = reqUrl.pathname + reqUrl.search
    const cleanPath = decodeURIComponent(reqUrl.pathname)

    try {
      // 1. Archivos HTML en la raíz (como /preview-real.html)
      if (cleanPath.endsWith('.html')) {
        const htmlFile = path.join(ROOT, cleanPath.slice(1))
        if (fs.existsSync(htmlFile)) {
          const rawHtml = fs.readFileSync(htmlFile, 'utf8')
          const html = await vite.transformIndexHtml(urlPath, rawHtml)
          await route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html })
          return
        }
      }

      // 2. Archivos estáticos en public/
      const pubFile = path.join(ROOT, 'public', cleanPath)
      if (fs.existsSync(pubFile) && fs.statSync(pubFile).isFile()) {
        const ext = path.extname(pubFile).toLowerCase()
        const body = fs.readFileSync(pubFile)
        await route.fulfill({
          status: 200,
          contentType: MIME_MAP[ext] || 'application/octet-stream',
          body,
        })
        return
      }

      // 3. Archivos estáticos directos (como fuentes en node_modules)
      const directFile = path.join(ROOT, cleanPath)
      const ext = path.extname(cleanPath).toLowerCase()
      if (
        ['.woff2', '.woff', '.ttf', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.glb'].includes(ext) &&
        fs.existsSync(directFile) &&
        fs.statSync(directFile).isFile()
      ) {
        const body = fs.readFileSync(directFile)
        await route.fulfill({
          status: 200,
          contentType: MIME_MAP[ext] || 'application/octet-stream',
          body,
        })
        return
      }

      // 4. Módulos JS/TS/TSX/CSS transformados por Vite
      const result = await vite.transformRequest(urlPath)
      if (result) {
        await route.fulfill({
          status: 200,
          contentType: 'application/javascript; charset=utf-8',
          body: result.code,
        })
        return
      }

      await route.fulfill({ status: 404, body: 'Not found: ' + urlPath })
    } catch (err) {
      console.error('Route error for', urlPath, err)
      await route.fulfill({ status: 500, body: String(err) })
    }
  })

  const shots = [
    { name: 'muestra-verde-frente-estudio.png', query: '?kit=verde&deg=0&bg=studio' },
    { name: 'muestra-verde-34-izq.png', query: '?kit=verde&deg=-32&bg=studio' },
    { name: 'muestra-verde-34-der.png', query: '?kit=verde&deg=32&bg=studio' },
    { name: 'muestra-verde-espalda-estudio.png', query: '?kit=verde&deg=180&bg=studio' },
    { name: 'muestra-verde-frente-sitio.png', query: '?kit=verde&deg=0&bg=dark' },
  ]

  for (const s of shots) {
    await page.goto(`http://paisa.local/preview-real.html${s.query}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1400)
    const outPath = path.join(SCRATCH, s.name)
    await page.screenshot({ path: outPath })
    console.log('Capturado:', outPath)
  }

  await browser.close()
} finally {
  await vite.close()
}
