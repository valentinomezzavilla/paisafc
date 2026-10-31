"""
Pinta los diseños de Paisa FC sobre el molde (UV) de la camiseta de Sketchfab.

    .venv/Scripts/python.exe scripts/blender/paint_jersey.py

Entrada: el mapa de color original del modelo (solo para saber dónde está cada panel y dónde llevaba los
ribetes) y los diseños de .cache/blender/tex/ (scripts/blender/export-textures.mjs).
Salida, por kit, en .cache/blender/jersey/: <kit>-color.png (tela, trama, ribetes y estampados) y
<kit>-prints.png (R: vinilo, G: bordado; los usa el material para el brillo y el relieve).

Modelo: "Maillot Olympique De Marseille" de marie.cruciani (Sketchfab, CC-BY 4.0). Medidas en píxeles de la
textura de 4096 (≈19 px por cm de tela), tomadas del molde con scripts de inspección en Blender.
"""

import os

import cv2
import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SRC = os.path.join(ROOT, ".cache", "blender", "modelo-om", "source", "MaillotOM_diffuse_1001.png")
TEX = os.path.join(ROOT, ".cache", "blender", "tex")
OUT = os.path.join(ROOT, ".cache", "blender", "jersey")
SIZE = 4096
PX_PER_CM = 19.0

# Paneles del molde: (x0, y0, x1, y1) en px. El frente se ve como de frente; la espalda, como de atrás.
FRONT = (871, 2679, 1983, 4021)
BACK = (3060, 2654, 4044, 4044)
SLEEVE_R = (53, 3003, 839, 3437)  # manga derecha del jugador (la del parche); su frente queda a la derecha
SLEEVE_L = (2166, 3003, 2952, 3437)
COLLAR = (1001, 2496, 1880, 2624)
COLLAR_BAND = (1004, 2641, 1882, 2673)
PLACKET = (1355, 2868, 1500, 2945)  # triángulo de la abertura en V
LABELS = [(275, 3889, 576, 3949), (61, 3970, 381, 4035)]  # etiquetas del cuello por dentro: quedan como están

FRONT_CX = 1427  # centro del pecho
BACK_CX = 3552
FRONT_TOP, BACK_TOP = 2688, 2663  # hombros
FRONT_LEN, BACK_LEN = 1323, 1372  # de hombro a ruedo

# Colores (sRGB). Mismos que scripts/blender/render_kit.py; los estampados, ya con el tinte del render.
KITS = {
    "verde": dict(fabric="#0c2814", trim="#b8963f", trim2="#b8963f", print="#cfae62", outline="#7d6431", pattern=0.55),
    "crema": dict(fabric="#e0d5b8", trim="#1c3f28", trim2="#b8963f", print="#123320", outline="#b8963f", pattern=0.8),
}
TEX_FABRIC = {"verde": "#1d4a2a", "crema": "#e2d9c0"}  # fondo con el que el sitio dibujó la trama
TOPO_TILE_M = (0.9, 0.56)
ARGYLE_TILE_M = 0.035


def rgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i : i + 2], 16) for i in (0, 2, 4)], np.float32) / 255


def load_rgba(path):
    return np.asarray(Image.open(path).convert("RGBA"), np.float32) / 255


def panel_mask(src_alpha, box):
    x0, y0, x1, y1 = box
    m = np.zeros(src_alpha.shape, bool)
    m[y0:y1, x0:x1] = src_alpha[y0:y1, x0:x1] > 0
    return m


def tiled_pattern(kit):
    """La trama del kit (solo el dibujo: 1 = tela lisa) repetida por toda la textura a escala real."""
    tex = load_rgba(os.path.join(TEX, f"{kit}-fabric.png"))[..., :3]
    ratio = tex / rgb(TEX_FABRIC[kit])
    if kit == "verde":
        w, h = (round(TOPO_TILE_M[0] * 100 * PX_PER_CM), round(TOPO_TILE_M[1] * 100 * PX_PER_CM))
        tile = cv2.resize(ratio, (w, h), interpolation=cv2.INTER_AREA)
        # Repetición en espejo: las curvas siguen de una baldosa a la otra
        tile = np.concatenate([tile, tile[:, ::-1]], axis=1)
        tile = np.concatenate([tile, tile[::-1]], axis=0)
    else:
        side = round(ARGYLE_TILE_M * 100 * PX_PER_CM)
        tile = cv2.resize(ratio, (side, side), interpolation=cv2.INTER_AREA)
    reps = (SIZE // tile.shape[0] + 1, SIZE // tile.shape[1] + 1, 1)
    return np.tile(tile, reps)[:SIZE, :SIZE]


def place(canvas, prints, img, cx, cy, size_cm, channel, color=None, outline=None, outline_px=0):
    """Pega un diseño centrado en (cx, cy) con su tamaño real. Si hay `color`, se usa solo su forma (alfa)."""
    w = round(size_cm[0] * PX_PER_CM)
    h = round(size_cm[1] * PX_PER_CM)
    # El diseño entra en la caja sin deformarse
    ih, iw = img.shape[:2]
    k = min(w / iw, h / ih)
    w, h = max(1, round(iw * k)), max(1, round(ih * k))
    art = cv2.resize(img, (w, h), interpolation=cv2.INTER_AREA)
    x0, y0 = round(cx - w / 2), round(cy - h / 2)
    alpha = art[..., 3:4]
    if outline is not None and outline_px:
        pad = outline_px + 2
        a = np.pad(alpha[..., 0], pad)
        ring = cv2.dilate(a, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * outline_px + 1,) * 2))
        ring = cv2.GaussianBlur(ring, (3, 3), 0)[..., None]
        ys, xs = slice(y0 - pad, y0 - pad + ring.shape[0]), slice(x0 - pad, x0 - pad + ring.shape[1])
        canvas[ys, xs] = canvas[ys, xs] * (1 - ring) + rgb(outline) * ring
        prints[ys, xs, channel] = np.maximum(prints[ys, xs, channel], ring[..., 0])
    fill = np.broadcast_to(rgb(color), art[..., :3].shape) if color else art[..., :3]
    ys, xs = slice(y0, y0 + h), slice(x0, x0 + w)
    canvas[ys, xs] = canvas[ys, xs] * (1 - alpha) + fill * alpha
    prints[ys, xs, channel] = np.maximum(prints[ys, xs, channel], alpha[..., 0])


