"""
Prepara los assets del sitio a partir de public/assets/source/.

  python scripts/prepare_assets.py            # ampliación Lanczos + nitidez
  python scripts/prepare_assets.py --esrgan   # ampliación con Real-ESRGAN (tools/esrgan)

Salida en public/assets/:
  kits/{titular,suplente}-{frente,espalda,short,medias}{.png,.webp,-640.webp}
  escudo/escudo{.png,.webp,-512.webp}
  favicon.ico, favicon-32.png, apple-touch-icon.png, og-image.jpg
y la paleta medida en src/styles/palette.css (tokens de Tailwind).

Los nombres titular/suplente reflejan la asignación inicial (verde = titular).
Si se invierte en src/data/kits.ts, las imágenes siguen siendo correctas porque
cada kit apunta a las fotos de su color.
"""

from __future__ import annotations

import argparse
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from rembg import new_session, remove

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public/assets/source"
OUT = ROOT / "public/assets"
CACHE = ROOT / ".cache/assets"
ESRGAN = ROOT / "tools/esrgan/realesrgan-ncnn-vulkan.exe"

SCALE = 4

# Coordenadas en el mockup original (1200x896).
# Cada columna camiseta+short se procesa junta y se separa en `cut` (ruedo de la camiseta).
COLUMNS = {
    "suplente-frente": {"box": (20, 55, 308, 605), "cut": 422, "short": "suplente-short", "short_from": 427},
    "suplente-espalda": {"box": (308, 55, 600, 605), "cut": 422, "short": None},
    "titular-frente": {"box": (605, 55, 875, 605), "cut": 424, "short": "titular-short", "short_from": 426},
    "titular-espalda": {"box": (898, 55, 1195, 605), "cut": 422, "short": None},
}
SOCKS = {
    "suplente-medias": (45, 620, 320, 878),
    "titular-medias": (630, 620, 910, 878),
}

# Paleta. La tela se mide sobre los recortes ya sin fondo (todo el cuerpo de la prenda);
# el percentil alto toma la tela iluminada y la mediana, la sombra.
FABRIC_SAMPLES = {
    "forest": ("titular-frente", 75),
    "forest-deep": ("titular-frente", 50),
    "cream": ("suplente-frente", 75),
    "cream-shade": ("suplente-frente", 50),
}
# Detalles chicos: zona del original + k-means, quedándose con el grupo más saturado.
DETAIL_SAMPLES = {
    "gold": ("mockup", (1010, 170, 1090, 280)),       # dorsal 11 de la titular
    "crest-gold": ("escudo", (440, 225, 470, 600)),   # borde del escudo
}


# ---------------------------------------------------------------- utilidades

def upscale(img: Image.Image, name: str, use_esrgan: bool) -> Image.Image:
    if use_esrgan:
        if not ESRGAN.exists():
            raise SystemExit(f"No encuentro {ESRGAN}. Descargá realesrgan-ncnn-vulkan en tools/esrgan/.")
        src, dst = CACHE / f"{name}-in.png", CACHE / f"{name}-x{SCALE}.png"
        img.save(src)
        subprocess.run([str(ESRGAN), "-i", str(src), "-o", str(dst), "-n", "realesrgan-x4plus"], check=True)
        return Image.open(dst).convert("RGB")
    big = img.resize((img.width * SCALE, img.height * SCALE), Image.LANCZOS)
    return big.filter(ImageFilter.UnsharpMask(radius=2.2, percent=70, threshold=2))


def estimate_background(rgb: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    """Color de fondo local: promedio difuso solo de los píxeles de fondo."""
    weight = (alpha < 0.02).astype(np.float32)
    w_img = Image.fromarray(np.uint8(weight * 255))
    blur = lambda im: np.asarray(im.filter(ImageFilter.GaussianBlur(24)), dtype=np.float32)
    num = blur(Image.fromarray(np.uint8(rgb * weight[..., None])))
    den = blur(w_img)[..., None] / 255.0
    bg = num / np.maximum(den, 1e-3)
    # Donde no hay fondo cerca, gris neutro del estudio.
    fallback = np.median(rgb[weight > 0], axis=0) if weight.any() else np.array([225, 225, 228])
    return np.where(den > 0.02, bg, fallback).astype(np.float32)


def cutout(rgb_img: Image.Image, session) -> Image.Image:
    """Quita el fondo y descontamina los bordes semitransparentes (sin halo gris)."""
    rgba = remove(rgb_img, session=session, post_process_mask=True)
    rgb = np.asarray(rgb_img, dtype=np.float32)
    a = np.asarray(rgba, dtype=np.float32)[..., 3] / 255.0
    # Bordes más firmes: se come ~1 px del contorno (donde vive el halo gris) y se suaviza.
    a_img = Image.fromarray(np.uint8(a * 255)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.7))
    a = np.clip((np.asarray(a_img, dtype=np.float32) / 255.0 - 0.04) / 0.92, 0, 1)
    bg = estimate_background(rgb, a)
    safe = np.maximum(a, 0.08)[..., None]
    fg = np.clip((rgb - (1 - safe) * bg) / safe, 0, 255)
    fg = np.where(a[..., None] > 0.98, rgb, fg)
    out = np.dstack([fg, a * 255]).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def mask_rows(img: Image.Image, start: int | None, end: int | None, feather: int = 3) -> Image.Image:
    """Deja visibles solo las filas [start, end) con un borde suave."""
    arr = np.asarray(img).copy()
    h = arr.shape[0]
    rows = np.arange(h, dtype=np.float32)
    keep = np.ones(h, dtype=np.float32)
    if start is not None:
        keep *= np.clip((rows - start) / feather + 0.5, 0, 1)
    if end is not None:
        keep *= np.clip((end - rows) / feather + 0.5, 0, 1)
    arr[..., 3] = (arr[..., 3] * keep[:, None]).astype(np.uint8)
    return Image.fromarray(arr, "RGBA")


