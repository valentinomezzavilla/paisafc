# Camisetas 3D — Etapa 2: diseño, visor e integración — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vestir el modelo aprobado en la etapa 1 con el diseño vectorizado (logos, nombre, número, sponsors, curvas de nivel, ribetes), reemplazar la sección `#camisetas` por un visor 3D que se gira arrastrando y tiene detalles tocables, y pasar "Las dos juntas" a 3D, sin trabar la primera pantalla.

**Architecture:** La geometría se hornea offline (`scripts/bake-kit.ts` → `public/assets/kits/3d/kit.glb`, comprimido con meshopt) junto con los calcos (DecalGeometry proyectada sobre la tela) y las anclas de los detalles. En el cliente, un chunk diferido carga el `.glb`, arma materiales por kit y dibuja los diseños en canvas (paths y texto vectorial rasterizados a alta resolución). El SSR muestra pósters estáticos; el canvas se monta cuando el navegador queda libre y la sección está cerca.

**Tech Stack:** three 0.186, @react-three/fiber 9, @react-three/drei 10, @gltf-transform (cli) para meshopt, tsx para correr el horneado, vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-29-camisetas-3d-design.md` (etapa 1 aprobada por el usuario el 2026-10-30).

## Global Constraints

- El usuario mira el modelo de frente desde `+z`; el lado derecho del jugador es `-x`. Escudo en el pecho izquierdo del jugador (`+x`), parche "R" en la manga derecha del jugador (`sleeveL`, `x < 0`), escudo chico del short abajo en la pierna derecha del jugador (`legL`), como en el mockup.
- Nada se baja de terceros en runtime (sin CDN de Draco ni HDRI): decoder meshopt de `three/addons`, iluminación con `Lightformer`.
- `.glb` < 400 KB. El primer render del sitio no importa three (chunk diferido).
- Sin secuestro del scroll: sin zoom con rueda, `touch-action: pan-y`, solo el arrastre horizontal gira.
- `prefers-reduced-motion`: sin giro de presentación, sin inercia, transiciones cortas.
- Textos de UI en español rioplatense, en `src/data/texts.ts`. Datos de detalles en `src/data/kits.ts`.
- Commits en `camisetas-3d`, uno por tarea.

## Review Focus

- **Detalle tocado del lado de atrás**: un punto que queda de espaldas a la cámara no se puede tocar ni se ve; al tocar uno visible, el modelo gira hasta mostrarlo de frente.
- **Arrastre vertical en el celular**: tiene que scrollear la página, no girar.
- **Sin WebGL / error al cargar el `.glb`**: queda el póster y los detalles como lista accesible.
- **Cambio de kit en medio de un giro o de un foco**: no deja materiales mezclados ni el foco trabado.
- **Calcos sobre la tela**: sin z-fighting ni partes del logo que floten o se corten en las curvas.

---

### Task 1: v por largo de arco y simetría de pliegues

**Files:** Modify `src/three/loft.ts`, `src/three/garments/shirt.ts`; Test `src/three/__tests__/loft.test.ts`, `shirt.test.ts`

**Interfaces:** `loft(rings, { closed?, uvScale?, v?: 'center' | 'arc' })` — `'arc'`: v de cada vértice = largo acumulado por su columna (metros). Torso, mangas, piernas y medias usan `'arc'`.

- [ ] Test: loft `'arc'` de dos anillos de radios distintos → `v` del vértice superior = distancia real entre los dos vértices de esa columna. Test: los pliegues del torso son simétricos en x (el borde del puño izquierdo y el derecho quedan a la misma distancia del torso ±0,5 mm, y ninguno lo toca).
- [ ] FAIL → implementar (pliegues con `|sin t|` y `cos t`, sin términos impares en x) → PASS → commit.

### Task 2: Anclas y calcos (datos + cálculo)

**Files:** Create `src/three/anchors.ts`; Modify `src/data/kits.ts`; Test `src/three/__tests__/anchors.test.ts`

**Interfaces:**
- `type Piece = 'torso' | 'sleeveL' | 'sleeveR' | 'legL' | 'legR'`
- `interface AnchorSpec { piece: Piece; angle: number /* grados alrededor del eje y, 0 = frente, 90 = +x */; y: number /* metros */ }`
- `ANCHORS: Record<AnchorId, AnchorSpec>` con `AnchorId = 'cuello' | 'escudo' | 'vezza' | 'parche' | 'punos' | 'textura' | 'nombre' | 'numero' | 'sponsor' | 'shortEscudo'`.
- `DECALS: { id: DecalId; anchor: AnchorId; size: [number, number] /* m */; spin?: number }[]` con `DecalId = 'escudo' | 'vezza' | 'parche' | 'nombre' | 'numero' | 'sponsor' | 'shortEscudo'`.
- `anchorOnSurface(mesh: THREE.Mesh, spec: AnchorSpec): { position: THREE.Vector3; normal: THREE.Vector3 }` — rayo horizontal desde el eje de la pieza hacia afuera; para mangas, rayo desde el eje de la manga.
- `facingAngle(normal: THREE.Vector3): number` — rotación y del modelo que deja esa normal mirando a `+z`.
- En `kits.ts`, cada `Hotspot` pasa de `{x, y}` a `{ anchor: AnchorId }`; se agrega `shortEscudo` ("Escudo en el short") a los dos kits; `frontHotspots`/`backHotspots` se reemplazan por `hotspots` (el lado lo da el ancla).

- [ ] Tests: cada ancla cae a < 2 mm de la superficie de su pieza y su normal apunta hacia afuera; `facingAngle` de una normal en `+x` da `-90°`; el escudo queda en `x > 0`, el parche en `x < 0`.
- [ ] FAIL → implementar → PASS → commit.

### Task 3: Horneado del modelo

**Files:** Create `scripts/bake-kit.ts`, `public/assets/kits/3d/kit.glb`; Modify `package.json` (`"bake:kit": "tsx scripts/bake-kit.ts && gltf-transform meshopt …"`); Test `src/three/__tests__/bake.test.ts`

**Interfaces:**
- `buildKitScene(): THREE.Scene` (en `src/three/bakeScene.ts`, puro, testeable): una malla por pieza con `name` = clave de `KitGeometry` (`shirt.body`, `shirt.sleeveL`, …, `boots.1.sole`), mallas de calco `decal.<DecalId>` (DecalGeometry sobre su pieza, corrida 0,6 mm hacia afuera) y `Object3D` vacíos `anchor.<AnchorId>` con `userData.normal`.
- `readKitScene(root: THREE.Object3D): { geo: Record<string, THREE.BufferGeometry>; anchors: Record<AnchorId, { position; normal }> }` en `src/three/kitScene.ts`.

- [ ] Test: `readKitScene(buildKitScene())` devuelve todas las piezas de `KitGeometry`, los 7 calcos y las 10 anclas.
- [ ] FAIL → implementar → PASS. Correr `npm run bake:kit` → `kit.glb` < 400 KB. Commit.

### Task 4: Diseños en canvas

**Files:** Create `src/three/design/{draw.ts,decalTextures.ts,topoTexture.ts}`

**Interfaces:**
- `decalTextures(kit: KitId): Promise<Record<DecalId, THREE.CanvasTexture>>` — espera `document.fonts.load` de Big Shoulders e Instrument Sans y las imágenes (`escudo.png`, `toms-burger.png`); dibuja: VEZZA (‹/› + palabra, como `VezzaMark`), parche circular con "R" itálica y rayo (como `PatchMark`), MEZZAVILLA y 11 en Big Shoulders 900 con contorno, Tom's Burger (imagen teñida con `source-in`), escudo (imagen), escudo chico del short. Colores del kit (titular: dorado `#cdbb8b` con contorno verde oscuro; suplente: verde `#22432e` con contorno dorado).
- `topoTexture(kit: KitId): THREE.CanvasTexture` — color de la tela + curvas de nivel de `topo-*.svg` (titular marcadas, suplente apenas), repetición entera alrededor.
- Resolución: 1024 px por calco; 2048 la textura de tela.

