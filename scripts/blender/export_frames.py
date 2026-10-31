"""
Pasa los renders de la vuelta (.cache/blender/turntable/<kit>-NNN.png) a WebP para el sitio.

    .venv/Scripts/python.exe scripts/blender/export_frames.py

Salida: public/assets/kits/blender/<kit>/NN.webp (900×1000) y NN-640.webp, con transparencia.
"""

import glob
import os
import re

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SRC = os.path.join(ROOT, ".cache", "blender", "turntable")
OUT = os.path.join(ROOT, "public", "assets", "kits", "blender")
SMALL_WIDTH = 640
QUALITY = 82

total = 0
for path in sorted(glob.glob(os.path.join(SRC, "*-[0-9][0-9][0-9].png"))):
    kit, n = re.match(r"(\w+)-(\d+)\.png$", os.path.basename(path)).groups()
    im = Image.open(path).convert("RGBA")
    os.makedirs(os.path.join(OUT, kit), exist_ok=True)
    big = os.path.join(OUT, kit, f"{int(n):02d}.webp")
    small = os.path.join(OUT, kit, f"{int(n):02d}-640.webp")
    im.save(big, "WEBP", quality=QUALITY, method=6, alpha_quality=90)
    im.resize((SMALL_WIDTH, round(im.height * SMALL_WIDTH / im.width)), Image.LANCZOS).save(small, "WEBP", quality=QUALITY, method=6, alpha_quality=90)
    total += os.path.getsize(big) + os.path.getsize(small)
    print(kit, n, f"{os.path.getsize(big) // 1024} KB / {os.path.getsize(small) // 1024} KB")
print(f"total: {total / 1024 / 1024:.1f} MB")
