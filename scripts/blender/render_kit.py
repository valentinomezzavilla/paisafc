"""
Render realista de las camisetas en Blender (Cycles).

    blender -b --factory-startup --python scripts/blender/render_kit.py -- --kit verde --view shirt --angles 0 --out .cache/blender/out

Parte de .cache/blender/kit-base.glb (scripts/blender/export-base.ts) y de las texturas de
.cache/blender/tex/ (scripts/blender/export-textures.mjs):

1. Simula la tela: cada pieza cuelga sobre un maniquí invisible (la misma prenda achicada) con la tela
   un poco más grande que el maniquí, así se forman pliegues de verdad en axilas, cintura y ruedo.
2. Los estampados, el cuello y los ribetes siguen los pliegues (Surface Deform sobre la tela simulada).
3. Tela con trama de punto, sheen y cara interna más oscura; vinilo un poco más brillante; escudo bordado.
4. Luz de estudio (softbox principal, relleno y dos contraluces), fondo transparente y AgX.
"""

import argparse
import math
import os
import sys

import bpy
from mathutils import Vector
from mathutils.kdtree import KDTree

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
BASE = os.path.join(ROOT, ".cache", "blender")
TEX = os.path.join(BASE, "tex")
STUDIO_HDRI = os.path.join(os.path.dirname(bpy.app.binary_path), "5.2", "datafiles", "studiolights", "world", "studio.exr")

# Colores de src/three/kitColors.ts, corregidos para Cycles + AgX (la luz de estudio los aclara y los lava):
# la verde va hacia el verde bosque del mockup y los dorados, más saturados.
COLORS = {
    "verde": dict(fabric="#113119", trim="#c2a35a", trim2="#c2a35a", shorts="#113119", stripe="#c2a35a", socks="#113119", boots="#1a4027", sole="#0f2a18"),
    "crema": dict(fabric="#e0d5b8", trim="#1c3f28", trim2="#c2a35a", shorts="#163a23", stripe="#e6d9b8", socks="#e6d9b8", boots="#f0ece2", sole="#1c3f28"),
}
# Color de fondo con el que el sitio dibujó la textura de la tela (para sacar solo el dibujo) y cuánto se marca
TEX_FABRIC = {"verde": "#1d4a2a", "crema": "#e2d9c0"}
PATTERN_STRENGTH = {"verde": 0.55, "crema": 0.8}
# Los estampados se dibujaron con el dorado del sitio; en el render se ven casi blancos sin este tinte
PRINT_TINT = {"verde": (1.0, 0.86, 0.6, 1), "crema": (1, 1, 1, 1)}
# Perímetros y repetición de la trama (src/three/KitModel.tsx y design/topoTexture.ts)
PERIMETER = {"body": 1.1, "sleeve": 0.47, "legs": 0.66, "sock": 0.28}
TOPO_TILE = (0.9, 0.56)
ARGYLE_TILE = 0.035

SHIRT_PIECES = ["shirt-body", "shirt-sleeveL", "shirt-sleeveR"]
# Cuánto sobra de tela respecto del maniquí y cuánto la sostiene su forma original (0–1)
EXPAND = 0.006
HOLD = 0.2
SLEEVE_HOLD = 0.8


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument("--kit", default="verde", choices=["verde", "crema"])
    p.add_argument("--view", default="shirt", choices=["shirt", "full"])
    p.add_argument("--angles", default="0", help="grados separados por coma, o N para una vuelta de N cuadros")
    p.add_argument("--out", default=os.path.join(BASE, "out"))
    p.add_argument("--res", default="900x1000")
    p.add_argument("--samples", type=int, default=128)
    p.add_argument("--preview", action="store_true", help="render rápido (Workbench) para revisar la simulación")
    p.add_argument("--sim-frames", type=int, default=24)
    p.add_argument("--save-blend", action="store_true")
    return p.parse_args(argv)


def hex_rgba(h, a=1.0):
    h = h.lstrip("#")
    srgb = [int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb]
    return (*lin, a)


# --------------------------------------------------------------------------------------- escena
def load_scene(view):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(BASE, "kit-base.glb"))
    for o in list(bpy.data.objects):
        lower = o.name.startswith(("shorts", "socks", "boots")) or o.name == "decal-shortEscudo"
        if o.type == "EMPTY" or (view == "shirt" and lower):
            bpy.data.objects.remove(o, do_unlink=True)
    for o in bpy.data.objects:
        o.select_set(False)
        for poly in o.data.polygons:
            poly.use_smooth = True


