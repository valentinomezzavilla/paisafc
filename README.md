# Paisa FC

Sitio de una sola página para presentar las camisetas de Paisa FC: la **titular verde bosque** y la
**suplente crema**, el escudo y los sponsors.

Stack: Vite + React + TypeScript + Tailwind CSS v4, GSAP (ScrollTrigger y SplitText) y Lenis para el
scroll suave. El HTML se prerenderiza en el build, así que la primera pantalla aparece sin esperar al JS.

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:5173
```

## Build y despliegue

```bash
npm run build      # genera dist/ (estático, con rutas relativas)
npm run preview    # prueba el build en http://localhost:4173
```

`dist/` funciona en cualquier hosting estático, en la raíz o en una subcarpeta:

- **Vercel**: importá el repo. Framework "Vite", build `npm run build`, output `dist`.
- **Netlify**: build `npm run build`, publish directory `dist`.
- **VPS (nginx)**: copiá `dist/` al servidor y apuntá un `server` a esa carpeta:
  ```nginx
  server {
    root /var/www/paisa/dist;
    location / { try_files $uri $uri/ /index.html; }
    location /static/ { expires 1y; add_header Cache-Control "public, immutable"; }
  }
  ```

Antes de publicar, poné la URL definitiva en las etiquetas Open Graph de `index.html` (ver TODO):
las redes necesitan rutas absolutas para la imagen de vista previa.

## Cómo editar el contenido

Todo el contenido está en `src/data/`. Los componentes no tienen textos ni datos sueltos.

### Titular y suplente

En `src/data/kits.ts`, una sola línea define qué kit es cada uno:

```ts
export const ROLES: Record<KitId, KitRole> = { verde: 'titular', crema: 'suplente' }
```

Para invertirlos: `{ verde: 'suplente', crema: 'titular' }`. Toda la interfaz se adapta sola: las
etiquetas ("Titular · Verde bosque"), el orden del selector, el kit con el que abre el sitio (siempre la
titular) y los textos alternativos de las imágenes.

### Agregar un tercer kit

1. Sumá el id a `KitId` (por ejemplo `'negro'`) y su rol a `ROLES` (`negro: 'alternativa'`).
2. Agregá su objeto a `KIT_LIST`: nombre del color, paleta (`theme`), las cuatro fotos y los hotspots.
3. Las fotos van en `public/assets/kits/` con versión grande (`nombre.webp`) y chica (`nombre-640.webp`).

Los hotspots se ubican con `x` / `y` en % sobre la foto de la prenda. El cierre "Las dos juntas"
muestra los dos primeros kits (titular y suplente).

### Textos

`src/data/texts.ts` tiene todo lo demás: hero, títulos, partes del escudo, sponsors, redes y footer.

## Assets

Los originales están en `public/assets/source/` (`escudo.jpeg` y `camiseta-mockup.jpg`). El script
`scripts/prepare_assets.py` hace todo lo siguiente:

- recorta las 8 prendas (`titular|suplente-frente|espalda|short|medias`) sin fondo, en PNG y WebP;
- genera el escudo transparente, el favicon, el apple-touch-icon y la imagen Open Graph;
- mide la paleta sobre las imágenes y escribe `src/styles/palette.css`;
- extrae la letra de Tom's Burger y genera la textura de grano.

```bash
python -m venv .venv
.venv/Scripts/pip install -r scripts/requirements.txt   # macOS/Linux: .venv/bin/pip
.venv/Scripts/python scripts/prepare_assets.py           # --esrgan: amplía con Real-ESRGAN
node scripts/make_topo.mjs                               # curvas de nivel (topo-gold / topo-forest)
```

**Sobre la resolución:** el mockup mide 1200 px de ancho, así que cada prenda tiene unos 300 px. El
script las amplía ×4. Por defecto usa Lanczos con un poco de nitidez. Con `--esrgan` usa Real-ESRGAN,
que da un resultado bastante mejor, pero necesita el binario `realesrgan-ncnn-vulkan` en
`tools/esrgan/`. La sección muestra la camiseta a 480 px como máximo para no pasar de lo que aguanta la
foto. Con un mockup en alta resolución, reemplazá el archivo en `source/` y volvé a correr el script.

`node scripts/shoot.mjs <nombre> [scrollY...]` saca capturas en mobile y desktop (en `.cache/shots/`)
para revisar cambios visuales.
