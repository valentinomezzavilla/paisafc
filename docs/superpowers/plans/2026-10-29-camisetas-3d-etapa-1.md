# Camisetas 3D — Etapa 1: modelado de las prendas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modelar en código camiseta (cuello polo), short, medias y botines como maniquí invisible, con material de tela base, y mostrarlos girables en `http://localhost:5173/preview-3d.html` al lado del mockup para el punto de control del usuario.

**Architecture:** Geometría paramétrica en TypeScript sobre three.js (`src/three/`): un esqueleto de referencia único (`BODY`) y un "loft" genérico que une secciones transversales en una malla con UV. Cada prenda es un builder puro que devuelve `BufferGeometry`; un componente R3F (`KitModel`) las arma con los colores del kit. Una página de desarrollo aparte (no entra al build) sirve de punto de control. La etapa 2 (UV definitivas, texturas vectoriales, hotspots, visor en el sitio, "Las dos juntas", pósters, export a `.glb`) se planifica después de que el usuario apruebe esta.

**Tech Stack:** three 0.186, @react-three/fiber 9, @react-three/drei 10, vitest 5 (nuevo), Playwright (ya instalado) para capturas.

**Spec:** `docs/superpowers/specs/2026-10-29-camisetas-3d-design.md`

## Global Constraints

- Unidades en metros, `y = 0` en el piso, el maniquí mira a `+z`. Una sola escala para todas las piezas.
- Sin modelos ni HDRI de terceros: nada se baja de la red en runtime (iluminación con `Lightformer` de drei).
- Sin logos en esta etapa: solo color base de la tela + ribetes como piezas de color (cuello, puños, franja del short).
- Colores: titular tela `--color-forest-deep` `#12321c`→ usar `#1d4a2a` en 3D (la luz oscurece), ribetes `#cdbb8b`; suplente tela `#e5decd`, ribetes `#22432e` + `#cdbb8b`; short siempre verde; medias del color de la tela; botines verdes (titular) / blancos (suplente). Tomar de `src/styles/palette.css`, ajustar a ojo solo la tela verde.
- La página de preview no entra al build de producción (`npm run build` sigue generando solo `index.html`).
- Textos de UI en español rioplatense.
- Commits en la rama `camisetas-3d`, uno por tarea.

## Review Focus

- **Conjunto desalineado**: el ruedo de la camiseta tiene que tapar la cintura del short y las medias quedar centradas bajo cada pierna; lo cubre `alignment.test.ts`.
- **Mangas que "flotan" o se cortan** contra el torso al girar 360°: la raíz de la manga tiene que quedar dentro del torso; test de que el aro de unión de la manga cae dentro del contorno del torso a esa altura.
- **Caras invertidas / negro al girar**: normales hacia afuera en todas las piezas; test de normales por pieza.
- **NaN en la geometría** (loft con secciones degeneradas en el cuello V o el entrepierna): test sin NaN en cada builder.
- **Tela que se ve plástico**: no lo prueba un test; lo juzga el usuario en el punto de control con las capturas de la Tarea 7.

---

### Task 1: Dependencias, rama, vitest y esqueleto de referencia

**Files:**
- Modify: `package.json` (deps + script `"test": "vitest run"`)
- Create: `src/three/body.ts`
- Test: `src/three/__tests__/body.test.ts`

**Interfaces:**
- Produces: `BODY` (objeto `as const`) con alturas y medias-anchos en metros:
  `floor 0, ankle 0.09, calf 0.33, knee 0.50, crotch 0.80, hip 0.92, waist 1.04, chest 1.30, armpit 1.30, shoulder 1.47, neckBase 1.53`;
  `hipHalfWidth 0.18, hipHalfDepth 0.12, chestHalfWidth 0.20, chestHalfDepth 0.125, shoulderHalfWidth 0.215, neckRadius 0.065, legSpacing 0.095` (centro de cada pierna en `x = ±legSpacing`).

