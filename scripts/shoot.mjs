// Capturas de verificación visual en mobile y desktop.
//   node scripts/shoot.mjs <nombre> [selector-o-scrollY ...] [--wait=ms] [--reduced] [--url=...]
// Cada posición puede ser un número (scrollY en px) o un selector CSS al que se hace scroll.
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const flags = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')))
const [name = 'shot', ...positions] = args.filter((a) => !a.startsWith('--'))
const url = flags.url ?? 'http://localhost:5173/'
const wait = Number(flags.wait ?? 2600)
const out = fileURLToPath(new URL('../.cache/shots/', import.meta.url))
mkdirSync(out, { recursive: true })

const viewports = {
  mobile: { viewport: { width: 375, height: 760 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
}
const only = flags.only ? flags.only.split(',') : Object.keys(viewports)

const browser = await chromium.launch()
for (const vp of only) {
  const page = await browser.newPage({ ...viewports[vp], reducedMotion: 'reduced' in flags ? 'reduce' : 'no-preference' })
  page.on('pageerror', (e) => console.log(`[${vp}] pageerror:`, e.message))
  page.on('console', (m) => m.type() === 'error' && console.log(`[${vp}] console:`, m.text()))
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(wait)
  const list = positions.length ? positions : ['0']
  for (const [i, pos] of list.entries()) {
    if (/^\d+$/.test(pos)) await page.evaluate((y) => window.scrollTo(0, y), Number(pos))
    else await page.evaluate((s) => document.querySelector(s)?.scrollIntoView(), pos)
    await page.waitForTimeout(Number(flags.settle ?? 1200))
    const file = `${out}${name}-${vp}-${i}.png`
    await page.screenshot({ path: file })
    console.log(file)
  }
  await page.close()
}
await browser.close()