def stripe(canvas, mask, box, y_from_bottom_cm, height_cm, color):
    """Franja horizontal en un panel, medida desde su borde de abajo (el puño)."""
    x0, _, x1, y1 = box
    top = round(y1 - (y_from_bottom_cm + height_cm) * PX_PER_CM)
    bot = round(y1 - y_from_bottom_cm * PX_PER_CM)
    region = np.zeros(mask.shape, bool)
    region[top:bot, x0:x1] = True
    canvas[region & mask] = rgb(color)


def paint(kit):
    c = KITS[kit]
    src = load_rgba(SRC)
    alpha = src[..., 3]
    # Fondo: el color de la tela en toda la textura, así los bordes de los paneles no se oscurecen al filtrar
    canvas = np.empty((SIZE, SIZE, 3), np.float32)
    canvas[:] = rgb(c["fabric"])
    pattern = 1 + (tiled_pattern(kit) - 1) * c["pattern"]
    canvas *= pattern
    prints = np.zeros((SIZE, SIZE, 3), np.float32)

    # Cuello y triángulo de la V: donde el original llevaba color (los ribetes celestes), va el ribete del kit
    src_rgb = src[..., :3]
    accent = (src_rgb.max(-1) - src_rgb.min(-1)) > 0.25
    for box in (COLLAR, COLLAR_BAND):
        m = panel_mask(alpha, box)
        canvas[m] = rgb(c["fabric"])
        canvas[m & accent] = rgb(c["trim"])
    canvas[panel_mask(alpha, PLACKET)] = rgb(c["fabric"])

    # Puños: dos franjas cerca del borde, como en el mockup (la suplente alterna verde y dorado)
    for box in (SLEEVE_R, SLEEVE_L):
        m = panel_mask(alpha, box)
        stripe(canvas, m, box, 1.2, 0.7, c["trim"])
        stripe(canvas, m, box, 2.5, 0.7, c["trim2"])

    art = {name: load_rgba(os.path.join(TEX, f"{kit}-{name}.png")) for name in ("escudo", "vezza", "parche", "nombre", "numero", "sponsor")}
    # Frente: escudo en el pecho izquierdo del jugador (a la derecha en la textura) y VEZZA centrado, grande
    place(canvas, prints, art["escudo"], FRONT_CX + 11.5 * PX_PER_CM, 2975, (8.6, 9.75), channel=1)
    place(canvas, prints, art["vezza"], FRONT_CX, FRONT_TOP + 0.41 * FRONT_LEN, (17.8, 19.0), channel=0, color=c["print"])
    # Espalda: nombre, número con contorno y sponsor
    place(canvas, prints, art["nombre"], BACK_CX, BACK_TOP + 0.13 * BACK_LEN, (31.0, 5.2), channel=0, color=c["print"])
    place(canvas, prints, art["numero"], BACK_CX, BACK_TOP + 0.36 * BACK_LEN, (15.8, 23.4), channel=0, color=c["print"], outline=c["outline"], outline_px=8)
    place(canvas, prints, art["sponsor"], BACK_CX, BACK_TOP + 0.72 * BACK_LEN, (23.3, 12.6), channel=0, color=c["print"])
    # Parche: cara de afuera de la manga derecha, hacia el frente
    place(canvas, prints, art["parche"], 585, 3190, (10.0, 10.0), channel=1)

    # Etiquetas interiores: como vienen
    for x0, y0, x1, y1 in LABELS:
        m = panel_mask(alpha, (x0, y0, x1, y1))
        canvas[m] = src_rgb[m]

    os.makedirs(OUT, exist_ok=True)
    Image.fromarray((np.clip(canvas, 0, 1) * 255).astype(np.uint8)).save(os.path.join(OUT, f"{kit}-color.png"))
    Image.fromarray((np.clip(prints, 0, 1) * 255).astype(np.uint8)).save(os.path.join(OUT, f"{kit}-prints.png"))
    print(kit, "listo")


for k in KITS:
    paint(k)
