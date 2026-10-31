"""
Recorta del mockup cada equipación completa (camiseta, short, medias y botines), de frente y de espalda.

    .venv/Scripts/python.exe scripts/prepare_full_kits.py

Usa las mismas herramientas que prepare_assets.py: ampliación Lanczos ×4 con nitidez y fondo quitado con
rembg (sin halo gris). Cada mitad del mockup se recorta entera y después se separa en frente y espalda por
piezas: cada pieza (camiseta con short, cada media con su botín) va del lado en que cae su centro.

Salida en public/assets/kits/completa/: <kit>-<frente|espalda>{.webp,-640.webp}.
"""

from __future__ import annotations

import cv2
import numpy as np
from PIL import Image
from rembg import new_session

from prepare_assets import ROOT, SCALE, SRC, cutout, upscale

OUT = ROOT / "public/assets/kits/completa"

# Mitades del mockup (1200×896): la suplente a la izquierda y la titular a la derecha. `mid` es la
# separación entre la figura de frente y la de espalda, en x del mockup.
HALVES = {
    "crema": {"box": (0, 40, 600, 896), "mid": 312},
    "verde": {"box": (600, 40, 1200, 896), "mid": 892},
}
SMALL = 640


def split(rgba: Image.Image, mid_px: int) -> tuple[Image.Image, Image.Image]:
    """Separa frente (izquierda) y espalda (derecha) por piezas enteras, sin cortar ninguna al medio."""
    arr = np.asarray(rgba).copy()
    solid = (arr[..., 3] > 24).astype(np.uint8)
    # Une lo que está muy cerca (el short pegado a la camiseta, el botín a la media)
    joined = cv2.dilate(solid, np.ones((9, 9), np.uint8))
    n, labels, stats, centroids = cv2.connectedComponentsWithStats(joined, 8)
    front = np.zeros(solid.shape, bool)
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] < 400:
            continue  # motas sueltas del recorte
        if centroids[i][0] < mid_px:
            front |= labels == i
    back_mask = (labels > 0) & ~front
    out = []
    for mask in (front, back_mask):
        part = arr.copy()
        part[..., 3] = np.where(mask, part[..., 3], 0)
        img = Image.fromarray(part, "RGBA")
        out.append(img.crop(img.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()))
    return out[0], out[1]


def save(img: Image.Image, name: str) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    img.save(OUT / f"{name}.webp", quality=88, method=6)
    img.resize((SMALL, round(img.height * SMALL / img.width)), Image.LANCZOS).save(OUT / f"{name}-{SMALL}.webp", quality=86, method=6)
    print(f"  {name}: {img.width}x{img.height}")


def main() -> None:
    mockup = Image.open(SRC / "camiseta-mockup.jpg").convert("RGB")
    session = new_session("isnet-general-use")
    for kit, cfg in HALVES.items():
        left = cfg["box"][0]
        big = upscale(mockup.crop(cfg["box"]), f"completa-{kit}", use_esrgan=False)
        rgba = cutout(big, session)
        front, back = split(rgba, (cfg["mid"] - left) * SCALE)
        save(front, f"{kit}-frente")
        save(back, f"{kit}-espalda")


if __name__ == "__main__":
    main()
