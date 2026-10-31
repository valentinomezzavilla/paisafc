# -*- coding: utf-8 -*-
"""
Construye el modelo 3D realista de la camiseta (`public/assets/kits/real/shirt-real.glb`)
usando Blender 5.2 en modo headless.

Convención de ejes en Blender para exportación glTF (+Y arriba, +Z al frente):
- `X_blender = (px - 150) * SCALE`  -> `+X_gltf` (derecha)
- `Z_blender = (205 - py) * SCALE`  -> `+Y_gltf` (arriba: cuello arriba, ruedo abajo)
- `Y_blender = -z_depth`            -> `+Z_gltf` (frente hacia la cámara en +Z, espalda en -Z)
"""

import math
import os
from collections import deque
import bpy
import bmesh

OUT_DIR = os.path.join("public", "assets", "kits", "real")
os.makedirs(OUT_DIR, exist_ok=True)
OUT_GLB = os.path.join(OUT_DIR, "shirt-real.glb")


def extract_silhouette_and_heightfield():
    img_path = os.path.abspath(os.path.join("public", "assets", "source", "camiseta-mockup.jpg"))
    img = bpy.data.images.load(img_path)
    W_img, H_img = img.size  # 1200 x 896
    pixels = list(img.pixels)

    def get_rgb_mockup(mx: int, my_top: int):
        by = (H_img - 1) - max(0, min(H_img - 1, my_top))
        bx = max(0, min(W_img - 1, mx))
        idx = (by * W_img + bx) * 4
        return pixels[idx], pixels[idx + 1], pixels[idx + 2]

    w, h = 300, 390
    v_rgb = [[(0.0, 0.0, 0.0)] * w for _ in range(h)]
    cf_lum = [[0.84] * w for _ in range(h)]
    cb_lum = [[0.84] * w for _ in range(h)]

    for y in range(h):
        for x in range(w):
            rv, gv, bv = get_rgb_mockup(606 + x, 50 + y)
            v_rgb[y][x] = (rv * 255.0, gv * 255.0, bv * 255.0)
            rcf, gcf, bcf = get_rgb_mockup(15 + x, 50 + y)
            rcb, gcb, bcb = get_rgb_mockup(307 + x, 50 + y)
            cf_lum[y][x] = 0.299 * rcf + 0.587 * gcf + 0.114 * bcf
            cb_lum[y][x] = 0.299 * rcb + 0.587 * gcb + 0.114 * bcb

    bg_v = v_rgb[2][2]
    is_bg = [[False] * w for _ in range(h)]
    q = deque()
    for x in range(w):
        q.append((x, 0))
        q.append((x, h - 1))
    for y in range(1, h - 1):
        q.append((0, y))
        q.append((w - 1, y))
    for sx, sy in list(q):
        is_bg[sy][sx] = True

    while q:
        cx, cy = q.popleft()
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nx, ny = cx + dx, cy + dy
            if 0 <= nx < w and 0 <= ny < h and not is_bg[ny][nx]:
                if ny > 374:
                    is_bg[ny][nx] = True
                    q.append((nx, ny))
                    continue
                rv, gv, bv = v_rgb[ny][nx]
                if ny < 70:
                    is_studio_grey = bv > 155 and gv > 155 and (rv - bv) < 12
                else:
                    is_studio_grey = bv > 78 and gv > 78 and (rv - bv) < 22
                if is_studio_grey:
                    is_bg[ny][nx] = True
                    q.append((nx, ny))

    # Erosión de 1 píxel para que el borde del modelo 3D caiga siempre dentro de tela 100 % pura (debajo del cuello)
    eroded_bg = [row[:] for row in is_bg]
    for y in range(70, 375):
        for x in range(1, w - 1):
            if not is_bg[y][x]:
                if is_bg[y - 1][x] or is_bg[y + 1][x] or is_bg[y][x - 1] or is_bg[y][x + 1]:
                    eroded_bg[y][x] = True
    is_bg = eroded_bg

    # Conservar únicamente la componente conexa principal de la camiseta
    mask = [[False] * w for _ in range(h)]
    qf = deque([(150, 180)])
    mask[180][150] = True
    while qf:
        cx, cy = qf.popleft()
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nx, ny = cx + dx, cy + dy
            if 0 <= nx < w and 0 <= ny < h and not is_bg[ny][nx] and not mask[ny][nx]:
                mask[ny][nx] = True
                qf.append((nx, ny))

    for grid in (cf_lum, cb_lum):
        for y in range(h):
            for x in range(w):
                if grid[y][x] < 0.75 or grid[y][x] > 0.89:
                    grid[y][x] = 0.835
        for _ in range(6):
            tmp = [[grid[y][x] for x in range(w)] for y in range(h)]
            for y in range(2, h - 2):
                for x in range(2, w - 2):
                    grid[y][x] = (
                        tmp[y][x - 2] + tmp[y][x - 1] + tmp[y][x] + tmp[y][x + 1] + tmp[y][x + 2]
                    ) * 0.2
            tmp2 = [[grid[y][x] for x in range(w)] for y in range(h)]
            for y in range(2, h - 2):
                for x in range(2, w - 2):
                    grid[y][x] = (
                        tmp2[y - 2][x] + tmp2[y - 1][x] + tmp2[y][x] + tmp2[y + 1][x] + tmp2[y + 2][x]
                    ) * 0.2

    bpy.data.images.remove(img)
    return mask, cf_lum, cb_lum


