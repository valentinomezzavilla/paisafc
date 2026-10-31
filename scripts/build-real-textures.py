# -*- coding: utf-8 -*-
"""
Genera los mapas PBR 4K (Albedo, Normal, ORM) de las equipaciones reales usando
operaciones C-aceleradas de Pillow (ImageChops, ImageFilter, composite):
- Cero costuras rectangulares en cuello o puños.
- Bordes dilatados (bleed) fuera de la silueta para evitar halos en el modelo 3D.
- Logos 100 % vectoriales 4K que se sombrean con los pliegues reales de la tela.
- Normal map con pliegues macro + micro-tejido deportivo + relieve de estampado/bordado.
"""

import math
import os
from PIL import Image, ImageChops, ImageEnhance, ImageFilter, ImageOps

SCRATCH = r"C:\Users\valen\.gemini\antigravity\brain\2fcbbfd0-23fc-457d-8a66-0a3ba81cb840\scratch"
LAYERS = os.path.join(SCRATCH, "layers")
OUT_REAL = os.path.join("public", "assets", "kits", "real")
os.makedirs(OUT_REAL, exist_ok=True)


def inpaint_logos_and_bleed(crema_crop: Image.Image, verde_crop: Image.Image, target_crop: Image.Image, is_front: bool):
    """
    A resolución base 300x390 (instantáneo):
    1) Detecta la máscara exacta de la camiseta usando el alto contraste de la prenda verde contra el fondo gris.
    2) Borra únicamente los logos JPEG de baja resolución del mockup (VEZZA, escudo,
       parche R, MEZZAVILLA, 11, Tom's Burger) interpolando el color y sombreado de la tela.
    3) Dilata los bordes de la prenda hacia afuera (bleed de 14 px) para que las UV 3D
       nunca tomen color gris del fondo en los contornos.
    """
    w, h = crema_crop.size
    cpx = crema_crop.load()
    vpx = verde_crop.load()
    tpx = target_crop.load()

    mask = Image.new("L", (w, h), 0)
    mpx = mask.load()
    logo_mask = Image.new("L", (w, h), 0)
    lpx = logo_mask.load()

    lum = [[0.84] * w for _ in range(h)]
    rgb = [[[0.0, 0.0, 0.0] for _ in range(w)] for _ in range(h)]

    bg_v = vpx[2, 2]

    # 1. Detectar fondo gris conectando desde los bordes exteriores sobre la vista verde:
    # La camiseta verde (R~20..35, G~50..75, B~30..45) o sus bordes dorados (R-B > 22) se distinguen
    # al 100 % del fondo gris neutro (R~205, G~208, B~213, donde B >= R).
    is_bg = [[False] * w for _ in range(h)]
    from collections import deque
    q = deque()
    for x in range(w):
        q.append((x, 0))
    for y in range(1, 376):
        q.append((0, y))
        q.append((w - 1, y))
    for sx, sy in list(q):
        is_bg[sy][sx] = True

    while q:
        cx, cy = q.popleft()
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nx, ny = cx + dx, cy + dy
            if 0 <= nx < w and 0 <= ny <= 375 and not is_bg[ny][nx]:
                rv, gv, bv = vpx[nx, ny][:3]
                # Arriba de los hombros (ny < 70) el fondo de estudio es gris claro (B > 155),
                # lo que preserva al 100 % el ribete dorado del cuello polo.
                if ny < 70:
                    is_studio_grey = bv > 155 and gv > 155 and (rv - bv) < 12
                else:
                    is_studio_grey = bv > 78 and gv > 78 and (rv - bv) < 22
                if is_studio_grey:
                    is_bg[ny][nx] = True
                    q.append((nx, ny))

    # Erosión de 1 píxel sobre el contorno exterior (excepto en el cuello polo y < 70)
    eroded_bg = [row[:] for row in is_bg]
    for y in range(70, 375):
        for x in range(1, w - 1):
            if not is_bg[y][x]:
                if is_bg[y - 1][x] or is_bg[y + 1][x] or is_bg[y][x - 1] or is_bg[y][x + 1]:
                    eroded_bg[y][x] = True
    is_bg = eroded_bg

    def is_pure_fabric(x: int, y: int) -> bool:
        """Verifica que el píxel sea tela verde (incluso en sombra profunda), nunca dorado ni gris."""
        if x < 0 or x >= w or y < 0 or y >= h or is_bg[y][x]:
            return False
        rv, gv, bv = vpx[x, y][:3]
        return (rv < 54) and (gv >= rv + 2) and (bv < 66)

    for y in range(h):
        for x in range(w):
            rc, gc, bc = cpx[x, y][:3]
            rt, gt, bt = tpx[x, y][:3]
            if y <= 375 and not is_bg[y][x]:
                mpx[x, y] = 255

            Lc = (0.299 * rc + 0.587 * gc + 0.114 * bc) / 255.0
            Lt = (0.299 * rt + 0.587 * gt + 0.114 * bt) / 255.0
            sat_c = max(rc, gc, bc) - min(rc, gc, bc)
            sat_t = max(rt, gt, bt) - min(rt, gt, bt)

            is_logo = False
            if mpx[x, y] > 0:
                if is_front:
                    if 127 <= x <= 219 and 131 <= y <= 226 and (Lc < 0.72 or Lt > 0.34 or sat_t > 26):
                        is_logo = True
                    if 201 <= x <= 255 and 75 <= y <= 147 and (Lc < 0.78 or sat_c > 18 or sat_t > 22):
                        is_logo = True
                    if 16 <= x <= 64 and 95 <= y <= 156 and (Lc < 0.76 or sat_c > 16 or Lt > 0.27 or rt > gt - 4):
                        is_logo = True
                else:
                    if 69 <= x <= 226 and 69 <= y <= 106 and (Lc < 0.72 or Lt > 0.32 or sat_t > 24):
                        is_logo = True
                    if 105 <= x <= 191 and 113 <= y <= 239 and (Lc < 0.76 or Lt > 0.30 or sat_t > 22):
                        is_logo = True
                    if 81 <= x <= 209 and 257 <= y <= 329 and (Lc < 0.72 or Lt > 0.30 or sat_t > 22):
                        is_logo = True
                    if 242 <= x <= 289 and 94 <= y <= 156 and (Lc < 0.76 or sat_c > 16 or Lt > 0.27 or rt > gt - 4):
                        is_logo = True

            if is_logo:
                lpx[x, y] = 255
            lum[y][x] = Lc
            rgb[y][x] = [float(rt), float(gt), float(bt)]

    logo_mask = logo_mask.filter(ImageFilter.MaxFilter(7))
    lpx = logo_mask.load()
    for y in range(h):
        for x in range(w):
            if mpx[x, y] == 0:
                lpx[x, y] = 0
            # Si en la zona del parche de manga quedó algún píxel no-tela pura pegado al borde, marcarlo como logo a rellenar
            elif (is_front and 16 <= x <= 66 and 93 <= y <= 157) or (not is_front and 240 <= x <= 290 and 92 <= y <= 157):
                if not is_pure_fabric(x, y):
                    lpx[x, y] = 255

    # Interpolación lineal fila por fila usando solo píxeles limpios de tela
    for y in range(h):
        x = 0
        while x < w:
            if lpx[x, y] > 0:
                x0 = x - 1
                while x < w and lpx[x, y] > 0:
                    x += 1
                x1 = x
                ok0 = x0 >= 0 and mpx[x0, y] > 0 and is_pure_fabric(x0, y)
                ok1 = x1 < w and mpx[x1, y] > 0 and is_pure_fabric(x1, y)
                if not ok0 and not ok1:
                    x += 1
                    continue
                if not ok0:
                    x0 = x1
                elif not ok1:
                    x1 = x0
                v0, v1 = lum[y][x0], lum[y][x1]
                c0, c1 = rgb[y][x0], rgb[y][x1]
                span = max(1, abs(x1 - x0))
                for k in range(min(x0, x1), max(x0, x1) + 1):
                    if lpx[k, y] > 0:
                        t = (k - x0) / span if x1 != x0 else 0.5
                        lum[y][k] = v0 * (1.0 - t) + v1 * t
                        rgb[y][k] = [c0[c] * (1.0 - t) + c1[c] * t for c in range(3)]
            else:
                x += 1

    # Relajación armónica suave dentro de los huecos de logos (solo hacia píxeles de tela válida)
    for _ in range(120):
        for y in range(1, h - 1):
            row_l = lum[y]
            ru_l = lum[y - 1]
            rd_l = lum[y + 1]
            row_c = rgb[y]
            ru_c = rgb[y - 1]
            rd_c = rgb[y + 1]
            for x in range(1, w - 1):
                if lpx[x, y] > 0:
                    nbrs_l = []
                    nbrs_c = []
                    for nx, ny, nl, nc in [
                        (x - 1, y, row_l[x - 1], row_c[x - 1]),
                        (x + 1, y, row_l[x + 1], row_c[x + 1]),
                        (x, y - 1, ru_l[x], ru_c[x]),
                        (x, y + 1, rd_l[x], rd_c[x]),
                    ]:
                        if mpx[nx, ny] > 0 and (lpx[nx, ny] > 0 or is_pure_fabric(nx, ny)):
                            nbrs_l.append(nl)
                            nbrs_c.append(nc)
                    if nbrs_l:
                        inv_n = 1.0 / len(nbrs_l)
                        row_l[x] = sum(nbrs_l) * inv_n
                        row_c[x] = [
                            sum(c[0] for c in nbrs_c) * inv_n,
                            sum(c[1] for c in nbrs_c) * inv_n,
                            sum(c[2] for c in nbrs_c) * inv_n,
                        ]

    # Dilatación (bleed) hacia afuera de la silueta (14 pasadas a 300x390)
    filled = [[mpx[x, y] > 0 for x in range(w)] for y in range(h)]
    for _ in range(14):
        updates = []
        for y in range(h):
            for x in range(w):
                if not filled[y][x]:
                    for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                        ny, nx = y + dy, x + dx
                        if 0 <= ny < h and 0 <= nx < w and filled[ny][nx]:
                            updates.append((y, x, lum[ny][nx], rgb[ny][nx][:]))
                            break
        for y, x, lv, cv in updates:
            filled[y][x] = True
            lum[y][x] = lv
            rgb[y][x] = cv

    clean_rgb_im = Image.new("RGB", (w, h))
    clean_lum_im = Image.new("L", (w, h))
    c_out = clean_rgb_im.load()
    l_out = clean_lum_im.load()
    for y in range(h):
        for x in range(w):
            r, g, b = rgb[y][x]
            c_out[x, y] = (int(max(0, min(255, r))), int(max(0, min(255, g))), int(max(0, min(255, b))))
            l_out[x, y] = int(max(0, min(255, lum[y][x] * 255.0)))

    return clean_rgb_im, clean_lum_im, mask, logo_mask


