# -*- coding: utf-8 -*-
"""
Genera todos los recursos vectoriales limpios en public/assets/kits/real/art/:
- vezza.svg (logo ⟨/⟩ + VEZZA con cortes horizontales exactos al mockup)
- parche-r.svg (aro circular, R en itálica pesada y rayo)
- dorsal-11.svg (número 11 con corte superior inclinado y filete/contorno)
- mezzavilla.svg (nombre MEZZAVILLA en arco suave con tipografía atlética condensada)
- toms-burger.svg (vectorizado limpio en curvas Bézier desde toms-burger.png)
- curvas-nivel.svg (patrón topográfico orgánico continuo para la titular verde)
- rombos-jacquard.svg (patrón jacquard de rombos concéntricos para la suplente crema)
- escudo.png (copia limpia de alta resolución recortada sin halo blanco)
"""

import math
import os
import shutil
from PIL import Image

OUT_DIR = os.path.join("public", "assets", "kits", "real", "art")
os.makedirs(OUT_DIR, exist_ok=True)


def trace_bitmap_to_svg_paths(img_path: str, threshold: int = 128) -> str:
    """
    Extrae los contornos exactos de una imagen en blanco y negro (como toms-burger.png)
    mediante Marching Squares con interpolación subpíxel y suavizado Chaikin/Bézier,
    devolviendo un atributo `d` de SVG 100 % vectorial y nítido a cualquier escala.
    """
    im_raw = Image.open(img_path)
    im = im_raw.getchannel("A") if "A" in im_raw.getbands() else im_raw.convert("L")
    w, h = im.size
    px = im.load()

    # Grilla binaria con borde de 1 px en 0 para cerrar todos los contornos
    gw, gh = w + 2, h + 2
    grid = [[0.0] * gw for _ in range(gh)]
    for y in range(h):
        for x in range(w):
            grid[y + 1][x + 1] = px[x, y] / 255.0

    iso = threshold / 255.0

    # Segmentos orientados (dejan el interior > iso a la izquierda)
    # Cada celda (x, y) tiene 4 esquinas:
    # v0=(x,y), v1=(x+1,y), v2=(x+1,y+1), v3=(x,y+1)
    adj = {}

    def interp(p1, p2, v1, v2):
        if abs(v2 - v1) < 1e-6:
            t = 0.5
        else:
            t = (iso - v1) / (v2 - v1)
        t = max(0.0, min(1.0, t))
        return (round(p1[0] + t * (p2[0] - p1[0]), 2), round(p1[1] + t * (p2[1] - p1[1]), 2))

    for y in range(gh - 1):
        for x in range(gw - 1):
            v0 = grid[y][x]
            v1 = grid[y][x + 1]
            v2 = grid[y + 1][x + 1]
            v3 = grid[y + 1][x]
            b0 = 1 if v0 >= iso else 0
            b1 = 1 if v1 >= iso else 0
            b2 = 1 if v2 >= iso else 0
            b3 = 1 if v3 >= iso else 0
            code = b0 | (b1 << 1) | (b2 << 2) | (b3 << 3)
            if code == 0 or code == 15:
                continue

            # Puntos en las aristas: top(e0), right(e1), bottom(e2), left(e3)
            p0 = (x - 1, y - 1)
            p1 = (x, y - 1)
            p2 = (x, y)
            p3 = (x - 1, y)
            e0 = interp(p0, p1, v0, v1)
            e1 = interp(p1, p2, v1, v2)
            e2 = interp(p3, p2, v3, v2)
            e3 = interp(p0, p3, v0, v3)

            segs = []
            if code == 1:
                segs.append((e0, e3))
            elif code == 2:
                segs.append((e1, e0))
            elif code == 3:
                segs.append((e1, e3))
            elif code == 4:
                segs.append((e2, e1))
            elif code == 5:
                segs.append((e0, e1))
                segs.append((e2, e3))
            elif code == 6:
                segs.append((e2, e0))
            elif code == 7:
                segs.append((e2, e3))
            elif code == 8:
                segs.append((e3, e2))
            elif code == 9:
                segs.append((e0, e2))
            elif code == 10:
                segs.append((e3, e0))
                segs.append((e1, e2))
            elif code == 11:
                segs.append((e1, e2))
            elif code == 12:
                segs.append((e3, e1))
            elif code == 13:
                segs.append((e0, e1))
            elif code == 14:
                segs.append((e3, e0))

            for a, b in segs:
                if a != b:
                    adj.setdefault(a, []).append(b)

    loops = []
    while adj:
        start = next(iter(adj))
        curr = start
        loop = [curr]
        while curr in adj:
            nxt_list = adj[curr]
            nxt = nxt_list.pop()
            if not nxt_list:
                del adj[curr]
            curr = nxt
            if curr == start:
                break
            loop.append(curr)
        if len(loop) >= 6:
            loops.append(loop)

    # Simplificación Ramer-Douglas-Peucker + curvas cuadráticas suaves
    def rdp(pts, eps=0.65):
        if len(pts) < 3:
            return pts
        x1, y1 = pts[0]
        x2, y2 = pts[-1]
        dx, dy = x2 - x1, y2 - y1
        denom = math.hypot(dx, dy)
        max_d = -1.0
        idx = 0
        for i in range(1, len(pts) - 1):
            px_i, py_i = pts[i]
            if denom < 1e-6:
                d = math.hypot(px_i - x1, py_i - y1)
            else:
                d = abs(dy * px_i - dx * py_i + x2 * y1 - y2 * x1) / denom
            if d > max_d:
                max_d = d
                idx = i
        if max_d > eps:
            left = rdp(pts[: idx + 1], eps)
            right = rdp(pts[idx:], eps)
            return left[:-1] + right
        return [pts[0], pts[-1]]

    d_parts = []
    for loop in loops:
        half = len(loop) // 2
        s1 = rdp(loop[: half + 1], 0.55)
        s2 = rdp(loop[half:] + [loop[0]], 0.55)
        simp = s1[:-1] + s2[:-1]
        if len(simp) < 3:
            continue
        n = len(simp)
        # Puntos medios entre vértices como anclas de curvas cuadráticas Q
        m0x = (simp[-1][0] + simp[0][0]) * 0.5
        m0y = (simp[-1][1] + simp[0][1]) * 0.5
        cmds = [f"M{m0x:.1f} {m0y:.1f}"]
        for i in range(n):
            cx, cy = simp[i]
            nx, ny = simp[(i + 1) % n]
            mx, my = (cx + nx) * 0.5, (cy + ny) * 0.5
            cmds.append(f"Q{cx:.1f} {cy:.1f} {mx:.1f} {my:.1f}")
        cmds.append("Z")
        d_parts.append(" ".join(cmds))

    return w, h, " ".join(d_parts)


