#!/usr/bin/env python3
"""Turn the raw files in resources/ into web-ready WebP under public/.

  resources/illustrations/*.png   cut-outs with a transparent background
      -> stray slivers left over from cropping are removed, the empty margin is trimmed, max 560 px
      -> public/illustrations/<name>.webp

  resources/icons/<set>/*.png     small icons (64 px) cut from a sheet
      -> only the ones listed in ICONS below, with slivers of neighbouring icons removed
      -> public/icons/ui/<usage-name>.webp  (named by what they are used for)

  resources/backgrounds/*          full scenes with an empty middle, shown behind a form or a call to action;
                                   a transparent (faded) middle is kept
      -> public/backgrounds/<name>.webp (max 1600 px wide) and <name>-800.webp for phones

  resources/photos/*.jpg|png|webp  real photos
      -> rotated upright, EXIF removed, longest side capped at 1600 px
      -> public/photos/<name>.webp

<name> is the file name without a leading number and in kebab-case:
"01_setup_store.png" becomes "setup-store".

Needs Pillow and numpy:  pip install pillow numpy
Run from web/:           python3 scripts/prepare-resources.py
"""
from __future__ import annotations

import re
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
PHOTO_MAX = 1600
ILLUSTRATION_MAX = 560  # shown at up to ~280 CSS px, so this stays sharp on 2x screens
ALPHA_MIN = 16  # alpha above this counts as "ink"
CELL = 4  # components are found on a grid 4x coarser than the image
PAD = 16  # transparent margin kept around the trimmed illustration

# Icons the app uses: public name -> "<set folder>/<file>" in resources/icons. Add a line to use another one.
ICONS: dict[str, str] = {}
# The navigation icons come on one generated sheet, a 4 x 4 grid, read row by row.
NAV_SHEET = "icons/nav_sheet.png"
NAV_ICONS = [
    "today", "bookings", "calendar", "pets",
    "customers", "payments", "invoices", "reports",
    "tax", "cages", "settings", "help",
    "more", "website", "logout", "new-booking",
]
# A second, smaller sheet for pages added later: (file, columns, names in reading order).
NAV_SHEETS = [
    (NAV_SHEET, 4, NAV_ICONS),
    ("icons/nav_sheet_2.png", 2, ["dashboard", "link", "transactions", "upgrade"]),
]
NAV_SIZE = 96  # shown at 24 to 28 CSS px

# Corners cut from a background, shown at a fixed size instead of stretching the whole scene over a section:
# public name -> (source slug, (left, top, right, bottom), fade in px on (left, top, right) edges).
CORNERS = {
    "faq-dog": ("faq-scene", (0, 400, 560, 941), (0, 90, 200)),
    "faq-cat": ("faq-scene", (1240, 360, 1672, 941), (140, 90, 0)),
}
ICON_PAD = 2
ICON_CROPS: dict[str, tuple[int, int, int, int]] = {}  # name -> keep only this box of the tile (left, top, right, bottom)


def slug(path: Path) -> str:
    name = re.sub(r"^\d+[\s._-]*", "", path.stem)
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or path.stem.lower()


def components(mask: np.ndarray, cell: int = CELL) -> list[dict]:
    """Connected blobs of ink, found on a coarse grid so near-touching strokes stay together."""
    small = mask[::cell, ::cell]
    h, w = small.shape
    label = np.zeros((h, w), dtype=np.int32)
    found: list[dict] = []
    for y in range(h):
        for x in range(w):
            if not small[y, x] or label[y, x]:
                continue
            idx = len(found) + 1
            label[y, x] = idx
            queue, cells = deque([(y, x)]), []
            while queue:
                cy, cx = queue.popleft()
                cells.append((cy, cx))
                for dy in range(-2, 3):
                    for dx in range(-2, 3):
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < h and 0 <= nx < w and small[ny, nx] and not label[ny, nx]:
                            label[ny, nx] = idx
                            queue.append((ny, nx))
            found.append({"id": idx, "cells": len(cells)})
    for c in found:
        c["label"] = label
    return found


