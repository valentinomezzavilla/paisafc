# Cómo enchufar la presentación nueva en el sitio

## Lo que se queda en el sitio

`src/components/kits/KitSection.tsx` (sección `#camisetas`) ya tiene, y siguen andando:

- el fondo por kit, con el barrido circular al cambiar (`KitBackdrop`);
- el alternador de kit Verde / Crema (`KitSwitcher`) y el de vista Camiseta / Conjunto (`ViewToggle`);
- el póster estático (`KitPoster`), que se ve mientras carga y si no hay WebGL;
- las tarjetas de detalle (`HotspotCard`), con los textos de `src/data/kits.ts`.

El visor de Claude está comentado con `[CLAUDE-3D]`. El hueco para el tuyo está marcado con `[ANTIGRAVITY]`.

## Contrato que conviene respetar

Tu visor, en un archivo nuevo como `src/components/kits/real/RealKitViewer.tsx`, debería aceptar las mismas props que el de Claude (`KitViewerProps` en `src/components/kits/viewer/KitViewer.tsx`):

| Prop | Tipo | Para qué |
| --- | --- | --- |
| `kit` | `'verde' \| 'crema'` | Qué camiseta mostrar. |
| `view` | `'shirt' \| 'full'` | Camiseta sola o conjunto completo. |
| `onReady()` | callback | Ya se dibujó: KitSection oculta el póster. |
| `onError()` | callback | Falló la carga: queda el póster. |
| `onInteract()` | callback | El usuario giró: se apaga la pista "arrastrá". |
| `hotspots`, `activeHotspot`, `onHotspot` | opcionales | Puntos tocables sobre la prenda. Si los soportás, que se vean finos y discretos. |

Montalo con `React.lazy` + `Suspense` + `ViewerBoundary`, tal como estaba el de Claude (está comentado en `KitSection.tsx` como modelo). Cuando lo enchufes:

- descomentá o recreá el estado que necesites (`setViewerReady`, `setViewerFailed`, `setHint`, `useCallback`);
- marcá cada línea nueva o cambiada con `[ANTIGRAVITY]`;
- no borres los bloques `[CLAUDE-3D]`.

## "Las dos juntas"

`src/components/kits/KitsTogether.tsx` es el cierre: titular y suplente lado a lado, cada una sobre su color. Antes giraban de costado hacia el centro con el scroll (`progress`, un ref de 0 a 1 animado con GSAP ScrollTrigger). Hacé lo mismo con la presentación nueva en el hueco `[ANTIGRAVITY]`. Si podés, usá un solo canvas para las dos.

## Pósters

`src/components/kits/KitPoster.tsx` arma la ruta `assets/kits/3d/posters/<kit>-<view>[-640].webp` (900×1000 para la camiseta, 560×1000 para el conjunto).

- Generá los nuevos en `public/assets/kits/real/posters/` con los mismos nombres y medidas.
- En `KitPoster.tsx`, cambiá la ruta comentando la vieja con `[CLAUDE-3D]`.
- No pises los pósters viejos.