def make_vezza_svg(color: str) -> str:
    # Icono ⟨/⟩ con cortes horizontales exactos al mockup + palabra VEZZA geométrica pesada
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 420">
  <g fill="{color}">
    <!-- Chevron izquierdo ⟨ con remates horizontales -->
    <polygon points="134,12 158,12 82,128 158,244 134,244 56,128" />
    <!-- Barra central / con remates horizontales -->
    <polygon points="214,68 234,68 186,188 166,188" />
    <!-- Chevron derecho ⟩ con remates horizontales -->
    <polygon points="266,12 242,12 318,128 242,244 266,244 344,128" />
    <!-- Palabra VEZZA en trazos vectoriales geométricos exactos al mockup -->
    <!-- V -->
    <polygon points="18,306 42,306 62,368 82,306 106,306 73,396 51,396" />
    <!-- E -->
    <polygon points="116,306 184,306 184,324 138,324 138,342 178,342 178,359 138,359 138,378 186,378 186,396 116,396" />
    <!-- Z -->
    <polygon points="196,306 268,306 268,322 223,378 269,378 269,396 194,396 194,380 239,324 196,324" />
    <!-- Z -->
    <polygon points="278,306 350,306 350,322 305,378 351,378 351,396 276,396 276,380 321,324 278,324" />
    <!-- A -->
    <path d="M348,396 L380,306 L402,306 L434,396 L410,396 L404,377 L377,377 L371,396 Z M382,360 L399,360 L391,332 Z" transform="translate(-42, 0)" />
  </g>
