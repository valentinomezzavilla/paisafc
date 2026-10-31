# Diseño de las equipaciones (fuente: public/assets/source/camiseta-mockup.jpg)

Si algo de acá no coincide con el mockup, manda el mockup. Si el mockup es ambiguo, como el lado exacto de un parche de manga, preguntale al usuario y no inventes.

## Paleta

Los colores del sitio están en `src/styles/palette.css`: `--color-forest`, `--color-forest-deep`, `--color-cream`, `--color-cream-shade` y `--color-gold`. Las prendas tienen que coincidir con ellos y con el mockup.

## Verde bosque (titular)

- **Cuerpo:** verde bosque oscuro con **curvas de nivel** topográficas tono sobre tono en toda la tela, sutiles, como un mapa.
- **Cuello:** polo con solapa en V y ribete dorado.
- **Puños:** verdes con franjas doradas.
- **Escudo:** pecho izquierdo del jugador, del lado del corazón.
- **VEZZA (frente):** logo `⟨/⟩` arriba de la palabra **VEZZA**, en dorado, centrado en el pecho. Va **grande**: cerca del 48 % del ancho del torso.
- **Parche de manga:** círculo con la "R" y el rayo.
- **Espalda:**
  - **MEZZAVILLA** en dorado, en arco suave, cerca del 83 % del ancho de la espalda.
  - **11** grande en dorado con contorno, de unos 23 cm de alto.
  - **Tom's Burger** abajo, en letra script retro.
- **Short:** verde, con franja lateral dorada y el escudo abajo en la pierna derecha.
- **Medias:** verdes, con puño.
- **Botines:** verdes.

## Crema (suplente)

- **Cuerpo:** crema con **jacquard de rombos tono sobre tono** (no curvas de nivel). Decisión del usuario.
- **Cuello:** polo con solapa en V y ribete verde y dorado.
- **Puños:** franjas verde y dorada.
- **Escudo:** pecho izquierdo.
- **VEZZA:** igual que en la verde, pero en verde.
- **Espalda:** MEZZAVILLA, 11 (con contorno) y Tom's Burger, todo en verde.
- **Short:** verde con franja lateral crema.
- **Medias:** crema.
- **Botines:** blancos o crema, con suela verde.

## Arte

- **Escudo:** `public/assets/source/escudo.jpeg` es raster, con fondo blanco. Recortalo limpio o, mejor, redibujalo en vectorial manteniendo el detalle. En la tela va como parche bordado o sublimado.
- **VEZZA, Tom's Burger y el parche:** solo existen en el mockup. Redibujalos en vectorial. No los generes con IA.
- **Referencia de Claude:** `src/three/design/draw.ts` y `src/three/design/topoTexture.ts` ya dibujan estos elementos en canvas. Sirven de punto de partida (leer y reusar, no modificar).
- **Tamaños medidos sobre el mockup:** están en `DECALS` dentro de `src/three/anchors.ts`. El usuario pidió que los sponsors sean grandes, no los achiques.