- [ ] **Step 1:** `git switch -c camisetas-3d`; `npm i three @react-three/fiber @react-three/drei` y `npm i -D @types/three vitest`.
- [ ] **Step 2: Test** `body.test.ts`: `BODY` es monótono creciente en `ankle < calf < knee < crotch < hip < waist < chest <= armpit < shoulder < neckBase`, y `legSpacing < hipHalfWidth`.
- [ ] **Step 3:** Correr `npx vitest run` → FAIL (no existe `body.ts`).
- [ ] **Step 4:** Crear `src/three/body.ts` con los valores de arriba.
- [ ] **Step 5:** `npx vitest run` → PASS. Commit `Etapa 3D-1: dependencias y esqueleto de referencia`.

### Task 2: Loft genérico

**Files:**
- Create: `src/three/loft.ts`
- Test: `src/three/__tests__/loft.test.ts`

**Interfaces:**
- Produces:
  - `type Ring = THREE.Vector3[]` (todos los anillos de un loft con la misma cantidad de puntos).
  - `loft(rings: Ring[], opts?: { closed?: boolean; uvScale?: [number, number] }): THREE.BufferGeometry` — une anillos consecutivos en quads; `closed` (default `true`) cierra cada anillo; UV `u` = largo de arco acumulado en el anillo / perímetro, `v` = distancia acumulada entre centros de anillo (en metros × `uvScale`); calcula normales.
  - `superellipse(cx: number, y: number, cz: number, rx: number, rz: number, n: number, segments: number, startAngle?: number): Ring` — punto `0` en `+z` (frente), sentido antihorario visto desde arriba.
  - `outwardNormalRatio(geo: THREE.BufferGeometry, center: (p: THREE.Vector3) => THREE.Vector3): number` — fracción de normales con `dot(normal, p - center(p)) > 0`; helper de tests, exportado.
  - `hasNaN(geo: THREE.BufferGeometry): boolean`.

- [ ] **Step 1: Tests**: un loft de 2 anillos circulares de 16 puntos tiene `17*2` vértices (columna duplicada para la costura de UV), `hasNaN` es `false`, `outwardNormalRatio` con centro en el eje `> 0.98`, y `uv.v` del segundo anillo = distancia entre anillos.
- [ ] **Step 2:** Correr → FAIL.
- [ ] **Step 3:** Implementar. Duplicar la primera columna al final para la costura de UV. Orden de índices tal que las normales salgan hacia afuera con anillos antihorarios y `v` subiendo.
- [ ] **Step 4:** Correr → PASS. Commit.

### Task 3: Camiseta (torso + mangas + cuello polo)

**Files:**
- Create: `src/three/garments/shirt.ts`, `src/three/garments/collar.ts`
- Test: `src/three/__tests__/shirt.test.ts`

**Interfaces:**
- Consumes: `BODY`, `loft`, `superellipse`, `Ring`.
- Produces: `buildShirt(): ShirtParts` con
  `interface ShirtParts { body: BufferGeometry; sleeveL: BufferGeometry; sleeveR: BufferGeometry; collar: BufferGeometry; collarTrim: BufferGeometry; cuffTrimL: BufferGeometry; cuffTrimR: BufferGeometry; hemY: number }`.

Forma (del mockup): corte recto, ruedo en `hemY = BODY.crotch + 0.01` con un poco de vuelo (radio ×1.06 sobre la cadera), cintura apenas marcada, pecho, hombros caídos (el anillo del hombro baja ~0.04 hacia afuera). Agujero del cuello: el anillo superior es el contorno del cuello, más bajo adelante (`V` de ~0.09 de profundidad en `z+`). Mangas: tubos lofteados sobre un eje que sale del hombro a ~28° hacia abajo, largo 0.24, radio 0.075 en la raíz → 0.062 en el puño, la raíz metida 0.02 dentro del torso. Pliegues: desplazamiento a lo largo de la normal con ruido de baja frecuencia (amplitud ≤ 4 mm) más arrugas en abanico en axila y cintura (≤ 6 mm). Ruedo y puño con grosor: un segundo anillo hacia adentro (3 mm) unido al borde.
Cuello polo (`collar.ts`): un perfil de solapa barrido por el borde del cuello: pie de cuello de 0.025 de alto + caída doblada hacia afuera de 0.045, con las dos puntas delanteras terminando en pico a cada lado de la V (ver mockup: solapas apoyadas sobre el pecho). `collarTrim`: tira de 6 mm en el borde exterior de la caída; `cuffTrimL/R`: dos tiras de 5 mm cerca de cada puño (la titular las tiene doradas).