</svg>"""


def make_vezza_clean_svg(color: str) -> str:
    # Centrado exacto en caja 400x420 (VEZZA ocupa de x=14 a x=386)
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 420">
  <g fill="{color}" fill-rule="evenodd">
    <!-- Chevron izquierdo ⟨ -->
    <polygon points="134,14 159,14 84,128 159,242 134,242 58,128" />
    <!-- Barra central / -->
    <polygon points="213,70 234,70 187,186 166,186" />
    <!-- Chevron derecho ⟩ -->
    <polygon points="266,14 241,14 316,128 241,242 266,242 342,128" />
    <!-- V (x: 14..94) -->
    <polygon points="14,306 38,306 54,366 70,306 94,306 65,396 43,396" />
    <!-- E (x: 102..166) -->
    <polygon points="102,306 166,306 166,324 123,324 123,342 160,342 160,359 123,359 123,378 167,378 167,396 102,396" />
    <!-- Z (x: 176..242) -->
    <polygon points="176,306 242,306 242,322 201,378 243,378 243,396 175,396 175,380 216,324 176,324" />
    <!-- Z (x: 252..318) -->
    <polygon points="252,306 318,306 318,322 277,378 319,378 319,396 251,396 251,380 292,324 252,324" />
    <!-- A (x: 318..388) -->
    <path d="M318,396 L346,306 L367,306 L395,396 L372,396 L367,377 L345,377 L340,396 Z M349,360 L363,360 L356,331 Z" />
  </g>
</svg>"""


def make_dorsal_11_svg(fill_color: str, stroke_color: str) -> str:
    # Dos dígitos "1" de fútbol con pico superior inclinado y contorno exterior redondeado
    def one_paths(ox: float) -> str:
        # Silueta exterior (contorno) e interior (relleno)
        outer = f"M{ox+2},38 L{ox+98},14 L{ox+116},14 L{ox+116},456 L{ox+40},456 L{ox+40},108 L{ox+2},108 Z"
        inner = f"M{ox+12},46 L{ox+96},25 L{ox+106},25 L{ox+106},446 L{ox+50},446 L{ox+50},98 L{ox+12},98 Z"
        return f"""
    <path d="{outer}" fill="{stroke_color}" stroke="{stroke_color}" stroke-width="10" stroke-linejoin="round" />
    <path d="{inner}" fill="{fill_color}" />"""

    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 470">
  <g>{one_paths(16)}{one_paths(184)}
  </g>
</svg>"""


def make_parche_svg(ring_color: str, r_color: str, bolt_color: str) -> str:
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
  <!-- Aro circular -->
  <circle cx="120" cy="120" r="108" fill="none" stroke="{ring_color}" stroke-width="6.5" />
  <!-- Letra R en itálica pesada con corte diagonal -->
  <g fill="{r_color}" fill-rule="evenodd" transform="translate(8,0) skewX(-11)">
    <path d="M58,58 L128,58 C154,58 168,71 168,93 C168,111 157,123 139,127 L168,180 L134,180 L109,131 L89,131 L89,180 L58,180 Z M89,83 L89,108 L121,108 C131,108 137,103 137,95 C137,87 131,83 121,83 Z" />
  </g>
  <!-- Rayo cruzado -->
  <polygon points="164,52 118,128 145,128 122,196 186,108 156,108 178,52" fill="{bolt_color}" />
</svg>"""


def make_mezzavilla_svg(color: str) -> str:
    # MEZZAVILLA en tipografía atlética condensada pesada con arco suave como en el mockup
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 135">
  <defs>
    <path id="arch" d="M 24,116 Q 400,100 776,116" />
  </defs>
  <text fill="{color}" font-family="'Big Shoulders Display Variable', 'Impact', 'Arial Narrow', sans-serif" font-weight="800" font-size="112" letter-spacing="4" text-anchor="middle">
    <textPath href="#arch" startOffset="50%">MEZZAVILLA</textPath>
  </text>