- [ ] Verificación visual en la página de revisión (Task 5). Commit.

### Task 5: KitModel desde el `.glb` + materiales finales

**Files:** Modify `src/three/KitModel.tsx`, `fabric.ts`, `kitColors.ts`, `garments/shirt.ts` (franjas del puño separadas A/B), `src/preview/main.tsx`; Create `src/three/useKitScene.ts`

**Interfaces:** `useKitScene(): KitSceneData | null` (carga `kit.glb` con `GLTFLoader` + `MeshoptDecoder`, cache de módulo). `<KitModel kit view scene />` dibuja piezas, calcos (`MeshPhysicalMaterial` transparente con `polygonOffset`) y franjas con `trim`/`trim2`. Tela: `specularIntensity 0.35`, `normalScale 0.6`, celda de trama 3 mm, mapa de color con las curvas. Se saca la cintura del short que no se ve. Suela izquierda construida espejada (sin `flipWinding`).

- [ ] Test: `kitColors` define `trim2` para la suplente y las franjas A/B usan `trim`/`trim2`.
- [ ] Capturas con `node scripts/snap-preview.mjs`: logos derechos, legibles, sin z-fighting, en los dos kits. Commit.

### Task 6: Visor 3D con giro libre y detalles

**Files:** Create `src/components/kits/viewer/{KitViewer.tsx,KitStage.tsx,useSpin.ts,HotspotPin.tsx}`; Test `src/components/kits/viewer/__tests__/spin.test.ts`