- [ ] **Step 1: Tests**: ninguna parte con `hasNaN`; `outwardNormalRatio(body, eje y) > 0.95`; el bbox del cuerpo en `y` va de `hemY` a `≥ BODY.neckBase - 0.02`; el centro del aro raíz de cada manga cae dentro del contorno del torso a esa altura (distancia al eje menor que el radio del torso ahí); `sleeveL` es el espejo en `x` de `sleeveR` (bbox simétrico ±1 mm); el bbox del cuello no baja de `BODY.chest + 0.08`.
- [ ] **Step 2:** Correr → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Correr → PASS. Commit.

### Task 4: Short, medias y botines

**Files:**
- Create: `src/three/garments/shorts.ts`, `src/three/garments/socks.ts`, `src/three/garments/boots.ts`
- Test: `src/three/__tests__/lower.test.ts`

**Interfaces:**
- Consumes: `BODY`, `loft`, `superellipse`.
- Produces:
  - `buildShorts(): { legL: BufferGeometry; legR: BufferGeometry; waistband: BufferGeometry; stripeL: BufferGeometry; stripeR: BufferGeometry; topY: number; hemY: number }` — `topY = BODY.waist - 0.02`, `hemY = BODY.knee + 0.09`. Cada pierna es un loft de una sección en "D" (media cadera con lado plano en `x = 0`) que pasa a ovalada en el ruedo, centrada en `x = ±legSpacing`; así las dos mitades se tocan en la costura central sin unión topológica. Caída amplia (radio en el ruedo ≈ 0.085). Franja lateral: tira de 18 mm sobre la cara externa de cada pierna, de la cintura al ruedo.
  - `buildSock(side: 'L' | 'R'): { sock: BufferGeometry; cuff: BufferGeometry; topY: number }` — de `BODY.ankle` a `topY = BODY.knee - 0.03`, perfil de pantorrilla (máximo en `BODY.calf`), puño doblado de 0.06 con grosor.
  - `buildBoot(side: 'L' | 'R'): { upper: BufferGeometry; sole: BufferGeometry }` — suela extruida con forma de huella (largo 0.27, punta hacia `+z`), capellada lofteada que cierra en el tobillo; botín de fútbol bajo.

- [ ] **Step 1: Tests**: sin NaN; normales hacia afuera (`> 0.95`) en piernas, medias y capellada; `legR` es espejo de `legL`; el centro de cada media está a `±legSpacing` (±5 mm) en `x`; `buildShorts().hemY - buildSock('L').topY >= 0.08` (se ve la rodilla); el bbox del botín empieza en `y = 0`.
- [ ] **Step 2:** Correr → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Correr → PASS. Commit.

### Task 5: Alineación del conjunto

**Files:**
- Create: `src/three/assembly.ts`
- Test: `src/three/__tests__/alignment.test.ts`

**Interfaces:**
- Consumes: `buildShirt`, `buildShorts`, `buildSock`, `buildBoot`.
- Produces: `buildKitGeometry(): KitGeometry` (todas las piezas ya en su lugar, memoizado) con `interface KitGeometry { shirt: ShirtParts; shorts: ReturnType<typeof buildShorts>; socks: [ReturnType<typeof buildSock>, ReturnType<typeof buildSock>]; boots: [ReturnType<typeof buildBoot>, ReturnType<typeof buildBoot>]; bounds: { shirt: THREE.Box3; full: THREE.Box3 } }`.

