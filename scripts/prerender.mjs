// Inyecta el HTML renderizado de la app en dist/index.html: la primera pantalla
// (y el escudo, que es el LCP) se pinta sin esperar al JS.
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const ssrDir = new URL('../.cache/ssr/', import.meta.url)
const { render } = await import(
  pathToFileURL(new URL('entry-server.js', ssrDir).pathname.replace(/^\/([A-Za-z]:)/, '$1')).href
)
const file = new URL('../dist/index.html', import.meta.url)
const html = readFileSync(file, 'utf8')
if (!html.includes('<!--app-->')) throw new Error('dist/index.html no tiene el marcador <!--app-->')
writeFileSync(file, html.replace('<!--app-->', render()))
rmSync(ssrDir, { recursive: true, force: true })
console.log('prerender: dist/index.html listo')