**Interfaces:**
- `spinStep(state: { angle; velocity }, dt: number, reduced: boolean): { angle; velocity }` — inercia con fricción (velocidad × 0,92 por cada 16 ms), corte bajo 0,0005 rad/ms; `reduced` → velocidad 0.
- `isFacing(normal: THREE.Vector3, toCamera: THREE.Vector3): boolean` (dot > 0,15).
- `shortestTurn(from: number, to: number): number` (diferencia en (-π, π]).
- `<KitViewer kit view activeHotspot onHotspot onReady />`: `Canvas` transparente; arrastre horizontal gira (pointer events, `touch-action: pan-y`), vertical ±12° de inclinación solo con mouse; flechas ←/→ giran 20°; foco: gira con `shortestTurn` hasta `facingAngle` del ancla y acerca la cámara al punto; `Esc`, el botón cerrar o tocar el fondo vuelve; giro de presentación de medio giro la primera vez que entra en pantalla; `frameloop` en pausa fuera de pantalla; cambio de kit: giro de 360° en 0,8 s y cambio de materiales a la mitad.

- [ ] Tests de `spinStep`, `isFacing`, `shortestTurn` (FAIL → PASS). Commit.

### Task 7: Sección `#camisetas` con el visor

**Files:** Modify `src/components/kits/KitSection.tsx`, `src/data/texts.ts`; Create `src/components/kits/ViewToggle.tsx`, `src/components/kits/KitPoster.tsx`; Delete `KitLayer.tsx`, `GarmentView.tsx`, `StepNav.tsx`, `steps.ts` (y `Hotspot.tsx` salvo `HotspotCard`, que se mueve a `viewer/`)

Sección de una pantalla, sin pin. Fondo por kit con el wipe radial actual, encabezado del kit, el visor encima (cargado con `React.lazy` cuando `useIdleReady` y la sección está a < 1 pantalla), `ViewToggle` (Camiseta / Conjunto) + `KitSwitcher` + pista ("Arrastrá para girarla · Tocá los puntos"). Tarjeta del detalle: en desktop al costado del modelo, en mobile abajo. Lista `sr-only` de detalles y `aria-live`. Hasta que carga: `KitPoster` (webp del render). Sin WebGL: póster + lista de detalles visible.

- [ ] `npm run build` pasa; el HTML prerenderizado tiene el póster y no carga three. Commit.

### Task 8: "Las dos juntas" en 3D

**Files:** Modify `src/components/kits/KitsTogether.tsx`; Create `src/components/kits/viewer/TogetherStage.tsx`

Un solo `Canvas` sobre las dos mitades de color; titular y suplente en conjunto completo, una sobre cada mitad. Con el scroll giran desde ±35° hacia ±12° (mirándose apenas). Póster en el prerender. Commit.

### Task 9: Pósters, limpieza y verificación final

**Files:** Create `scripts/snap-posters.mjs`, `public/assets/kits/3d/posters/*.webp`; Delete fotos viejas de `public/assets/kits/*.{png,webp}` y `KitPicture.tsx` si nada las usa; Modify `README.md`, memoria del proyecto.

- [ ] Pósters (fondo transparente) por kit y vista, y uno de las dos juntas.
- [ ] `npx vitest run`, `npx tsc -b`, `npx oxlint`, `npm run build` en verde; Lighthouse local desktop ≥ 95.
- [ ] Capturas del sitio en desktop y mobile (Playwright) revisadas. Commit.