def trim(img: Image.Image, pad: int = 8) -> Image.Image:
    box = img.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    if not box:
        return img
    l, t, r, b = box
    return img.crop((max(l - pad, 0), max(t - pad, 0), min(r + pad, img.width), min(b + pad, img.height)))


def export(img: Image.Image, folder: Path, name: str, small: int) -> None:
    folder.mkdir(parents=True, exist_ok=True)
    img.save(folder / f"{name}.png", optimize=True)
    img.save(folder / f"{name}.webp", quality=88, method=6)
    ratio = small / img.width
    if ratio < 1:
        img.resize((small, round(img.height * ratio)), Image.LANCZOS).save(
            folder / f"{name}-{small}.webp", quality=86, method=6
        )
    print(f"  {name}: {img.width}x{img.height}")


def kmeans_dominant(pixels: np.ndarray, k: int = 3, iters: int = 20) -> np.ndarray:
    rng = np.random.default_rng(7)
    centers = pixels[rng.choice(len(pixels), k, replace=False)]
    for _ in range(iters):
        labels = np.argmin(((pixels[:, None] - centers[None]) ** 2).sum(-1), axis=1)
        centers = np.array([pixels[labels == i].mean(0) if (labels == i).any() else centers[i] for i in range(k)])
    counts = np.bincount(labels, minlength=k)
    return centers, counts


# ---------------------------------------------------------------- pasos

def build_kits(use_esrgan: bool) -> None:
    mockup = Image.open(SRC / "camiseta-mockup.jpg").convert("RGB")
    session = new_session("isnet-general-use")
    folder = OUT / "kits"

    for name, cfg in COLUMNS.items():
        l, t, r, b = cfg["box"]
        big = upscale(mockup.crop(cfg["box"]), name, use_esrgan)
        rgba = cutout(big, session)
        cut = (cfg["cut"] - t) * SCALE
        export(trim(mask_rows(rgba, None, cut)), folder, name, 640)
        if cfg["short"]:
            # El short arranca debajo del ruedo para no arrastrar tela de la camiseta.
            short_from = (cfg["short_from"] - t) * SCALE
            export(trim(mask_rows(rgba, short_from, None)), folder, cfg["short"], 640)

    for name, box in SOCKS.items():
        big = upscale(mockup.crop(box), name, use_esrgan)
        export(trim(cutout(big, session)), folder, name, 640)


def build_crest(use_esrgan: bool) -> Image.Image:
    src = Image.open(SRC / "escudo.jpeg").convert("RGB")
    session = new_session("isnet-general-use")
    rgba = trim(cutout(src, session), pad=4)
    if use_esrgan:
        rgb = upscale(rgba.convert("RGB"), "escudo", True)
        a = rgba.getchannel("A").resize(rgb.size, Image.LANCZOS)
        rgba = rgb.convert("RGBA")
        rgba.putalpha(a)
    folder = OUT / "escudo"
    export(rgba, folder, "escudo", 512)
    return rgba