def clean_cutout(img: Image.Image, cell: int = CELL) -> Image.Image:
    """Drop slivers that were cut off by a crop: small blobs with a flat edge on the image's outer border."""
    rgba = np.array(img.convert("RGBA"))
    mask = rgba[:, :, 3] > ALPHA_MIN
    if not mask.any():
        return img
    comps = components(mask, cell)
    if len(comps) < 2:
        return img
    label = comps[0]["label"]
    full = np.kron(label, np.ones((cell, cell), dtype=np.int32))[: mask.shape[0], : mask.shape[1]]
    full[~mask] = 0
    ys, xs = np.where(mask)
    box = (xs.min(), ys.min(), xs.max(), ys.max())
    main = max(comps, key=lambda c: c["cells"])["id"]
    removed = 0
    for c in comps:
        if c["id"] == main:
            continue
        blob = full == c["id"]
        by, bx = np.where(blob)
        if bx.size == 0:
            continue
        x0, y0, x1, y1 = bx.min(), by.min(), bx.max(), by.max()
        flat = False
        tol = cell + 1
        # A flat run of ink along a side that sits on the outer border means a crop line, not a drawn shape.
        if y0 <= box[1] + tol and blob[y0 : y0 + 2].any(axis=0).sum() >= 0.5 * (x1 - x0 + 1):
            flat = True
        if y1 >= box[3] - tol and blob[max(y1 - 1, 0) : y1 + 1].any(axis=0).sum() >= 0.5 * (x1 - x0 + 1):
            flat = True
        if x0 <= box[0] + tol and blob[:, x0 : x0 + 2].any(axis=1).sum() >= 0.5 * (y1 - y0 + 1):
            flat = True
        if x1 >= box[2] - tol and blob[:, max(x1 - 1, 0) : x1 + 1].any(axis=1).sum() >= 0.5 * (y1 - y0 + 1):
            flat = True
        if flat:
            # include the soft edge around the blob
            grown = np.array(Image.fromarray((blob * 255).astype(np.uint8)).resize(blob.shape[::-1]).filter(
                __import__("PIL.ImageFilter", fromlist=["MaxFilter"]).MaxFilter(2 * cell + 1)))
            rgba[grown > 0, 3] = 0
            removed += 1
    out = Image.fromarray(rgba)
    out.info["removed"] = removed
    return out


def trim(img: Image.Image, pad: int = PAD) -> Image.Image:
    bbox = img.getchannel("A").point(lambda v: 255 if v > ALPHA_MIN else 0).getbbox()
    if not bbox:
        return img
    l, t, r, b = bbox
    return img.crop((max(l - pad, 0), max(t - pad, 0), min(r + pad, img.width), min(b + pad, img.height)))


def save_webp(img: Image.Image, path: Path, quality: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "WEBP", quality=quality, method=6)
    print(f"  {path.relative_to(ROOT)}  {img.width}x{img.height}  {path.stat().st_size // 1024} KB")


def screens() -> None:
    """PNG captures from scripts/capture-features.mjs -> WebP sized for the landing page; the PNG is removed."""
    for src in sorted((ROOT / "public" / "screens").glob("*.png")):
        shot = Image.open(src).convert("RGB")
        shot.thumbnail((520 if "-phone-" in src.name else 640, 4000), Image.LANCZOS)
        print(f"{src.name}:")
        save_webp(shot, src.with_suffix(".webp"), 82)
        src.unlink()


