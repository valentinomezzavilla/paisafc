// Renderiza las capas vectoriales a 1800x2340 (escala 6x sobre el recorte 300x390 del mockup)
// usando el motor SVG nativo de Chromium y las fuentes del proyecto para máxima nitidez al 100 % de zoom.
import { chromium } from 'playwright'
import { readFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const outDir = 'C:/Users/valen/.gemini/antigravity/brain/2fcbbfd0-23fc-457d-8a66-0a3ba81cb840/scratch/layers'
mkdirSync(outDir, { recursive: true })

const W = 1800
const H = 2340 // Exactamente 6x de (300 x 390)

const artDir = 'public/assets/kits/real/art'
const b64 = (file, mime = 'image/svg+xml') =>
  `data:${mime};base64,${readFileSync(join(artDir, file)).toString('base64')}`

const fontB64 = readFileSync('node_modules/@fontsource-variable/big-shoulders-display/files/big-shoulders-display-latin-wght-normal.woff2').toString('base64')

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })

// 1. Capa de curvas de nivel topográficas para la titular verde (con repetición en espejo sin costuras)
const topoSvgRaw = readFileSync('public/assets/topo-gold.svg', 'utf8')
  .replace(/stroke="#[0-9a-f]+"/i, 'stroke="#071a0d"')
  .replace(/stroke-width="[\d.]+"/, 'stroke-width="3.6"')
const topoUri = `data:image/svg+xml;base64,${Buffer.from(topoSvgRaw).toString('base64')}`

await page.setContent(`
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { width: ${W}px; height: ${H}px; background: transparent; overflow: hidden; display: grid; grid-template-columns: repeat(2, 900px); grid-template-rows: repeat(5, 562px); }
    .tile { width: 900px; height: 562px; background-image: url("${topoUri}"); background-size: 100% 100%; }
    .fx { transform: scaleX(-1); }
    .fy { transform: scaleY(-1); }
    .fxy { transform: scale(-1, -1); }
  </style>
  <body>
    <div class="tile"></div><div class="tile fx"></div>
    <div class="tile fy"></div><div class="tile fxy"></div>
    <div class="tile"></div><div class="tile fx"></div>
    <div class="tile fy"></div><div class="tile fxy"></div>
    <div class="tile"></div><div class="tile fx"></div>
  </body>
`)
await page.screenshot({ path: join(outDir, 'verde-topo.png'), omitBackground: true })

// 1b. Capa de jacquard de rombos para la suplente crema
const argyleUri = b64('rombos-jacquard.svg')
await page.setContent(`
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: ${W}px; height: ${H}px; background: transparent; overflow: hidden;
      background-image: url("${argyleUri}");
      background-size: 210px 210px;
      background-repeat: repeat;
    }
  </style>
  <body></body>
`)
await page.screenshot({ path: join(outDir, 'crema-argyle.png'), omitBackground: true })

for (const kit of ['verde', 'crema']) {
  const ink = kit === 'verde' ? '#d6c48f' : '#1d452a'
  // 2. Capa de logos vectoriales FRENTE
  await page.setContent(`
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { width: ${W}px; height: ${H}px; background: transparent; overflow: hidden; position: relative; }
      .vezza {
        position: absolute;
        left: ${132 * 6}px;
        top: ${136 * 6}px;
        width: ${82 * 6}px;
        height: ${86 * 6}px;
      }
      .escudo {
        position: absolute;
        left: ${205 * 6}px;
        top: ${81 * 6}px;
        width: ${46 * 6}px;
        height: ${53 * 6}px;
        filter: drop-shadow(0px 3px 4px rgba(0,0,0,0.35));
      }
      .parche-front {
        position: absolute;
        left: ${-4 * 6}px;
        top: ${97 * 6}px;
        width: ${58 * 6}px;
        height: ${58 * 6}px;
        transform: rotate(-5deg);
      }
    </style>
    <body>
      <img class="vezza" src="${b64(`vezza-${kit}.svg`)}" />
      <img class="escudo" src="${b64('escudo.png', 'image/png')}" />
      <svg class="parche-front" viewBox="0 0 240 240">
        <circle cx="120" cy="120" r="102" fill="none" stroke="${ink}" stroke-width="8.5" />
        <path fill="${ink}" d="M 118,168 L 132,74 L 176,74 C 195,74 205,85 202,102 C 199,117 188,126 172,129 L 194,168 L 170,168 L 151,131 L 139,131 L 134,168 Z M 143,112 L 164,112 C 174,112 180,107 181,99 C 182,92 177,89 167,89 L 146,89 Z" />
      </svg>
    </body>
  `)
  await page.screenshot({ path: join(outDir, `${kit}-front-logos.png`), omitBackground: true })

  // 3. Capa de logos vectoriales ESPALDA (con fuente Big Shoulders Display embebida)
  await page.setContent(`
    <style>
      @font-face {
        font-family: 'BSD';
        src: url("data:font/woff2;base64,${fontB64}") format('woff2');
        font-weight: 100 900;
      }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { width: ${W}px; height: ${H}px; background: transparent; overflow: hidden; position: relative; }
      .mezzavilla {
        position: absolute;
        left: ${73 * 6}px;
        top: ${71 * 6}px;
        width: ${148 * 6}px;
        height: ${32 * 6}px;
      }
      .dorsal {
        position: absolute;
        left: ${108 * 6}px;
        top: ${117 * 6}px;
        width: ${79 * 6}px;
        height: ${118 * 6}px;
      }
      .toms {
        position: absolute;
        left: ${88 * 6}px;
        top: ${262 * 6}px;
        width: ${113 * 6}px;
        height: ${61 * 6}px;
      }
      .parche-back {
        position: absolute;
        left: ${246 * 6}px;
        top: ${97 * 6}px;
        width: ${58 * 6}px;
        height: ${58 * 6}px;
        transform: rotate(5deg);
      }
    </style>
    <body>
      <svg class="mezzavilla" viewBox="0 0 888 192">
        <defs>
          <path id="arch" d="M 16,162 Q 444,148 872,162" />
        </defs>
        <text fill="${ink}" font-family="'BSD', sans-serif" font-weight="800" font-size="162" text-anchor="middle">
          <textPath href="#arch" startOffset="50%" textLength="856" lengthAdjust="spacingAndGlyphs">MEZZAVILLA</textPath>
        </text>
      </svg>
      <img class="dorsal" src="${b64(`dorsal-11-${kit}.svg`)}" />
      <img class="toms" src="${b64(`toms-burger-${kit}.svg`)}" />
      <svg class="parche-back" viewBox="0 0 240 240">
        <circle cx="120" cy="120" r="102" fill="none" stroke="${ink}" stroke-width="8.5" />
        <polygon fill="${ink}" points="106,56 58,132 94,132 76,192 138,108 100,108" />
      </svg>
    </body>
  `)
  await page.screenshot({ path: join(outDir, `${kit}-back-logos.png`), omitBackground: true })
}

await browser.close()
console.log('Capas vectoriales 4K renderizadas en', outDir)
