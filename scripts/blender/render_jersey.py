"""
Render realista de las camisetas sobre un modelo de prenda profesional (CLO3D / Marvelous Designer).

    blender -b --factory-startup --python scripts/blender/render_jersey.py -- --kit verde --angles 0,180

Modelo: "Maillot Olympique De Marseille" de marie.cruciani (Sketchfab, CC-BY 4.0), descomprimido en
.cache/blender/modelo-om/. Trae paneles cosidos con pliegues de simulación y pespuntes de verdad; acá se le
cambia la tela por la de Paisa FC (scripts/blender/paint_jersey.py) y se usa la luz de estudio de render_kit.py.
"""

import argparse
import math
import os
import sys

import bpy
from mathutils import Matrix

sys.path.insert(0, os.path.dirname(__file__))
import render_kit as rk  # noqa: E402

MODEL = os.path.join(rk.BASE, "modelo-om", "source", "MaillotOM.gltf")
PAINTED = os.path.join(rk.BASE, "jersey")
UNIT = 0.1  # el modelo está en decímetros

THREAD = {"verde": "#0b2412", "crema": "#d6cbad"}
KIT_FABRIC = {"verde": "#0c2814", "crema": "#e0d5b8"}  # el mismo de paint_jersey.py


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument("--kit", default="verde", choices=["verde", "crema"])
    p.add_argument("--angles", default="0", help="grados separados por coma, o a:b:n para n cuadros de a a b")
    p.add_argument("--out", default=os.path.join(".cache", "blender", "jersey-out"))
    p.add_argument("--res", default="900x1000")
    p.add_argument("--samples", type=int, default=128)
    p.add_argument("--save-blend", action="store_true")
    args = p.parse_args(argv)
    args.out = os.path.join(rk.ROOT, args.out)
    args.preview = False
    return args


def load_model():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=MODEL)
    for o in list(bpy.data.objects):
        if o.type != "MESH":
            continue
        # A metros y sin padres: la luz, la cámara y la trama de punto trabajan en escala real
        world = o.matrix_world.copy()
        o.parent = None
        o.matrix_world = Matrix.Scale(UNIT, 4) @ world
    for o in list(bpy.data.objects):
        if o.type == "EMPTY":
            bpy.data.objects.remove(o, do_unlink=True)
    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    for o in meshes:
        for poly in o.data.polygons:
            poly.use_smooth = True
    return meshes


def inner_color(kit):
    r, g, b, a = rk.hex_rgba(KIT_FABRIC[kit])
    return (r * 0.5, g * 0.5, b * 0.5, a)


def inner_material(kit):
    """La capa interna de la espalda (el modelo la trae duplicada: "7" es la de adentro, "7.001" la de afuera)."""
    m, nt, out = rk.node_tree(f"interior-{kit}")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Base Color"].default_value = inner_color(kit)
    bsdf.inputs["Roughness"].default_value = 0.85
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return m