def obj(name):
    return bpy.data.objects.get(name)


def make_active(o):
    for other in bpy.context.selected_objects:
        other.select_set(False)
    o.select_set(True)
    bpy.context.view_layer.objects.active = o


# ------------------------------------------------------------------------------- simulación de tela
def pin_group(o, weight_fn):
    g = o.vertex_groups.new(name="pin")
    for v in o.data.vertices:
        w = weight_fn(o.matrix_world @ v.co)
        if w > 0:
            g.add([v.index], min(1.0, w), "REPLACE")
    return g


def smoothstep(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def mannequin_from(pieces, inset):
    """Maniquí invisible: copia de las piezas achicada hacia adentro, para que la tela se apoye."""
    parts = []
    for o in pieces:
        c = o.copy()
        c.data = o.data.copy()
        c.name = f"mannequin-{o.name}"
        bpy.context.collection.objects.link(c)
        d = c.modifiers.new("inset", "DISPLACE")
        d.direction = "NORMAL"
        d.mid_level = 0
        d.strength = -inset
        make_active(c)
        bpy.ops.object.modifier_apply(modifier="inset")
        col = c.modifiers.new("collision", "COLLISION")
        c.collision.thickness_outer = 0.002
        c.collision.cloth_friction = 8
        c.hide_render = True
        parts.append(c)
    return parts


def add_cloth(o, pin, expand):
    m = o.modifiers.new("cloth", "CLOTH")
    s = m.settings
    s.quality = 8
    s.mass = 0.18  # jersey de poliéster liviano
    s.air_damping = 1.5
    s.tension_stiffness = 12
    s.compression_stiffness = 12
    s.shear_stiffness = 6
    s.bending_stiffness = 0.12  # bajo: pliegues finos de tela delgada
    s.shrink_min = -expand  # la tela es un poco más grande que el maniquí: sobra y se arruga
    s.vertex_group_mass = pin.name
    s.pin_stiffness = 1
    c = m.collision_settings
    c.distance_min = 0.0025
    c.use_self_collision = False
    m.point_cache.frame_start = 1
    m.point_cache.frame_end = 200
    return m


def weld(o):
    """Suelda la costura de las UV (vértices repetidos): si no, la tela se abre por ahí."""
    make_active(o)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.remove_doubles(threshold=0.0002)
    bpy.ops.object.mode_set(mode="OBJECT")


def border_tree(o, keep=lambda p: True):
    """Vértices de los bordes abiertos (aristas con una sola cara) que cumplen `keep`."""
    count = {}
    for p in o.data.polygons:
        for e in p.edge_keys:
            count[e] = count.get(e, 0) + 1
    verts = {i for e, n in count.items() if n == 1 for i in e}
    pts = [o.matrix_world @ o.data.vertices[i].co for i in verts]
    pts = [p for p in pts if keep(p)]
    tree = KDTree(len(pts))
    for i, p in enumerate(pts):
        tree.insert(p, i)
    tree.balance()
    return tree


def simulate_shirt(frames):
    body, sl, sr = (obj(n) for n in SHIRT_PIECES)
    for o in (body, sl, sr):
        weld(o)
    mannequin_from([body, sl, sr], inset=0.011)

    # Cuerpo: firme en hombros y en todo el borde del cuello (si no, la abertura en V se cierra); desde
    # el pecho para abajo, apenas sostenido: cae y se arruga sin perder la forma de la prenda puesta.
    neck = border_tree(body, lambda p: p.z > 1.3)
    pin_group(
        body,
        lambda p: max(
            HOLD + (1 - HOLD) * smoothstep(1.12, 1.45, p.z),
            1 - smoothstep(0.012, 0.045, neck.find(p)[2]),
        ),
    )
    # Mangas: firme la parte que queda adentro del cuerpo; el resto, sostenido a medias.
    # El borde del puño también firme: si cuelga, se dobla hacia adentro y arruga los ribetes.
    for sleeve, inside in ((sl, lambda p: smoothstep(-0.205, -0.17, p.x)), (sr, lambda p: 1 - smoothstep(0.17, 0.205, p.x))):
        cuff = border_tree(sleeve)
        pin_group(
            sleeve,
            lambda p, inside=inside, cuff=cuff: max(
                SLEEVE_HOLD + (1 - SLEEVE_HOLD) * inside(p),
                1 - smoothstep(0.008, 0.03, cuff.find(p)[2]),
            ),
        )
    for o, expand in ((body, EXPAND), (sl, EXPAND * 0.5), (sr, EXPAND * 0.5)):
        add_cloth(o, o.vertex_groups["pin"], expand)

    followers = [o for o in bpy.data.objects if o.type == "MESH" and (o.name.startswith(("decal-", "shirt-collar", "shirt-cuffTrim")))]
    bind_followers(followers, frames)
    return body, sl, sr


def nearest_piece(o):
    """La pieza de tela sobre la que va un calco o ribete."""
    name = o.name
    if "sleeve" in name or "cuffTrim" in name or name == "decal-parche":
        center = sum((o.matrix_world @ v.co for v in o.data.vertices), Vector()) / len(o.data.vertices)
        return obj("shirt-sleeveL" if center.x < 0 else "shirt-sleeveR")
    return obj("shirt-body")


def bind_followers(followers, frames):
    scene = bpy.context.scene
    scene.frame_start, scene.frame_end = 1, frames
    scene.frame_set(1)
    for f in followers:
        target = nearest_piece(f)
        sd = f.modifiers.new("follow", "SURFACE_DEFORM")
        sd.target = target
        sd.falloff = 6
        make_active(f)
        bpy.ops.object.surfacedeform_bind(modifier="follow")
    for frame in range(1, frames + 1):
        scene.frame_set(frame)
    for o in list(bpy.data.objects):
        if o.type != "MESH" or o.name.startswith("mannequin-"):
            continue
        make_active(o)
        for mod in list(o.modifiers):
            if mod.type in {"SURFACE_DEFORM"}:
                bpy.ops.object.modifier_apply(modifier=mod.name)
    for o in list(bpy.data.objects):
        if o.type == "MESH" and any(m.type == "CLOTH" for m in o.modifiers):
            make_active(o)
            bpy.ops.object.modifier_apply(modifier="cloth")
    for o in list(bpy.data.objects):
        if o.name.startswith("mannequin-"):
            bpy.data.objects.remove(o, do_unlink=True)
    scene.frame_set(1)


# ----------------------------------------------------------------------------------- materiales
def node_tree(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    return m, nt, out


def knit_bump(nt, strength, scale=650.0):
    """Trama de punto: columnas de puntadas en V a escala real (≈1,5 mm), por coordenadas del objeto."""
    tc = nt.nodes.new("ShaderNodeTexCoord")
    wave = nt.nodes.new("ShaderNodeTexWave")
    wave.wave_type = "BANDS"
    wave.bands_direction = "X"
    wave.wave_profile = "SIN"
    wave.inputs["Scale"].default_value = scale
    wave.inputs["Distortion"].default_value = 1.5
    wave.inputs["Detail"].default_value = 1.0
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = scale * 1.6
    noise.inputs["Detail"].default_value = 2
    nt.links.new(tc.outputs["Object"], wave.inputs["Vector"])
    nt.links.new(tc.outputs["Object"], noise.inputs["Vector"])
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "FLOAT"
    mix.inputs["Factor"].default_value = 0.35
    nt.links.new(wave.outputs["Fac"], mix.inputs["A"])
    nt.links.new(noise.outputs["Fac"], mix.inputs["B"])
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = strength
    bump.inputs["Distance"].default_value = 0.0004
    nt.links.new(mix.outputs["Result"], bump.inputs["Height"])
    return bump


def fabric_material(name, kit, color, pattern_perimeter=None, roughness=0.78, sheen=0.6, knit=0.25):
    m, nt, out = node_tree(name)
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Sheen Weight"].default_value = sheen
    bsdf.inputs["Sheen Roughness"].default_value = 0.45
    bsdf.inputs["Specular IOR Level"].default_value = 0.35
    base = nt.nodes.new("ShaderNodeRGB")
    base.outputs[0].default_value = hex_rgba(color)
    color_out = base.outputs[0]

    if pattern_perimeter:
        img = nt.nodes.new("ShaderNodeTexImage")
        img.image = bpy.data.images.load(os.path.join(TEX, f"{kit}-fabric.png"), check_existing=True)
        uv = nt.nodes.new("ShaderNodeTexCoord")
        mapping = nt.nodes.new("ShaderNodeMapping")
        if kit == "crema":
            img.extension = "REPEAT"
            reps = (max(1, round(pattern_perimeter / ARGYLE_TILE)), 1 / ARGYLE_TILE)
            offset_x = 0
        else:
            img.extension = "MIRROR"
            ru = max(2, 2 * round(pattern_perimeter / TOPO_TILE[0] / 2))
            reps = (ru, 1 / TOPO_TILE[1])
            offset_x = ((-ru * 0.25) % 1 + 1) % 1
        mapping.inputs["Scale"].default_value = (reps[0], reps[1], 1)
        mapping.inputs["Location"].default_value = (offset_x, 0, 0)
        nt.links.new(uv.outputs["UV"], mapping.inputs["Vector"])
        nt.links.new(mapping.outputs["Vector"], img.inputs["Vector"])
        # Solo el dibujo: la textura dividida por su color de fondo (1 = tela lisa), suavizado y sobre el color de acá
        ratio = nt.nodes.new("ShaderNodeMix")
        ratio.data_type = "RGBA"
        ratio.blend_type = "DIVIDE"
        ratio.inputs["Factor"].default_value = 1
        ratio.inputs["B"].default_value = hex_rgba(TEX_FABRIC[kit])
        nt.links.new(img.outputs["Color"], ratio.inputs["A"])
        soft = nt.nodes.new("ShaderNodeMix")
        soft.data_type = "RGBA"
        soft.inputs["Factor"].default_value = PATTERN_STRENGTH[kit]
        soft.inputs["A"].default_value = (1, 1, 1, 1)
        nt.links.new(ratio.outputs["Result"], soft.inputs["B"])
        tinted = nt.nodes.new("ShaderNodeMix")
        tinted.data_type = "RGBA"
        tinted.blend_type = "MULTIPLY"
        tinted.inputs["Factor"].default_value = 1
        nt.links.new(base.outputs[0], tinted.inputs["A"])
        nt.links.new(soft.outputs["Result"], tinted.inputs["B"])
        color_out = tinted.outputs["Result"]

    # Cara interna: la misma tela, más oscura (se ve por el cuello, las mangas y el ruedo)
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    dark = nt.nodes.new("ShaderNodeMix")
    dark.data_type = "RGBA"
    dark.blend_type = "MULTIPLY"
    dark.inputs["B"].default_value = (0.45, 0.45, 0.45, 1)
    nt.links.new(geo.outputs["Backfacing"], dark.inputs["Factor"])
    nt.links.new(color_out, dark.inputs["A"])
    nt.links.new(dark.outputs["Result"], bsdf.inputs["Base Color"])
    nt.links.new(knit_bump(nt, knit).outputs["Normal"], bsdf.inputs["Normal"])
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return m


def decal_material(name, path, embroidered=False, tint=(1, 1, 1, 1)):
    m, nt, out = node_tree(name)
    img = nt.nodes.new("ShaderNodeTexImage")
    img.image = bpy.data.images.load(path, check_existing=True)
    img.extension = "CLIP"
    img.interpolation = "Cubic"
    # Las UV de three tienen el origen abajo y el importador de glTF las da vuelta: se vuelven a invertir
    uv = nt.nodes.new("ShaderNodeTexCoord")
    flip = nt.nodes.new("ShaderNodeMapping")
    flip.inputs["Scale"].default_value = (1, -1, 1)
    flip.inputs["Location"].default_value = (0, 1, 0)
    nt.links.new(uv.outputs["UV"], flip.inputs["Vector"])
    nt.links.new(flip.outputs["Vector"], img.inputs["Vector"])
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Roughness"].default_value = 0.8 if embroidered else 0.42
    bsdf.inputs["Specular IOR Level"].default_value = 0.3 if embroidered else 0.5
    if embroidered:
        bsdf.inputs["Sheen Weight"].default_value = 0.8
    col = nt.nodes.new("ShaderNodeMix")
    col.data_type = "RGBA"
    col.blend_type = "MULTIPLY"
    col.inputs["Factor"].default_value = 1
    col.inputs["B"].default_value = tint
    nt.links.new(img.outputs["Color"], col.inputs["A"])
    nt.links.new(col.outputs["Result"], bsdf.inputs["Base Color"])
    nt.links.new(img.outputs["Alpha"], bsdf.inputs["Alpha"])
    # Relieve: el estampado se levanta en los bordes; el bordado lleva puntadas en diagonal.
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.6 if embroidered else 0.35
    bump.inputs["Distance"].default_value = 0.0006
    if embroidered:
        tc = nt.nodes.new("ShaderNodeTexCoord")
        wave = nt.nodes.new("ShaderNodeTexWave")
        wave.bands_direction = "DIAGONAL"
        wave.inputs["Scale"].default_value = 140
        nt.links.new(flip.outputs["Vector"], wave.inputs["Vector"])
        mul = nt.nodes.new("ShaderNodeMath")
        mul.operation = "MULTIPLY"
        nt.links.new(img.outputs["Alpha"], mul.inputs[0])
        nt.links.new(wave.outputs["Fac"], mul.inputs[1])
        nt.links.new(mul.outputs[0], bump.inputs["Height"])
    else:
        nt.links.new(img.outputs["Alpha"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return m


def plastic_material(name, color, roughness=0.4, coat=0.3):
    m, nt, out = node_tree(name)
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Base Color"].default_value = hex_rgba(color)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Coat Weight"].default_value = coat
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return m


def assign_materials(kit):
    c = COLORS[kit]
    mats = {
        "body": fabric_material("tela-cuerpo", kit, c["fabric"], PERIMETER["body"]),
        "sleeve": fabric_material("tela-manga", kit, c["fabric"], PERIMETER["sleeve"]),
        "collar": fabric_material("cuello", kit, c["fabric"], knit=0.5),
        "trim": fabric_material("ribete", kit, c["trim"], roughness=0.65),
        "trim2": fabric_material("ribete-2", kit, c["trim2"], roughness=0.65),
        "legs": fabric_material("short", kit, c["shorts"], sheen=0.7),
        "stripe": fabric_material("franja", kit, c["stripe"], roughness=0.65),
        "sock": fabric_material("media", kit, c["socks"], knit=0.6),
        "boot": plastic_material("botin", c["boots"]),
        "sole": plastic_material("suela", c["sole"], 0.6, 0),
    }
    for o in bpy.data.objects:
        if o.type != "MESH":
            continue
        n = o.name
        if n.startswith("decal-"):
            did = n[len("decal-") :]
            embroidered = did in ("escudo", "shortEscudo")
            tint = (1, 1, 1, 1) if embroidered or did == "parche" else PRINT_TINT[kit]
            mat = decal_material(n, os.path.join(TEX, f"{kit}-{did}.png"), embroidered, tint)
        elif n == "shirt-body":
            mat = mats["body"]
        elif n.startswith("shirt-sleeve"):
            mat = mats["sleeve"]
        elif n == "shirt-collar":
            mat = mats["collar"]
        elif n.startswith("shirt-cuffTrim2"):
            mat = mats["trim2"]
        elif n.startswith(("shirt-collarTrim", "shirt-cuffTrim")):
            mat = mats["trim"]
        elif n.startswith("shorts-leg"):
            mat = mats["legs"]
        elif n.startswith("shorts-stripe"):
            mat = mats["stripe"]
        elif n.startswith("socks"):
            mat = mats["sock"]
        elif n.endswith(("sole", "studs")):
            mat = mats["sole"]
        elif n.startswith("boots"):
            mat = mats["boot"]
        else:
            continue
        o.data.materials.clear()
        o.data.materials.append(mat)
        if n.startswith(("decal-", "shirt-collarTrim", "shirt-cuffTrim")):
            # La tela suavizada se infla un poco: calcos y ribetes van apenas por encima para que no la atraviese
            lift = o.modifiers.new("lift", "DISPLACE")
            lift.direction = "NORMAL"
            lift.mid_level = 0
            lift.strength = 0.0015 if n.startswith("decal-") else 0.0012
        else:
            sub = o.modifiers.new("smooth", "SUBSURF")
            sub.levels = sub.render_levels = 1


# ------------------------------------------------------------------------------- luz y cámara
def area_light(name, loc, target, energy, size, color=(1, 1, 1)):
    data = bpy.data.lights.new(name, "AREA")
    data.shape = "RECTANGLE"
    data.size, data.size_y = size
    data.energy = energy
    data.color = color
    o = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(o)
    o.location = loc
    direction = Vector(target) - Vector(loc)
    o.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    return o


def studio(center):
    world = bpy.data.worlds.new("estudio")
    bpy.context.scene.world = world
    world.use_nodes = True
    nt = world.node_tree
    bg = nt.nodes["Background"]
    env = nt.nodes.new("ShaderNodeTexEnvironment")
    env.image = bpy.data.images.load(STUDIO_HDRI)
    nt.links.new(env.outputs["Color"], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = 0.25
    cx, cy, cz = center
    # Softbox principal arriba a la izquierda, relleno suave a la derecha, dos contraluces que recortan la silueta
    area_light("key", (cx - 1.6, cy - 2.2, cz + 1.3), center, 170, (1.6, 1.2), (1.0, 0.97, 0.92))
    area_light("fill", (cx + 2.0, cy - 1.6, cz + 0.2), center, 55, (1.4, 1.4), (0.92, 0.96, 1.0))
    area_light("rimL", (cx - 1.4, cy + 1.6, cz + 0.6), center, 120, (0.5, 1.6))
    area_light("rimR", (cx + 1.4, cy + 1.6, cz + 0.6), center, 120, (0.5, 1.6))
    area_light("top", (cx, cy - 0.3, cz + 2.0), center, 80, (1.0, 1.0))


def frame_camera(view, res):
    targets = [o for o in bpy.data.objects if o.type == "MESH"]
    pts = [o.matrix_world @ Vector(c) for o in targets for c in o.bound_box]
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    center = (mn + mx) / 2
    cam_data = bpy.data.cameras.new("cam")
    cam_data.lens = 100
    cam_data.sensor_fit = "VERTICAL"
    cam = bpy.data.objects.new("cam", cam_data)
    bpy.context.collection.objects.link(cam)
    bpy.context.scene.camera = cam
    w, h = res
    # La prenda gira: el ancho que importa es la diagonal en planta
    half_h = (mx.z - mn.z) / 2 * 1.1
    half_w = math.hypot(mx.x - mn.x, mx.y - mn.y) / 2 * 1.02
    half = max(half_h, half_w * h / w)
    fov = 2 * math.atan(cam_data.sensor_height / 2 / cam_data.lens)
    dist = half / math.tan(fov / 2)
    cam.location = (center.x, center.y - dist, center.z + dist * 0.06)
    cam.rotation_euler = (Vector(center) - cam.location).to_track_quat("-Z", "Y").to_euler()
    return center


# ----------------------------------------------------------------------------------------- render
def setup_render(args):
    sc = bpy.context.scene
    w, h = (int(v) for v in args.res.split("x"))
    sc.render.resolution_x, sc.render.resolution_y = w, h
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"
    sc.view_settings.view_transform = "AgX"
    sc.view_settings.look = "AgX - Medium High Contrast"
    if args.preview:
        sc.render.engine = "BLENDER_WORKBENCH"
        sc.display.shading.light = "STUDIO"
        sc.display.shading.color_type = "MATERIAL"
        sc.display.shading.show_cavity = True
    else:
        sc.render.engine = "CYCLES"
        sc.cycles.device = "CPU"
        sc.cycles.samples = args.samples
        sc.cycles.use_adaptive_sampling = True
        sc.cycles.adaptive_threshold = 0.02
        sc.cycles.use_denoising = True
        sc.cycles.denoiser = "OPENIMAGEDENOISE"
        sc.cycles.max_bounces = 6
        sc.cycles.transparent_max_bounces = 16
    return w, h


def main():
    args = parse_args()
    args.out = os.path.join(ROOT, args.out)
    load_scene(args.view)
    simulate_shirt(args.sim_frames)
    assign_materials(args.kit)
    w, h = setup_render(args)
    center = frame_camera(args.view, (w, h))
    studio(center)

    # Todo gira alrededor de un eje vertical que pasa por el centro de la prenda
    pivot = bpy.data.objects.new("pivot", None)
    bpy.context.collection.objects.link(pivot)
    pivot.location = (center.x, center.y, 0)
    for o in bpy.data.objects:
        if o.type == "MESH":
            o.parent = pivot
            o.matrix_parent_inverse = pivot.matrix_world.inverted()

    if args.angles.isdigit() and int(args.angles) > 1 and "," not in args.angles:
        n = int(args.angles)
        angles = [360 * i / n for i in range(n)]
    else:
        angles = [float(a) for a in args.angles.split(",")]
    os.makedirs(args.out, exist_ok=True)
    if args.save_blend:
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(args.out, f"{args.kit}-{args.view}.blend"))
    for i, a in enumerate(angles):
        pivot.rotation_euler = (0, 0, math.radians(a))
        bpy.context.scene.render.filepath = os.path.join(args.out, f"{args.kit}-{args.view}-{i:03d}.png")
        bpy.ops.render.render(write_still=True)
        print(f"render {i + 1}/{len(angles)}: {a:.1f}°", flush=True)


if __name__ == "__main__":
    main()
