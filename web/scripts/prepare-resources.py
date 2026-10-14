#!/usr/bin/env python3
"""Turn the raw files in resources/ into web-ready WebP under public/.

  resources/illustrations/*.png   cut-outs with a transparent background
      -> stray slivers left over from cropping are removed, the empty margin is trimmed
      -> public/illustrations/<name>.webp

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
ALPHA_MIN = 16  # alpha above this counts as "ink"
CELL = 4  # components are found on a grid 4x coarser than the image
PAD = 16  # transparent margin kept around the trimmed illustration


def slug(path: Path) -> str:
    name = re.sub(r"^\d+[\s._-]*", "", path.stem)
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or path.stem.lower()


def components(mask: np.ndarray) -> list[dict]:
    """Connected blobs of ink, found on a coarse grid so near-touching strokes stay together."""
    small = mask[::CELL, ::CELL]
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


def clean_cutout(img: Image.Image) -> Image.Image:
    """Drop slivers that were cut off by a crop: small blobs with a flat edge on the image's outer border."""
    rgba = np.array(img.convert("RGBA"))
    mask = rgba[:, :, 3] > ALPHA_MIN
    if not mask.any():
        return img
    comps = components(mask)
    if len(comps) < 2:
        return img
    label = comps[0]["label"]
    full = np.kron(label, np.ones((CELL, CELL), dtype=np.int32))[: mask.shape[0], : mask.shape[1]]
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
        tol = CELL + 1
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
                __import__("PIL.ImageFilter", fromlist=["MaxFilter"]).MaxFilter(2 * CELL + 1)))
            rgba[grown > 0, 3] = 0
            removed += 1
    out = Image.fromarray(rgba)
    out.info["removed"] = removed
    return out


def trim(img: Image.Image) -> Image.Image:
    bbox = img.getchannel("A").point(lambda v: 255 if v > ALPHA_MIN else 0).getbbox()
    if not bbox:
        return img
    l, t, r, b = bbox
    return img.crop((max(l - PAD, 0), max(t - PAD, 0), min(r + PAD, img.width), min(b + PAD, img.height)))


def save_webp(img: Image.Image, path: Path, quality: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "WEBP", quality=quality, method=6)
    print(f"  {path.relative_to(ROOT)}  {img.width}x{img.height}  {path.stat().st_size // 1024} KB")


def main() -> None:
    only = set(sys.argv[1:])
    for src in sorted((ROOT / "resources" / "illustrations").glob("*.png")):
        if only and slug(src) not in only:
            continue
        cleaned = clean_cutout(Image.open(src))
        print(f"{src.name}: removed {cleaned.info.get('removed', 0)} stray piece(s)")
        save_webp(trim(cleaned), ROOT / "public" / "illustrations" / f"{slug(src)}.webp", 90)
    for src in sorted((ROOT / "resources" / "photos").iterdir()):
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