def make_normal_and_orm(shade_lo: Image.Image, logos_4k: Image.Image, is_verde: bool, size=(1024, 1332)):
    """
    Genera en resolución rápida (1024x1332 por panel) el Normal Map y el ORM Map
    combinando pliegues macro + micro-tejido piqué + relieve de estampado.
    """
    nw, nh = size
    s_im = shade_lo.resize((nw, nh), Image.Resampling.BICUBIC).filter(ImageFilter.GaussianBlur(1.5))
    l_alpha_im = logos_4k.getchannel("A").resize((nw, nh), Image.Resampling.BILINEAR)
    spx = s_im.load()
    lpx = l_alpha_im.load()

    norm_im = Image.new("RGB", (nw, nh))
    orm_im = Image.new("RGB", (nw, nh))
    npx = norm_im.load()
    opx = orm_im.load()

    for y in range(nh):
        ym = max(0, y - 2)
        yp = min(nh - 1, y + 2)
        v_cell = ((y % 4) / 4.0 - 0.5) * 0.28
        for x in range(nw):
            xm = max(0, x - 2)
            xp = min(nw - 1, x + 2)
            gx = (spx[xp, y] - spx[xm, y]) / 255.0
            gy = (spx[x, yp] - spx[x, ym]) / 255.0
            la = lpx[x, y] / 255.0
            lgx = (lpx[min(nw - 1, x + 1), y] - lpx[max(0, x - 1), y]) / 255.0
            lgy = (lpx[x, min(nh - 1, y + 1)] - lpx[x, max(0, y - 1)]) / 255.0
            u_cell = ((x % 4) / 4.0 - 0.5) * 0.28

            nx = -gx * 3.6 - u_cell * (1.0 - 0.5 * la) - lgx * 1.1
            ny = gy * 3.6 + v_cell * (1.0 - 0.5 * la) + lgy * 1.1
            inv = 1.0 / math.sqrt(nx * nx + ny * ny + 1.0)
            npx[x, y] = (
                int((nx * inv * 0.5 + 0.5) * 255.0),
                int((ny * inv * 0.5 + 0.5) * 255.0),
                int((inv * 0.5 + 0.5) * 255.0),
            )

            s_val = spx[x, y] / 215.0
            ao = max(0.18, min(1.0, s_val ** 0.85))
            rough = 0.76 * (1.0 - la) + 0.42 * la
            metal = (0.10 if is_verde else 0.03) * la
            opx[x, y] = (int(ao * 255.0), int(rough * 255.0), int(metal * 255.0))

    return norm_im, orm_im