def jersey_material(kit):
    """Tela pintada + máscara de estampados: el vinilo brilla más y se levanta; el bordado, mate y con puntadas."""
    m, nt, out = rk.node_tree(f"tela-{kit}")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    color = nt.nodes.new("ShaderNodeTexImage")
    color.image = bpy.data.images.load(os.path.join(PAINTED, f"{kit}-color.png"))
    color.interpolation = "Cubic"
    prints = nt.nodes.new("ShaderNodeTexImage")
    prints.image = bpy.data.images.load(os.path.join(PAINTED, f"{kit}-prints.png"))
    prints.image.colorspace_settings.name = "Non-Color"
    sep = nt.nodes.new("ShaderNodeSeparateColor")
    nt.links.new(prints.outputs["Color"], sep.inputs["Color"])
    vinyl, embroidery = sep.outputs["Red"], sep.outputs["Green"]

    # Cara interna: tela lisa y más oscura (sin los estampados, que si no se leen al revés por el cuello)
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    inside = nt.nodes.new("ShaderNodeMix")
    inside.data_type = "RGBA"
    inside.inputs["B"].default_value = inner_color(kit)
    nt.links.new(geo.outputs["Backfacing"], inside.inputs["Factor"])
    nt.links.new(color.outputs["Color"], inside.inputs["A"])
    nt.links.new(inside.outputs["Result"], bsdf.inputs["Base Color"])

    def lerp(factor, a, b):
        n = nt.nodes.new("ShaderNodeMapRange")
        n.inputs["To Min"].default_value = a
        n.inputs["To Max"].default_value = b
        nt.links.new(factor, n.inputs["Value"])
        return n.outputs["Result"]

    nt.links.new(lerp(vinyl, 0.82, 0.38), bsdf.inputs["Roughness"])
    nt.links.new(lerp(vinyl, 0.35, 0.6), bsdf.inputs["Specular IOR Level"])
    nt.links.new(lerp(vinyl, 0.65, 0.05), bsdf.inputs["Sheen Weight"])
    bsdf.inputs["Sheen Roughness"].default_value = 0.4

    # Relieve: punto de la tela en todo; encima, el vinilo y las puntadas del bordado
    knit = rk.knit_bump(nt, 0.22)
    raised = nt.nodes.new("ShaderNodeBump")
    raised.inputs["Strength"].default_value = 0.45
    raised.inputs["Distance"].default_value = 0.0005
    stitches = nt.nodes.new("ShaderNodeTexWave")
    stitches.bands_direction = "DIAGONAL"
    stitches.inputs["Scale"].default_value = 900
    uv = nt.nodes.new("ShaderNodeTexCoord")
    nt.links.new(uv.outputs["UV"], stitches.inputs["Vector"])
    emb = nt.nodes.new("ShaderNodeMath")
    emb.operation = "MULTIPLY"
    nt.links.new(embroidery, emb.inputs[0])
    nt.links.new(stitches.outputs["Fac"], emb.inputs[1])
    height = nt.nodes.new("ShaderNodeMath")
    height.operation = "ADD"
    nt.links.new(vinyl, height.inputs[0])
    nt.links.new(emb.outputs[0], height.inputs[1])
    nt.links.new(height.outputs[0], raised.inputs["Height"])
    nt.links.new(knit.outputs["Normal"], raised.inputs["Normal"])
    nt.links.new(raised.outputs["Normal"], bsdf.inputs["Normal"])
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return m


def thread_material(kit):
    m, nt, out = rk.node_tree(f"hilo-{kit}")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Base Color"].default_value = rk.hex_rgba(THREAD[kit])
    bsdf.inputs["Roughness"].default_value = 0.7
    bsdf.inputs["Sheen Weight"].default_value = 0.5
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return m


def main():
    args = parse_args()
    meshes = load_model()
    fabric, thread, inner = jersey_material(args.kit), thread_material(args.kit), inner_material(args.kit)
    for o in meshes:
        o.data.materials.clear()
        o.data.materials.append(thread if o.name.startswith("StitchMatShape") else inner if o.name == "7" else fabric)

    w, h = rk.setup_render(args)
    center = rk.frame_camera("shirt", (w, h))
    rk.studio(center)

    pivot = bpy.data.objects.new("pivot", None)
    bpy.context.collection.objects.link(pivot)
    pivot.location = (center.x, center.y, 0)
    for o in meshes:
        o.parent = pivot
        o.matrix_parent_inverse = pivot.matrix_world.inverted()

    if ":" in args.angles:
        a, b, n = args.angles.split(":")
        a, b, n = float(a), float(b), int(n)
        angles = [a + (b - a) * i / max(1, n - 1) for i in range(n)]
    else:
        angles = [float(x) for x in args.angles.split(",")]
    os.makedirs(args.out, exist_ok=True)
    if args.save_blend:
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(args.out, f"{args.kit}.blend"))
    for i, a in enumerate(angles):
        pivot.rotation_euler = (0, 0, math.radians(a))
        bpy.context.scene.render.filepath = os.path.join(args.out, f"{args.kit}-{i:03d}.png")
        bpy.ops.render.render(write_still=True)
        print(f"render {i + 1}/{len(angles)}: {a:.1f}°", flush=True)


main()
