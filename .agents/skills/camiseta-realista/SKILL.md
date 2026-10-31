---
name: camiseta-realista
description: >-
  Use this skill when working on the Paisa FC kit presentation: replacing Claude's procedural 3D shirt
  with a photorealistic one built from public/assets/source/camiseta-mockup.jpg, generating textures,
  models, renders or posters for the kits, or wiring the new viewer into #camisetas and "Las dos juntas".
---

# Camiseta realista de Paisa FC

## Qué quiere el usuario

Una presentación de las dos equipaciones que se vea **REAL**, como fotografía de producto de una marca deportiva grande. Tiene que ser espectacular.

Cuando dice "no quiero que sea animado, de dibujo" habla del **look de caricatura**, no del movimiento: está bien que gire con el mouse. Lo que no puede pasar:

- Sombreado plano, colores lisos sin tela o bordes de dibujo.
- Formas de "tubo" o de maniquí de plástico. Esa es justamente la falla del modelo procedural de Claude.
- Logos o textos deformados, inventados o borrosos.

El diseño exacto está en [references/diseno.md](references/diseno.md). Leelo entero antes de producir cualquier imagen o textura.

## Vara de calidad: "real" significa

1. **Tela de verdad:** caída con peso, pliegues de simulación de tela (axilas, cintura y hombros) y costuras visibles.
2. **Tejido a escala:** el punto de la tela se ve como micro-relieve (normal map) y responde a la luz con sheen. No es una imagen pegada encima.
3. **Estampado que sigue la tela:** sponsors, nombre y número se doblan con los pliegues y tienen un leve relieve y brillo de vinilo o sublimado.
4. **Luz de estudio:** HDRI de estudio (Poly Haven, CC0), luz principal suave y de relleno, sombra de contacto suave, tone mapping AgX o ACES y nada de negros puros.
5. **Fiel al mockup:** las capturas, comparadas lado a lado con `camiseta-mockup.jpg`, tienen que mostrar la misma prenda.

## Camino (decidilo con el usuario en el paso 2)

**A. Modelo 3D realista en tiempo real (preferido).**
- Partí de una malla de camiseta de fútbol con pliegues de simulación de tela. Puede ser un modelo con licencia que permita uso comercial en web (CC0 o CC-BY con crédito) o una simulación propia en Blender.
- La camiseta tiene cuello polo con solapa en V. Si la base no lo tiene, adaptala.
- Hacé UV limpias y texturas PBR de 2048 a 4096 px: color, normal (tejido + pliegues), roughness y AO.
- En three.js usá `MeshPhysicalMaterial` con `sheen` y `Environment` de drei con el HDRI. Comprimí con meshopt o Draco y KTX2.
- Una camiseta tiene que pesar menos de 3 MB y cargarse en diferido.

**B. Turntable pre-renderizado (si A no llega a fotorrealista).**
- Renderizá en Blender Cycles una vuelta de 48 a 72 cuadros por kit y por vista (camiseta / conjunto).
- En el sitio se gira arrastrando entre cuadros (AVIF o WebP, carga progresiva).
- Se ve 100 % foto, pero pesa más.

**Generación de imágenes con IA:** solo sirve para referencias de iluminación o fondos. **Nunca** para logos, textos o números, que salen deformados. Esos siempre se dibujan en vectorial.

Blender **no está instalado** en esta máquina. Si lo necesitás, pedile permiso al usuario antes de instalarlo (`winget install BlenderFoundation.Blender`).

## Pasos

1. Leé `AGENTS.md` y [references/diseno.md](references/diseno.md). Mirá `camiseta-mockup.jpg` y `escudo.jpeg` en resolución completa.
2. **Mostrale al usuario el plan:** qué camino (A o B), de dónde sale la malla base (con su licencia) y cuánto va a pesar. Esperá su OK.
3. **Arte vectorial primero:** escudo, VEZZA, MEZZAVILLA, 11, Tom's Burger, el parche "R" con el rayo, curvas de nivel y rombos. Guardalos en `public/assets/kits/real/art/`. Podés leer y reusar `src/three/design/draw.ts` y `topoTexture.ts` de Claude (importalos o copialos, sin modificarlos).
4. **Una muestra antes del resto:** la camiseta verde de frente, en una página de prueba aparte (por ejemplo `preview-real.html`). Mostrásela al usuario y no sigas sin su visto bueno.
5. Completá las dos camisetas y las dos vistas: `shirt` (sola) y `full` (con short, medias y botines).
6. Enchufalo en el sitio, en archivos nuevos dentro de `src/components/kits/real/`, siguiendo [references/integracion.md](references/integracion.md).
7. Generá los pósters estáticos nuevos en `public/assets/kits/real/posters/` y apuntá `KitPoster` a ellos. Comentá la ruta vieja con `[CLAUDE-3D]`.
8. Verificá con todo lo que pide `AGENTS.md` (tsc, lint, test, build, capturas y Lighthouse). Después mostrale al usuario las capturas de mobile y desktop junto al mockup.

## Cómo saber que quedó bien

- Las capturas de `node scripts/shoot.mjs real "#camisetas"` y el mockup, puestos lado a lado, se leen como la misma camiseta fotografiada.
- Todos los textos se leen nítidos al 100 % de zoom en desktop.
- Ningún archivo de Claude fue borrado: `git status` no muestra ninguna `D` en `src/three/` ni en `src/components/kits/viewer/`.
