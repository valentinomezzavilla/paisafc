# Camisetas en 3D — diseño

Fecha: 2026-10-29 · Sitio: Paisa FC (Vite + React 19 + TS + Tailwind v4 + GSAP + Lenis, prerender SSR)

## Por qué

Hoy la sección de camisetas usa fotos planas recortadas de un mockup (`public/assets/source/camiseta-mockup.jpg`),
con un giro falso en CSS y una historia fija de 5 pantallas atada al scroll. El usuario la encuentra plana,
rígida, y el "kit completo" queda mal: short y medias son recortes de otra escala apilados con porcentajes
fijos (`top-[99%]`, `top-[153%]`, `FULL_KIT_SCALE`), y no parecen un conjunto.

Lo que quiere: **la camiseta como objeto 3D real que agarra y gira con el mouse/dedo, y toca los detalles**,
como el visor de producto de la tienda de un club grande. Pidió explícitamente que esté hecho "al 100%".

## Objetivos

1. **Modelo 3D propio** de camiseta, short y medias (con botines), modelado por nosotros en código. Sin
   modelos de terceros (el usuario eligió esto frente a comprar uno o usar uno CC BY).
2. **Diseño vectorizado**: todo lo gráfico de la prenda rehecho en vector y aplicado como textura sobre
   la tela, nítido a cualquier tamaño. Dos kits: titular verde bosque y suplente crema (ver el mockup).
3. **Visor libre**: girar 360° arrastrando, con inercia; tocar detalles anclados a la tela.
4. **Conjunto completo como "maniquí invisible"**: camiseta, short, medias y botines dispuestos como si
   los tuviera puestos una persona invisible. Una sola escala, alineación anatómica.
5. Reemplazar las dos vistas actuales que muestran el conjunto: el paso "kit completo" de `KitSection`
   y la sección `KitsTogether` (titular y suplente lado a lado).

## No-objetivos

- No hay jugadores, cuerpos ni caras (el usuario sacó el plantel; ver memoria del proyecto).
- No es un configurador (no se cambian colores ni nombres desde la web).
- No se toca hero, escudo, sponsors ni contacto, salvo lo necesario para integrar.

## Anti-objetivos (sería un fracaso aunque funcione)

- **"Muñeco de plástico"**: prenda rígida, brillante, sin caída de tela ni costuras. Tiene que leerse
  como tela: material mate con *sheen*, trama fina, pliegues suaves en axilas/cintura/codo, costuras,
  dobladillos con grosor.
- **Logos borrosos o pixelados** al acercar la cámara.
- **Piezas del conjunto que flotan desalineadas** o a escalas distintas entre sí.
- **Secuestro del scroll**: la sección no puede atrapar la rueda ni el gesto vertical en el celu.
- **Primera pantalla lenta**: el 3D no puede bloquear el primer render ni la hidratación.

## Lo que decidió el usuario

- Visor 3D real, giro libre con mouse/dedo, detalles tocables.
- Modelado propio en código (no comprar ni bajar modelo).
- Conjunto como maniquí invisible.
- Que el diseño se vectorice.

- **Punto de control con el usuario**: después de modelar la geometría (camiseta, short, medias y botines,
  sin logos, con material de tela base), mostrarle renders desde varios ángulos al lado del mockup, en
  vista "Camiseta" y en "Conjunto". Nada de UV definitivas, texturas, hotspots ni visor hasta que el
  usuario lo apruebe.

## Decisiones tomadas por mí (el usuario puede objetarlas)

### Tecnología
- **three + @react-three/fiber + @react-three/drei**, cargado en un chunk aparte (dynamic `import()`),
  montado solo en el cliente cuando el navegador queda libre (`useIdleReady`) y la sección está cerca
  del viewport. El HTML prerenderizado muestra un **póster estático** (render del modelo) en el lugar
  del canvas, así el SSR no cambia y no hay riesgo de hidratación.
- **El modelo se genera offline** con un script (`scripts/build-kit-model.*`) que escribe un `.glb` en
  `public/assets/kits/3d/`. El runtime solo lo carga. Así se puede inspeccionar, se mantiene liviano y
  las normales/UV quedan cocinadas.

### Modelo
- **Camiseta** con la silueta del mockup: torso de corte recto con hombros caídos suaves, mangas cortas
  en ángulo hacia abajo (~25–30° del torso), **cuello polo retro con solapas y abertura en V** (ver
  mockup: es lo más característico de la prenda, tiene que estar bien), ribetes en cuello y puños,
  dobladillo con grosor. La tela tiene espesor visible en los bordes (cuello, mangas, ruedo).
- **Short**: cintura con elástico, dos piernas con caída, franja lateral (dorada en la titular;
  crema + dorada en la suplente), escudo chico abajo a la izquierda (ver mockup).
- **Medias**: forma de pantorrilla, puño doblado arriba. **Botines** simplificados pero creíbles (verde
  en la titular, blancos en la suplente, como en el mockup).
- **Maniquí invisible**: las cuatro piezas se modelan sobre un mismo esqueleto de referencia (proporciones
  de un adulto: hombros, cintura, cadera, rodilla, tobillo). La camiseta cubre la cintura del short como
  en el mockup; entre short y medias queda la rodilla "vacía". Una sola escala para todo.
- **UV pensadas para el diseño**: islas separadas para frente, espalda, cada manga, cuello y puños, sin
  distorsión en las zonas con logo (pecho, espalda), para que los vectores caigan derechos.
- **Realismo de tela**: normal map de trama fina + pliegues suaves (generados), `MeshPhysicalMaterial`
  con `sheen`, rugosidad alta, sombras de contacto suaves en el piso, iluminación de estudio (HDRI
  neutro chico o luces armadas, sin texturas pesadas).

