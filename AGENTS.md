# Paisa FC: reglas para agentes (Antigravity)

Sitio one-page de lanzamiento de las camisetas de Paisa FC. Stack: Vite + React 19 + TypeScript + Tailwind v4 + GSAP + Lenis, con three.js / @react-three/fiber / drei para 3D. El usuario escribe en español rioplatense: respondele con voseo y comentá el código en español.

## La tarea actual

Reemplazar la camiseta 3D que hizo Claude (procedural, se ve "de dibujo") por una presentación **realista, de fotografía de producto**, de las dos equipaciones que el usuario dejó en `public/assets/source/`:

- `camiseta-mockup.jpg`: la verde (titular) y la crema (suplente), de frente y de espalda, con short y medias. **Ese diseño manda.**
- `escudo.jpeg`: el escudo del club.

Antes de empezar, activá el skill **`camiseta-realista`** (`.agents/skills/camiseta-realista/`): tiene el pedido completo, la vara de calidad y cómo verificar. Si el usuario quiere volver a lo de Claude, usá **`volver-al-3d-de-claude`**.

### Estado actual (2026-10-30): el sitio usa la versión de Blender de Claude

El usuario eligió que Claude hiciera la camiseta realista en Blender, y es la que está en el sitio:

- Los scripts están en `scripts/blender/`. Parten de un modelo de CLO3D de Sketchfab (CC BY 4.0, con crédito en el footer) y le pintan los diseños.
- Los componentes están en `src/components/kits/blender/`. Las fotos de la vuelta están en `public/assets/kits/blender/`.
- `src/App.tsx` importa esas secciones, marcadas `[BLENDER]`. Las del visor 3D de three.js quedaron comentadas, marcadas `[CLAUDE-3D]`.

**No reemplaces ni borres esta versión sin que el usuario te lo pida.** Si te pide una alternativa, hacela en archivos nuevos y enchufala igual: comentando la import anterior en `App.tsx`.

## Regla 1: comentar, nunca borrar, lo que hizo Claude

El usuario quiere poder volver atrás si no le gusta el resultado nuevo.

- **No borres ni sobrescribas** archivos de Claude. Eso incluye `src/three/**`, `src/components/kits/viewer/**`, `src/components/kits/blender/**`, `scripts/blender/**`, `scripts/bake-kit.ts`, `scripts/snap-posters.mjs`, `public/assets/kits/3d/**`, `public/assets/kits/blender/**`, `preview-3d.html`, `preview-blender.html` y `src/preview/**`.
- Si tenés que dejar de usar algo de Claude, **comentalo** con el prefijo `[CLAUDE-3D]` o `[BLENDER]`, como está hecho en `src/App.tsx`.
- Si una línea existe solo porque el código de Claude está comentado, marcala con `// [SIN-CLAUDE-3D]`. Así se sabe qué borrar al volver.
- Lo tuyo va en **archivos nuevos**: componentes en `src/components/kits/real/`, assets en `public/assets/kits/real/`, scripts nuevos en `scripts/`.
- En los archivos compartidos, marcá con `[ANTIGRAVITY]` cada lugar donde enchufes lo tuyo.
- Hay un respaldo completo del estado anterior en la rama `respaldo/camisetas-3d-claude`. **No la borres ni la muevas.**

## Regla 2: no romper la primera pantalla

- Nada pesado (three, modelos, secuencias de imágenes) puede cargarse en la carga inicial. Usá `React.lazy` y el hook `src/hooks/useViewerGate.ts`, igual que el visor de Claude. La sección `#camisetas` queda pegada al hero; si montás al cargar, el TBT se va a ~3,6 s.
- El HTML se prerenderiza (`npm run build` corre `scripts/prerender.mjs`). Lo que se vea antes de hidratar tiene que ser una imagen estática (póster), y también es lo que queda si no hay WebGL.
- Después de tocar la carga, corré `npx -y lighthouse` en desktop y chequeá que el TBT siga cerca de 0.

## Regla 3: verificar antes de decir "listo"

- `npx tsc -b`, `npm run lint`, `npm test` y `npm run build` tienen que pasar.
- Hacé capturas con `node scripts/shoot.mjs <nombre> "#camisetas"` (con `npm run dev` corriendo) y comparalas lado a lado con `camiseta-mockup.jpg`. Mostrale las capturas al usuario.
- No hagas commits ni push sin que el usuario lo pida. Trabajá en la rama `camisetas-3d`.
