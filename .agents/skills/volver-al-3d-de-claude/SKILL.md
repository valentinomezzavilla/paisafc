---
name: volver-al-3d-de-claude
description: >-
  Use this skill when the user wants to switch the Paisa FC kit presentation between versions: back to
  Claude's three.js 3D viewer ("volver a como estaba", "el 3D de antes"), to Claude's Blender photo
  turntable ("la de Blender"), or away from Antigravity's version ("no me gusta lo de Antigravity").
---

# Cambiar entre versiones de la camiseta

Hay tres versiones. Antes de tocar nada, preguntale al usuario cuál quiere.

| Versión | Componentes | Assets | Marca en `src/App.tsx` |
| --- | --- | --- | --- |
| Visor 3D de three.js (Claude, procedural) | `src/components/kits/KitSection.tsx`, `KitsTogether.tsx`, `viewer/`, `src/three/` | `public/assets/kits/3d/` | `[CLAUDE-3D]` |
| Fotos de Blender (Claude, **la actual**) | `src/components/kits/blender/` | `public/assets/kits/blender/`, scripts en `scripts/blender/` | `[BLENDER]` |
| Antigravity | `src/components/kits/real/` | `public/assets/kits/real/` | `[ANTIGRAVITY]`, si la enchufó |

## Cambiar de versión

1. En `src/App.tsx`, comentá las dos imports (`KitSection` y `KitsTogether`) de la versión que está activa y descomentá las de la que se quiere. **No borres ninguna.**
2. Verificá: `npx tsc -b`, `npm run lint`, `npm test` y `npm run build`. Hacé una captura con `node scripts/shoot.mjs version "#camisetas"` (con `npm run dev` corriendo).

## Restaurar el respaldo (exactamente como estaba antes de todo esto)

La rama `respaldo/camisetas-3d-claude` tiene una foto completa del árbol de trabajo, del momento anterior a que Antigravity o Blender tocaran nada.

1. Antes de restaurar, guardá el trabajo actual en una rama (`git switch -c camisetas-alternativas` y commit, **con permiso del usuario**).
2. Restaurá: `git restore --source respaldo/camisetas-3d-claude -- src scripts public/assets/kits/3d preview-3d.html`.
3. Verificá igual que en el punto 2 de arriba.

Nunca borres la rama `respaldo/camisetas-3d-claude`.