### Diseño vectorizado
- Un SVG por isla de UV y por kit, armado desde datos (colores del kit), rasterizado a `CanvasTexture`
  en el cliente a resolución alta (2048, 4096 en pantallas densas si el GPU lo permite). Es vector en el
  origen y se re-rasteriza sin pérdida.
- Elementos: logo VEZZA (‹/› + palabra), parche circular "R" con rayo en la manga derecha, puños con
  franjas, cuello con ribete, **MEZZAVILLA** y **11** con contorno en la espalda, **Tom's Burger** en
  script retro, textura de curvas de nivel en toda la tela (marcada en la titular, apenas sugerida en la
  suplente). Partir de lo que ya existe: `src/components/sponsors/marks.tsx` (VEZZA, parche, Tom's Burger
  recreados) y `public/assets/topo-*.svg`.
- **Escudo**: es una ilustración con detalle (paisano, mate, cinta); se usa la imagen existente
  `public/assets/escudo/escudo.png` (789×894) dentro del SVG, no se calca a vector. Ocupa ~6 cm en el
  pecho, la resolución alcanza.
- Tipografías: las del sitio (Big Shoulders Display para nombre y número, Instrument Sans para VEZZA);
  esperar a `document.fonts.ready` antes de rasterizar.

### Navegación del visor (sección `#camisetas`)
- **Sin pin ni historia de scroll.** La sección mide ~1 pantalla y se scrollea normal.
- **Giro horizontal libre 360°** con inercia; vertical limitado (±15°). Al soltar, se queda donde quedó
  (no vuelve sola). Sin zoom con la rueda (no secuestra el scroll). En touch: `touch-action: pan-y`, el
  arrastre horizontal gira y el vertical scrollea la página.
- **Pista inicial**: al entrar en pantalla la camiseta hace medio giro lento de presentación una sola vez
  y aparece el texto "Arrastrá para girarla"; se apaga con la primera interacción.
- **Detalles (hotspots)**: puntos anclados a la tela, definidos en coordenadas UV de la isla
  correspondiente (así quedan pegados al diseño). Se ocultan cuando quedan del lado de atrás. Al tocar
  uno, la cámara se acerca y gira el modelo para mostrar ese detalle de frente, y aparece la tarjeta
  (mismo estilo que `HotspotCard`). Tocar afuera, `Esc` o el botón de cerrar vuelve a la vista anterior.
  Mismos textos que hoy (`frontHotspots` / `backHotspots` en `src/data/kits.ts`), más uno para el short
  en el escudo chico: "Escudo en el short — Abajo a la izquierda, junto a la franja lateral." (texto mío,
  editable en `kits.ts`).
- **Dos vistas**: "Camiseta" (encuadre cercano) y "Conjunto" (cámara se aleja, entran short, medias y
  botines a su lugar). Reemplaza al `StepNav` actual. Los hotspots funcionan en las dos.
- **Cambio de kit**: se mantiene el `KitSwitcher` y el wipe radial del fondo; el modelo hace un giro
  rápido y cambia de textura en el giro. Se conserva la rotación actual.
- **Teclado/accesibilidad**: flechas giran el modelo cuando el canvas tiene foco; los hotspots son
  botones reales del DOM (`Html` de drei) con `aria-expanded`; lista de detalles en `sr-only`; anuncio
  `aria-live` del kit y la vista.

### "Las dos juntas" (`KitsTogether`)
- Mismo modelo de conjunto, titular y suplente lado a lado, cada una sobre su mitad de color como hoy.
- Un solo `<Canvas>` para las dos (una sola instancia de WebGL), con el scroll girándolas apenas hacia
  el centro al entrar. Mismo póster estático en el prerender.

### Rendimiento y fallback
- Sin WebGL o con error de carga: se queda el póster estático y los detalles se muestran como lista.
- `prefers-reduced-motion`: sin giro de presentación, sin inercia, transiciones de cámara cortas.
- `dpr` limitado a 2; el render se detiene cuando la sección no está en pantalla (`frameloop="demand"`
  o pausa por IntersectionObserver).
- Peso objetivo: modelo `.glb` < 400 KB (Draco o meshopt si hace falta), sin texturas bitmap grandes
  aparte del escudo.
- Pósters: renders del modelo final generados por script (Playwright ya está en devDependencies) y
  guardados como webp.

## Criterios de éxito

- Al lado del mockup, se reconoce la misma camiseta, con el mismo cuello, logos, número y colores.
- Girando en desktop se ve tela, no plástico; los logos se leen nítidos al acercarse a un detalle.
- El conjunto en maniquí invisible se ve proporcionado y alineado desde cualquier ángulo.
- 60 fps en desktop, fluido en un celular de gama media; la sección no traba el scroll.
- Lighthouse no empeora de forma notable respecto de hoy (desktop ~98; mobile local ~70-75 por el
  entorno, ver memoria del proyecto).

## Queda en manos del constructor

- La técnica concreta de modelado (geometría paramétrica, extrusiones, subdivisión, deformadores) y el
  lenguaje del script generador, siempre que el resultado salga como `.glb` reproducible.
- Cómo generar el normal map de tela y pliegues.
- Iluminación exacta, ángulos de cámara, curvas de animación.
- Qué hacer con las fotos planas viejas en `public/assets/kits/` (si nada las usa, borrarlas; la
  `og-image` se queda).
- Si `drei` no aporta lo suficiente, usar three a secas.

## Fuera de alcance pero visto

- El servidor de desarrollo reporta un error de hidratación previo en `<App>` (`<div className="grain">`).
  No lo causa este trabajo; anotarlo y no mezclarlo.