def main() -> None:
    if sys.argv[1:] == ["--screens"]:
        screens()
        return
    only = set(sys.argv[1:])
    for src in sorted((ROOT / "resources" / "illustrations").glob("*.png")):
        if only and slug(src) not in only:
            continue
        cleaned = clean_cutout(Image.open(src))
        print(f"{src.name}: removed {cleaned.info.get('removed', 0)} stray piece(s)")
        art = trim(cleaned)
        art.thumbnail((ILLUSTRATION_MAX, ILLUSTRATION_MAX), Image.LANCZOS)
        save_webp(art, ROOT / "public" / "illustrations" / f"{slug(src)}.webp", 82)
    for name, ref in ICONS.items():
        if only and name not in only:
            continue
        src = ROOT / "resources" / "icons" / f"{ref}.png"
        source = Image.open(src)
        if name in ICON_CROPS:
            source = source.crop(ICON_CROPS[name])
        cleaned = clean_cutout(source, cell=1)
        print(f"{src.name}: removed {cleaned.info.get('removed', 0)} stray piece(s)")
        icon = trim(cleaned, ICON_PAD)
        side = max(icon.size)  # square canvas, so every icon takes the same box
        canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
        canvas.paste(icon, ((side - icon.width) // 2, (side - icon.height) // 2))
        save_webp(canvas, ROOT / "public" / "icons" / "ui" / f"{name}.webp", 92)
    for src in sorted((ROOT / "resources" / "backgrounds").glob("*")):
        if src.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"} or (only and slug(src) not in only):
            continue
        if slug(src) in {source for source, _, _ in CORNERS.values()}:
            continue  # only its corners are used
        scene = Image.open(src)
        # A scene that fades out (an alpha channel) keeps it, so the page shows through the faded part.
        scene = scene.convert("RGBA" if "A" in scene.getbands() else "RGB")
        print(f"{src.name}:")
        for width, suffix in ((PHOTO_MAX, ""), (800, "-800")):
            copy = scene.copy()
            copy.thumbnail((width, width), Image.LANCZOS)
            save_webp(copy, ROOT / "public" / "backgrounds" / f"{slug(src)}{suffix}.webp", 80)
    for name, (source_slug, box, (fade_l, fade_t, fade_r)) in CORNERS.items():
        if only and name not in only:
            continue
        src = next(p for p in (ROOT / "resources" / "backgrounds").glob("*") if slug(p) == source_slug)
        corner = Image.open(src).convert("RGBA").crop(box)
        alpha = np.asarray(corner.getchannel("A")).astype(float)
        h, w = alpha.shape
        ramp = np.ones((h, w))
        if fade_l:
            ramp *= np.clip(np.arange(w) / fade_l, 0, 1)[None, :]
        if fade_r:
            ramp *= np.clip((w - 1 - np.arange(w)) / fade_r, 0, 1)[None, :]
        if fade_t:
            ramp *= np.clip(np.arange(h) / fade_t, 0, 1)[:, None]
        corner.putalpha(Image.fromarray((alpha * ramp).astype(np.uint8)))
        print(f"{name}:")
        save_webp(corner, ROOT / "public" / "backgrounds" / f"{name}.webp", 85)
    for sheet_file, columns, names in NAV_SHEETS:
        sheet_path = ROOT / "resources" / sheet_file
        if not sheet_path.exists() or (only and "nav" not in only):
            continue
        sheet = Image.open(sheet_path).convert("RGBA")
        cell = sheet.width // columns
        for i, name in enumerate(names):
            tile = sheet.crop(((i % columns) * cell, (i // columns) * cell, (i % columns + 1) * cell, (i // columns + 1) * cell))
            icon = trim(clean_cutout(tile), ICON_PAD)
            side = max(icon.size)
            square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
            square.paste(icon, ((side - icon.width) // 2, (side - icon.height) // 2))
            square = square.resize((NAV_SIZE, NAV_SIZE), Image.LANCZOS)
            save_webp(square, ROOT / "public" / "icons" / "nav" / f"{name}.webp", 90)
    for src in sorted((ROOT / "resources" / "photos").glob("*")):
        if src.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
            continue
        if only and slug(src) not in only:
            continue
        photo = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
        photo.thumbnail((PHOTO_MAX, PHOTO_MAX), Image.LANCZOS)
        print(f"{src.name}:")
        save_webp(photo, ROOT / "public" / "photos" / f"{slug(src)}.webp", 82)


if __name__ == "__main__":
    main()