- [ ] **Step 1: Tests**: `shirt.hemY < shorts.topY` (la camiseta tapa la cintura, solape ≥ 0.15) y el contorno del ruedo de la camiseta queda por fuera del short a la altura `shirt.hemY` (radio mayor); el short no atraviesa la camiseta por arriba del ruedo; `full` centrado en `x = 0` (±5 mm); medias y botines alineados en `x` con el centro de cada pierna; `bounds.full.min.y === 0`.
- [ ] **Step 2:** Correr → FAIL.
- [ ] **Step 3:** Implementar (reubicar y ajustar radios si un test de solape falla; no mover el `BODY`).
- [ ] **Step 4:** Correr → PASS. Commit.

### Task 6: Material de tela y `KitModel`

**Files:**
- Create: `src/three/fabric.ts`, `src/three/KitModel.tsx`, `src/three/kitColors.ts`

**Interfaces:**
- Consumes: `buildKitGeometry`, `KitId` de `src/data/kits.ts`.
- Produces:
  - `createFabricNormalMap(size?: number): THREE.CanvasTexture` — trama de punto (piqué) generada en canvas, `RepeatWrapping`, con repetición de ~1 celda cada 2 mm según la escala de UV en metros.
  - `fabricMaterial(color: string, opts?: { sheenColor?: string }): THREE.MeshPhysicalMaterial` — `roughness 0.82`, `sheen 0.6`, `sheenRoughness 0.5`, `normalScale 0.35`, `side: DoubleSide` solo en cuello y ruedos.
  - `KIT_COLORS: Record<KitId, { fabric: string; trim: string; trim2?: string; shorts: string; shortsStripe: string; socks: string; boots: string; sole: string }>`.
  - `<KitModel kit: KitId; view: 'shirt' | 'full' />` — monta las piezas; en `'shirt'` oculta short, medias y botines.

- [ ] **Step 1:** Implementar los tres archivos. `npx tsc -b` sin errores; `npx vitest run` sigue en verde.
- [ ] **Step 2:** Commit.

### Task 7: Página de punto de control + capturas

**Files:**
- Create: `preview-3d.html` (raíz, Vite la sirve en dev; no está en `build.rollupOptions.input`), `src/preview/main.tsx`, `scripts/snap-preview.mjs`

**Interfaces:**
- Consumes: `KitModel`, `KIT_COLORS`.
- Produces: página en `http://localhost:5173/preview-3d.html` y capturas en `docs/superpowers/checkpoints/etapa-1/{kit}-{view}-{angulo}.png`.

Página: a la izquierda el canvas (fondo con el color del kit como el sitio, `OrbitControls` con giro libre, zoom permitido solo acá para inspeccionar), sombras de contacto, iluminación de estudio con `Environment` + `Lightformer`; a la derecha `public/assets/source/camiseta-mockup.jpg`. Botones: Titular / Suplente, Camiseta / Conjunto, ángulos fijos 0°/45°/90°/180°. Query string `?kit=verde&view=full&angle=45` fija el estado (lo usa el script).

- [ ] **Step 1:** Implementar la página. Abrirla en el dev server ya levantado; consola sin errores.
- [ ] **Step 2:** `scripts/snap-preview.mjs`: Playwright (chromium, 1400×1000, `deviceScaleFactor 2`) recorre `kit × view × angle (0, 45, 90, 180)` y guarda los PNG. Correr `node scripts/snap-preview.mjs` → 16 archivos.
- [ ] **Step 3:** Revisar las capturas contra el mockup (cuello polo, caída de la tela, proporciones, alineación del conjunto). Corregir geometría y repetir hasta que se lean como tela y como la misma prenda.
- [ ] **Step 4:** `npm run build` sigue pasando y `dist/` no contiene `preview-3d.html`. Commit.
- [ ] **Step 5: Punto de control.** Mostrar al usuario la página y las capturas. **No empezar la etapa 2 sin su aprobación.**