def build_shirt_4k(kit: str):
    im = Image.open(os.path.join("public", "assets", "source", "camiseta-mockup.jpg"))
    cf = im.crop((15, 50, 315, 440))
    cb = im.crop((307, 50, 607, 440))
    vf = im.crop((606, 50, 906, 440))
    vb = im.crop((898, 50, 1198, 440))

    topo_4k = Image.open(os.path.join(LAYERS, "verde-topo.png")).convert("RGBA")
    argyle_4k = Image.open(os.path.join(LAYERS, "crema-argyle.png")).convert("RGBA")
    W, H = topo_4k.size  # 1800 x 2340
    topo_alpha_4k = topo_4k.getchannel("A")
    argyle_alpha_4k = argyle_4k.getchannel("A")

    is_verde = kit == "verde"
    tf_crop = vf if is_verde else cf
    tb_crop = vb if is_verde else cb

    panels_albedo = []
    panels_normal = []
    panels_orm = []

    for is_front, c_crop, v_crop, t_crop, side_name in [(True, cf, vf, tf_crop, "front"), (False, cb, vb, tb_crop, "back")]:
        logos_4k = Image.open(os.path.join(LAYERS, f"{kit}-{side_name}-logos.png")).convert("RGBA")
        clean_rgb_lo, clean_lum_lo, mask_lo, logo_lo = inpaint_logos_and_bleed(c_crop, v_crop, t_crop, is_front)

        # Escalar a 4K en C (instantáneo)
        rgb_hi = clean_rgb_lo.resize((W, H), Image.Resampling.BICUBIC)
        shade_hi = clean_lum_lo.resize((W, H), Image.Resampling.BICUBIC)

        # En los huecos donde borramos los logos JPEG, reinyectamos la trama 4K (curvas de nivel en verde, rombos en crema)
        logo_hi = logo_lo.resize((W, H), Image.Resampling.BICUBIC).filter(ImageFilter.GaussianBlur(12))
        if is_verde:
            topo_dark = ImageEnhance.Brightness(rgb_hi).enhance(0.72)
            topo_mask = ImageChops.multiply(topo_alpha_4k, ImageEnhance.Brightness(logo_hi).enhance(0.95))
            rgb_hi = Image.composite(topo_dark, rgb_hi, topo_mask)
        else:
            argyle_dark = ImageEnhance.Brightness(rgb_hi).enhance(0.955)
            argyle_mask = ImageChops.multiply(argyle_alpha_4k, ImageEnhance.Brightness(logo_hi).enhance(0.85))
            rgb_hi = Image.composite(argyle_dark, rgb_hi, argyle_mask)

        # Sombreado de pliegue aplicado sobre los logos vectoriales 4K
        # Normalizamos shade_hi para que el blanco crema (~212) sea 255 (factor 1.0) y las sombras de pliegue oscurezcan el logo
        shade_norm = shade_hi.point(lambda p: min(255, max(55, int((p / 210.0) ** 1.15 * 255.0))))
        shade_rgb = Image.merge("RGB", (shade_norm, shade_norm, shade_norm))
        logos_rgb = Image.merge("RGB", logos_4k.split()[:3])
        logos_shaded_rgb = ImageChops.multiply(logos_rgb, shade_rgb)

        # Composición final 4K de los logos vectoriales sombreados sobre la prenda
        out_rgb = Image.composite(logos_shaded_rgb, rgb_hi, logos_4k.getchannel("A"))

        # Máscara de silueta suave a 4K para la vista previa de inspección
        mask_hi = (
            mask_lo.resize((W, H), Image.Resampling.BICUBIC)
            .filter(ImageFilter.GaussianBlur(2.0))
            .point(lambda p: min(255, max(0, int((p - 96) * 3.2))))
        )
        preview_rgba = out_rgb.copy()
        preview_rgba.putalpha(mask_hi)
        preview_rgba.save(os.path.join(SCRATCH, f"{kit}_{side_name}_4k_preview.png"))

        norm_im, orm_im = make_normal_and_orm(clean_lum_lo, logos_4k, is_verde)
        panels_albedo.append(out_rgb)
        panels_normal.append(norm_im)
        panels_orm.append(orm_im)

    # Guardar Atlas Frente (izquierda) + Espalda (derecha) en 2048x1332
    atlas_w, atlas_h = 2048, 1332
    half_w = atlas_w // 2
    for name, panels, q in [("albedo", panels_albedo, 92), ("normal", panels_normal, 86), ("orm", panels_orm, 85)]:
        left_im = panels[0].resize((half_w, atlas_h), Image.Resampling.LANCZOS)
        right_im = panels[1].resize((half_w, atlas_h), Image.Resampling.LANCZOS)
        atlas = Image.new("RGB", (atlas_w, atlas_h))
        atlas.paste(left_im, (0, 0))
        atlas.paste(right_im, (half_w, 0))
        atlas.save(os.path.join(OUT_REAL, f"{kit}-shirt-{name}.webp"), "WEBP", quality=q, method=6)

    print(f"Atlas PBR 4K de {kit} exportado en {OUT_REAL}")


if __name__ == "__main__":
    build_shirt_4k("verde")
    build_shirt_4k("crema")