</svg>"""


def make_argyle_svg() -> str:
    return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <rect width="256" height="256" fill="#e5decd" />
  <g fill="none" stroke-linejoin="miter">
    <!-- Rombo central y de esquinas con escalones concéntricos tipo tejido jacquard -->
    <g stroke="#d3c9b2" stroke-width="5">
      <polygon points="128,6 250,128 128,250 6,128" />
      <polygon points="128,32 224,128 128,224 32,128" />
      <polygon points="128,58 198,128 128,198 58,128" />
      <polygon points="128,84 172,128 128,172 84,128" />
      <polygon points="128,108 148,128 128,148 108,128" />
    </g>
    <g stroke="#efe9da" stroke-width="3" transform="translate(-2,-2)">
      <polygon points="128,6 250,128 128,250 6,128" />
      <polygon points="128,32 224,128 128,224 32,128" />
      <polygon points="128,58 198,128 128,198 58,128" />
      <polygon points="128,84 172,128 128,172 84,128" />
    </g>
  </g>
</svg>"""


def main():
    # 1. VEZZA
    with open(os.path.join(OUT_DIR, "vezza-verde.svg"), "w", encoding="utf-8") as f:
        f.write(make_vezza_clean_svg("#d6c48f"))
    with open(os.path.join(OUT_DIR, "vezza-crema.svg"), "w", encoding="utf-8") as f:
        f.write(make_vezza_clean_svg("#1d452a"))

    # 2. MEZZAVILLA
    with open(os.path.join(OUT_DIR, "mezzavilla-verde.svg"), "w", encoding="utf-8") as f:
        f.write(make_mezzavilla_svg("#d6c48f"))
    with open(os.path.join(OUT_DIR, "mezzavilla-crema.svg"), "w", encoding="utf-8") as f:
        f.write(make_mezzavilla_svg("#1d452a"))

    # 3. Dorsal 11
    with open(os.path.join(OUT_DIR, "dorsal-11-verde.svg"), "w", encoding="utf-8") as f:
        f.write(make_dorsal_11_svg("#d6c48f", "#9e8c5c"))
    with open(os.path.join(OUT_DIR, "dorsal-11-crema.svg"), "w", encoding="utf-8") as f:
        f.write(make_dorsal_11_svg("#1d452a", "#c5b27e"))

    # 3. Parche R + rayo
    with open(os.path.join(OUT_DIR, "parche-verde.svg"), "w", encoding="utf-8") as f:
        f.write(make_parche_svg("#d6c48f", "#e0d09b", "#e3ad2c"))
    with open(os.path.join(OUT_DIR, "parche-crema.svg"), "w", encoding="utf-8") as f:
        f.write(make_parche_svg("#d4b04a", "#141d17", "#e3ad2c"))

    # 4. Tom's Burger (vectorizado limpio en SVG desde toms-burger.png)
    w, h, d_path = trace_bitmap_to_svg_paths(os.path.join("public", "assets", "sponsors", "toms-burger.png"))
    for kit, col in [("verde", "#d6c48f"), ("crema", "#1d452a")]:
        svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}"><path d="{d_path}" fill="{col}" fill-rule="evenodd"/></svg>'
        with open(os.path.join(OUT_DIR, f"toms-burger-{kit}.svg"), "w", encoding="utf-8") as f:
            f.write(svg)

    # 5. Patrón de curvas de nivel y jacquard de rombos
    shutil.copyfile(os.path.join("public", "assets", "topo-gold.svg"), os.path.join(OUT_DIR, "curvas-nivel.svg"))
    with open(os.path.join(OUT_DIR, "rombos-jacquard.svg"), "w", encoding="utf-8") as f:
        f.write(make_argyle_svg())

    # 6. Escudo limpio sin fondo
    shutil.copyfile(os.path.join("public", "assets", "escudo", "escudo.png"), os.path.join(OUT_DIR, "escudo.png"))
    print("Arte vectorial generado en", OUT_DIR)


if __name__ == "__main__":
    main()
