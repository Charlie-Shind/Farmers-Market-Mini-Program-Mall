#!/usr/bin/env python3
"""Compress miniprogram static images to reduce upload package size."""
from __future__ import annotations

import os
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / "miniprogram"
MAX_WIDTH = 750
JPEG_QUALITY = 72
PNG_TO_JPEG = {
    "assets/images/gift/gift-hero.png": "assets/images/gift/gift-hero.jpg",
    "assets/images/flash/flash-hero.png": "assets/images/flash/flash-hero.jpg",
    "assets/images/leader/leader-header-bg.png": "assets/images/leader/leader-header-bg.jpg",
    "assets/images/Gemini_Generated_Image_ftx25lftx25lftx2.png": "assets/images/group/group-hero.jpg",
}


def resize_if_needed(img: Image.Image) -> Image.Image:
    if img.width <= MAX_WIDTH:
        return img
    ratio = MAX_WIDTH / img.width
    size = (MAX_WIDTH, max(1, int(img.height * ratio)))
    return img.resize(size, Image.LANCZOS)


def save_jpeg(path: Path, img: Image.Image) -> None:
    rgb = img.convert("RGB")
    rgb = resize_if_needed(rgb)
    rgb.save(path, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)


def save_png(path: Path, img: Image.Image) -> None:
    if img.mode not in ("RGBA", "LA"):
        img = img.convert("RGBA")
    # Avatars/icons only need small dimensions in the mini program.
    if max(img.size) > 256:
        ratio = 256 / max(img.size)
        size = (max(1, int(img.width * ratio)), max(1, int(img.height * ratio)))
        img = img.resize(size, Image.LANCZOS)
    img.save(path, "PNG", optimize=True)


def compress_in_place(rel_path: str) -> tuple[str, int, int]:
    src = ROOT / rel_path
    before = src.stat().st_size
    with Image.open(src) as img:
        if src.suffix.lower() in {".jpg", ".jpeg"}:
            save_jpeg(src, img)
        else:
            save_png(src, img)
    after = src.stat().st_size
    return rel_path, before, after


def convert_png_to_jpeg(rel_png: str, rel_jpg: str) -> tuple[str, int, int]:
    src = ROOT / rel_png
    dst = ROOT / rel_jpg
    before = src.stat().st_size
    with Image.open(src) as img:
        save_jpeg(dst, img)
    src.unlink()
    after = dst.stat().st_size
    return f"{rel_png} -> {rel_jpg}", before, after


def main() -> None:
    total_before = 0
    total_after = 0

    for rel_png, rel_jpg in PNG_TO_JPEG.items():
        label, before, after = convert_png_to_jpeg(rel_png, rel_jpg)
        total_before += before
        total_after += after
        print(f"{label}: {before // 1024}KB -> {after // 1024}KB")

    for rel in [
        "assets/images/origin/hero.jpg",
        "assets/avatars/default-user.png",
        "assets/profile/trace-bg.jpg",
        "assets/profile/leader-bg.jpg",
    ]:
        label, before, after = compress_in_place(rel)
        total_before += before
        total_after += after
        print(f"{label}: {before // 1024}KB -> {after // 1024}KB")

    category_dir = ROOT / "assets" / "category"
    for path in sorted(category_dir.glob("*.jpg")):
        rel = str(path.relative_to(ROOT)).replace("\\", "/")
        label, before, after = compress_in_place(rel)
        total_before += before
        total_after += after
        print(f"{label}: {before // 1024}KB -> {after // 1024}KB")

    for rel in [
        "assets/images/origin/photo-1.jpg",
        "assets/images/origin/photo-2.jpg",
        "assets/images/origin/photo-3.jpg",
    ]:
        label, before, after = compress_in_place(rel)
        total_before += before
        total_after += after
        print(f"{label}: {before // 1024}KB -> {after // 1024}KB")

    print(f"Saved {(total_before - total_after) // 1024}KB total")


if __name__ == "__main__":
    main()