def is_open_boundary_px(mask, x: int, y: int, w=300, h=390) -> bool:
    """True si el píxel de contorno `(x, y)` pertenece a una abertura hueca (cuello, puños o ruedo)."""
    if y <= 34 and 112 <= x <= 188:
        return True
    if y >= 363 and 70 <= x <= 230:
        return True
    if x <= 65 and y >= 155:
        if (y + 2 < h and not mask[y + 2][x]) and (x >= 21):
            return True
    if x >= 235 and y >= 155:
        if (y + 2 < h and not mask[y + 2][x]) and (x <= 279):
            return True
    return False


def classify_boundary_and_distance(mask, w=300, h=390):
    dist_seam = [[999.0] * w for _ in range(h)]
    q = deque()

    for y in range(h):
        for x in range(w):
            if not mask[y][x]:
                continue
            is_bdr = False
            for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                nx, ny = x + dx, y + dy
                if nx < 0 or nx >= w or ny < 0 or ny >= h or not mask[ny][nx]:
                    is_bdr = True
                    break
            if is_bdr and not is_open_boundary_px(mask, x, y, w, h):
                dist_seam[y][x] = 0.0
                q.append((x, y))

    while q:
        cx, cy = q.popleft()
        cd = dist_seam[cy][cx]
        for dx, dy, step in [
            (-1, 0, 1.0),
            (1, 0, 1.0),
            (0, -1, 1.0),
            (0, 1, 1.0),
            (-1, -1, 1.414),
            (1, -1, 1.414),
            (-1, 1, 1.414),
            (1, 1, 1.414),
        ]:
            nx, ny = cx + dx, cy + dy
            if 0 <= nx < w and 0 <= ny < h and mask[ny][nx]:
                nd = cd + step
                if nd < dist_seam[ny][nx]:
                    dist_seam[ny][nx] = nd
                    q.append((nx, ny))

    return dist_seam


def compute_shell_depth(px: float, py: float, d_seam: float, lum_val: float, is_front: bool) -> float:
    """
    Calcula la profundidad 3D hacia el frente (+Z en glTF) o hacia la espalda (-Z en glTF).
    En las costuras cerradas (`d_seam == 0`), vale 0 para que frente y espalda suelden suavemente.
    """
    if d_seam <= 0.01:
        return 0.0

    # Transición suave C1 (smoothstep) entre el pecho/escudo y las mangas (sin salto brusco en px=228)
    dx_center = abs(px - 150.0)
    u_sleeve = max(0.0, min(1.0, (dx_center - 96.0) / 32.0))
    sleeve_w = u_sleeve * u_sleeve * (3.0 - 2.0 * u_sleeve)

    radius_px = 52.0 * (1.0 - sleeve_w) + 28.0 * sleeve_w
    t = min(1.0, max(0.0, d_seam / radius_px))
    profile = math.sin(t * math.pi * 0.5) ** 0.88

    if py < 145:
        u = max(0.0, (py - 40.0) / 105.0)
        torso_depth = 0.078 + 0.016 * math.sin(u * math.pi * 0.5)
    elif py < 275:
        u = (py - 145.0) / 130.0
        torso_depth = 0.094 - 0.014 * math.sin(u * math.pi * 0.5)
    else:
        u = min(1.0, (py - 275.0) / 95.0)
        torso_depth = 0.080 + 0.006 * u

    if not is_front:
        torso_depth *= 0.92

    base_depth = torso_depth * (1.0 - sleeve_w) + 0.048 * sleeve_w
    z_mag = base_depth * profile

    # Relieve 3D de las solapas del cuello polo
    if is_front and py < 74 and 94 <= px <= 206:
        dx_c = abs(px - 150.0)
        if 10.0 <= dx_c <= 48.0 and 18.0 <= py <= 66.0:
            collar_lift = math.sin(min(1.0, (dx_c - 10.0) / 38.0) * math.pi) * math.sin(
                min(1.0, (66.0 - py) / 48.0) * math.pi
            )
            z_mag += 0.007 * collar_lift
    elif not is_front and py < 42 and 100 <= px <= 200:
        z_mag += 0.005 * max(0.0, 1.0 - (py - 16.0) / 26.0)

    # Relieve de pliegues reales de la tela
    fold_disp = (lum_val - 0.835) * 0.022 * min(1.0, d_seam / 12.0)
    hem_wave = 0.0
    if py > 290 and sleeve_w < 0.01:
        hem_t = min(1.0, (py - 290.0) / 80.0) * min(1.0, d_seam / 14.0)
        hem_wave = 0.0028 * hem_t * math.cos((px - 150.0) * 0.11)

    total_z = max(0.0004, z_mag + fold_disp + hem_wave)
    return total_z if is_front else -total_z