def build_icons(crest: Image.Image) -> None:
    square = Image.new("RGBA", (max(crest.size),) * 2, (0, 0, 0, 0))
    square.alpha_composite(crest, ((square.width - crest.width) // 2, (square.height - crest.height) // 2))
    square.resize((32, 32), Image.LANCZOS).save(OUT / "favicon-32.png")
    square.save(OUT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    touch = Image.new("RGBA", (180, 180), (22, 58, 36, 255))
    icon = square.resize((150, 150), Image.LANCZOS)
    touch.alpha_composite(icon, (15, 15))
    touch.convert("RGB").save(OUT / "apple-touch-icon.png")


def build_og(crest: Image.Image, forest: tuple[int, int, int]) -> None:
    W, H = 1200, 630
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    glow = np.exp(-(((xx - 330) / 520) ** 2 + ((yy - 300) / 380) ** 2))
    base = np.array(forest, np.float32) * 0.55
    light = np.array(forest, np.float32) * 1.05
    bg = base + (light - base) * glow[..., None]
    og = Image.fromarray(np.uint8(np.clip(bg, 0, 255))).convert("RGBA")

    c = crest.copy()
    c.thumbnail((440, 540), Image.LANCZOS)
    og.alpha_composite(c, (330 - c.width // 2, (H - c.height) // 2))

    kits = OUT / "kits"
    for i, name in enumerate(["suplente-frente", "titular-frente"]):
        shirt = Image.open(kits / f"{name}.png").convert("RGBA")
        shirt.thumbnail((330, 420), Image.LANCZOS)
        x = 640 + i * 250
        y = (H - shirt.height) // 2 + (20 if i == 0 else -10)
        og.alpha_composite(shirt, (x, y))
    og.convert("RGB").save(OUT / "og-image.jpg", quality=88)
    print("  og-image: 1200x630")


def build_sponsor_marks() -> None:
    """Letra de Tom's Burger tomada de la espalda crema, como máscara (blanco + alfa)
    para poder pintarla de cualquier color con CSS. TODO: reemplazar por el logo oficial."""
    mockup = Image.open(SRC / "camiseta-mockup.jpg").convert("RGB")
    crop = mockup.crop((385, 300, 525, 380))
    big = crop.resize((crop.width * SCALE, crop.height * SCALE), Image.LANCZOS)
    lum = np.asarray(big.convert("L"), dtype=np.float32)
    alpha = np.clip((150 - lum) / (150 - 80), 0, 1)  # los pliegues de la tela quedan afuera
    a_img = Image.fromarray(np.uint8(alpha * 255)).filter(ImageFilter.GaussianBlur(0.6))
    mark = Image.new("RGBA", big.size, (255, 255, 255, 255))
    mark.putalpha(a_img)
    folder = OUT / "sponsors"
    folder.mkdir(parents=True, exist_ok=True)
    trim(mark, pad=6).save(folder / "toms-burger.png", optimize=True)
    print("  toms-burger.png")


def build_palette() -> dict[str, str]:
    hexa = lambda c: "#{:02x}{:02x}{:02x}".format(*np.round(c).astype(int))
    palette = {}
    for token, (piece, q) in FABRIC_SAMPLES.items():
        arr = np.asarray(Image.open(OUT / "kits" / f"{piece}.png"), dtype=np.float32)
        px = arr[arr[..., 3] > 250][:, :3]
        lum = px.mean(1)
        # Solo tela: afuera logos, números y ribetes.
        px = px[lum > 150] if piece.startswith("suplente") else px[(lum < 110) & (px[:, 1] > px[:, 0])]
        palette[token] = hexa(np.percentile(px, q, axis=0))

    images = {
        "mockup": np.asarray(Image.open(SRC / "camiseta-mockup.jpg").convert("RGB"), dtype=np.float32),
        "escudo": np.asarray(Image.open(SRC / "escudo.jpeg").convert("RGB"), dtype=np.float32),
    }
    for token, (img_name, (l, t, r, b)) in DETAIL_SAMPLES.items():
        centers, _ = kmeans_dominant(images[img_name][t:b, l:r].reshape(-1, 3))
        sat = centers.max(1) - centers.min(1)
        palette[token] = hexa(centers[int(np.argmax(sat + centers.mean(1) * 0.2))])

    lines = [
        "/* Generado por scripts/prepare_assets.py: colores medidos en las imágenes originales. No editar a mano. */",
        "@theme {",
        *[f"  --color-{k}: {v};" for k, v in palette.items()],
        "}",
        "",
    ]
    out = ROOT / "src/styles/palette.css"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(lines), encoding="utf-8")
    for k, v in palette.items():
        print(f"  {k}: {v}")
    return palette


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--esrgan", action="store_true", help="ampliar con Real-ESRGAN en vez de Lanczos")
    args = parser.parse_args()
    CACHE.mkdir(parents=True, exist_ok=True)

    print("Kits")
    build_kits(args.esrgan)
    print("Paleta")
    palette = build_palette()
    print("Escudo")
    crest = build_crest(args.esrgan)
    build_icons(crest)
    forest = tuple(int(palette["forest"][i : i + 2], 16) for i in (1, 3, 5))
    build_og(crest, forest)
    print("Sponsors")
    build_sponsor_marks()


if __name__ == "__main__":
    main()