def build_shirt_mesh():
    bpy.ops.wm.read_factory_settings(use_empty=True)

    mask, cf_lum, cb_lum = extract_silhouette_and_heightfield()
    w, h = 300, 390
    dist_seam = classify_boundary_and_distance(mask, w, h)

    STEP = 2
    SCALE = 0.0024  # 300 px -> 0.72 m ancho, 390 px -> 0.936 m alto

    bm = bmesh.new()
    uv_layer = bm.loops.layers.uv.new("UVMap")

    gw = w // STEP
    gh = h // STEP

    active = [[mask[gy * STEP][gx * STEP] for gx in range(gw)] for gy in range(gh)]

    # Suavizar las coordenadas 2D (X, Z_up) de los nodos del borde de la grilla para quitar cualquier diente de sierra
    pos_2d = {}
    for gy in range(gh):
        py = gy * STEP
        for gx in range(gw):
            if active[gy][gx]:
                px = gx * STEP
                pos_2d[(gx, gy)] = [(px - 150.0) * SCALE, (198.0 - py) * SCALE]

    # 3 pasadas de relajación de contorno sobre los nodos frontera en el plano 2D (X, Z_up)
    is_grid_bdr = {}
    for (gx, gy) in pos_2d:
        bdr = False
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (1, -1), (-1, 1), (1, 1)]:
            if (gx + dx, gy + dy) not in pos_2d:
                bdr = True
                break
        is_grid_bdr[(gx, gy)] = bdr

    for _ in range(4):
        new_pos = {}
        for c, (cx, cz) in pos_2d.items():
            gx, gy = c
            if is_grid_bdr[c]:
                nbrs = [
                    pos_2d[(gx + dx, gy + dy)]
                    for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (1, -1), (-1, 1), (1, 1)]
                    if (gx + dx, gy + dy) in pos_2d and is_grid_bdr[(gx + dx, gy + dy)]
                ]
                if len(nbrs) >= 2:
                    avg_x = sum(p[0] for p in nbrs) / len(nbrs)
                    avg_z = sum(p[1] for p in nbrs) / len(nbrs)
                    new_pos[c] = [cx * 0.45 + avg_x * 0.55, cz * 0.45 + avg_z * 0.55]
                else:
                    new_pos[c] = [cx, cz]
            else:
                new_pos[c] = [cx, cz]
        pos_2d = new_pos

    front_verts = {}
    back_verts = {}

    def sample_bilinear(grid, fx: float, fy: float) -> float:
        x0 = max(0, min(w - 1, int(fx)))
        y0 = max(0, min(h - 1, int(fy)))
        x1 = min(w - 1, x0 + 1)
        y1 = min(h - 1, y0 + 1)
        tx = fx - x0
        ty = fy - y0
        v00 = grid[y0][x0]
        v10 = grid[y0][x1]
        v01 = grid[y1][x0]
        v11 = grid[y1][x1]
        return (v00 * (1 - tx) + v10 * tx) * (1 - ty) + (v01 * (1 - tx) + v11 * tx) * ty

    for (gx, gy), (X_b, Z_b) in pos_2d.items():
        px = gx * STEP
        py = gy * STEP
        d_s = dist_seam[py][px]
        is_closed_seam = is_grid_bdr[(gx, gy)] and not is_open_boundary_px(mask, px, py, w, h)
        if is_closed_seam:
            d_s = 0.0

        lf = sample_bilinear(cf_lum, px, py)
        lb = sample_bilinear(cb_lum, 300.0 - px, py)

        zf_gltf = compute_shell_depth(px, py, d_s, lf, True)
        zb_gltf = compute_shell_depth(px, py, d_s, lb, False)

        # En Blender: Y_blender = -Z_gltf (así +Z_gltf apunta hacia la cámara frontal)
        vf = bm.verts.new((X_b, -zf_gltf, Z_b))
        front_verts[(gx, gy)] = vf
        if is_closed_seam:
            back_verts[(gx, gy)] = vf
        else:
            vb = bm.verts.new((X_b, -zb_gltf, Z_b))
            back_verts[(gx, gy)] = vb

    bm.verts.ensure_lookup_table()

    def get_uv_front(gx: int, gy: int):
        px = gx * STEP
        py = gy * STEP
        return ((px / 300.0) * 0.5, 1.0 - (py / 390.0))

    def get_uv_back(gx: int, gy: int):
        px = gx * STEP
        py = gy * STEP
        return (0.5 + ((300.0 - px) / 300.0) * 0.5, 1.0 - (py / 390.0))

    def add_front_face(corners):
        verts = [front_verts[c] for c in corners]
        if len(set(verts)) < 3:
            return
        try:
            f = bm.faces.new(verts)
            f.smooth = True
            for loop, c in zip(f.loops, corners):
                loop[uv_layer].uv = get_uv_front(*c)
        except ValueError:
            pass

    def add_back_face(corners_ccw_front):
        corners_back = list(reversed(corners_ccw_front))
        verts = [back_verts[c] for c in corners_back]
        if len(set(verts)) < 3:
            return
        try:
            f = bm.faces.new(verts)
            f.smooth = True
            for loop, c in zip(f.loops, corners_back):
                loop[uv_layer].uv = get_uv_back(*c)
        except ValueError:
            pass

    for gy in range(gh - 1):
        for gx in range(gw - 1):
            # En Blender (X derecha, Z arriba, normal frontal hacia -Y):
            # c00=(X, Z), c01=(X, Z-dZ), c11=(X+dX, Z-dZ), c10=(X+dX, Z)
            # (c01 - c00) x (c11 - c01) = (0, 0, -dZ) x (dX, 0, 0) = (0, -dX*dZ, 0) -> apunta hacia -Y_blender (+Z_gltf)
            cell = [(gx, gy), (gx, gy + 1), (gx + 1, gy + 1), (gx + 1, gy)]
            present = [c for c in cell if c in front_verts]
            if len(present) == 4:
                add_front_face(cell)
                add_back_face(cell)
            elif len(present) == 3:
                add_front_face(present)
                add_back_face(present)

    # Recalcular normales de BMesh y orientar las normales de la costura cerrada hacia afuera en el plano XZ
    bm.normal_update()

    mesh = bpy.data.meshes.new("shirt-body")
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("shirt-body", mesh)
    bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)

    bpy.ops.object.shade_smooth()

    # Crear malla interior oscura (`shirt-inner`) ligeramente retraída hacia adentro (Y_blender * 0.88)
    inner_mesh = mesh.copy()
    inner_mesh.name = "shirt-inner"
    inner_obj = bpy.data.objects.new("shirt-inner", inner_mesh)
    bpy.context.collection.objects.link(inner_obj)

    bm_in = bmesh.new()
    bm_in.from_mesh(inner_mesh)
    for v in bm_in.verts:
        v.co.y *= 0.88
    bmesh.ops.reverse_faces(bm_in, faces=bm_in.faces)
    bm_in.to_mesh(inner_mesh)
    bm_in.free()

    bpy.ops.export_scene.gltf(
        filepath=OUT_GLB,
        export_format="GLB",
        export_apply=True,
        export_texcoords=True,
        export_normals=True,
        export_tangents=True,
    )
    print(f"Modelo 3D correctamente orientado exportado en {OUT_GLB} ({os.path.getsize(OUT_GLB) // 1024} KB)")


if __name__ == "__main__":
    build_shirt_mesh()
