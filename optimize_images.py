#!/usr/bin/env python3
"""
Batch-optimize JPG/JPEG/PNG images in the ./images directory.

What it does:
1) Recursively scans ./images
2) Processes .jpg, .jpeg, .png
3) Applies lossy optimization (quality-based)
4) Overwrites the original file in place (same path + filename)

Usage examples (run from project root):
  python optimize_images.py
  python optimize_images.py --quality 75
  python optimize_images.py --images-dir images
"""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Iterable, Tuple

from PIL import Image, ImageOps, UnidentifiedImageError


SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Recursively optimize JPG/JPEG/PNG files and overwrite originals."
    )
    parser.add_argument(
        "--images-dir",
        default="images",
        help="Root image directory to scan recursively (default: images).",
    )
    parser.add_argument(
        "--quality",
        type=int,
        default=75,
        help="Lossy quality target for JPEG and PNG quantization scale (1-95, default: 75).",
    )
    return parser.parse_args()


def find_images(root: Path) -> Iterable[Path]:
    """Yield supported image files recursively under root."""
    for path in root.rglob("*"):
        if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS:
            yield path


def safe_quality(value: int) -> int:
    """Clamp quality into a sensible range."""
    return max(1, min(95, value))


def png_palette_colors_from_quality(quality: int) -> int:
    """
    Convert quality (1-95) into palette color count for lossy PNG optimization.
    Lower quality => fewer colors => smaller file.
    """
    # Maps roughly to 32..256 colors.
    return max(32, min(256, int(32 + (quality / 95.0) * 224)))


def to_rgb_with_white_bg(image: Image.Image) -> Image.Image:
    """
    Convert image to RGB safely.
    If image has transparency, flatten against white background.
    """
    if image.mode in ("RGBA", "LA") or (
        image.mode == "P" and "transparency" in image.info
    ):
        rgba = image.convert("RGBA")
        background = Image.new("RGB", rgba.size, (255, 255, 255))
        background.paste(rgba, mask=rgba.split()[-1])
        return background
    if image.mode != "RGB":
        return image.convert("RGB")
    return image


def get_quantize_constants() -> Tuple[int, int]:
    """
    Pillow compatibility helper for quantize constants across versions.
    Returns (method, dither).
    """
    if hasattr(Image, "Quantize") and hasattr(Image, "Dither"):
        return Image.Quantize.FASTOCTREE, Image.Dither.FLOYDSTEINBERG
    return Image.FASTOCTREE, Image.FLOYDSTEINBERG


def optimize_jpeg(path: Path, quality: int) -> int:
    """Optimize JPG/JPEG and overwrite original. Returns new file size (bytes)."""
    tmp_path = path.with_name(path.name + ".tmp")
    with Image.open(path) as img:
        img = ImageOps.exif_transpose(img)
        img = to_rgb_with_white_bg(img)
        img.save(
            tmp_path,
            format="JPEG",
            quality=quality,
            optimize=True,
            progressive=True,
        )
    tmp_path.replace(path)  # overwrite original path
    return path.stat().st_size


def optimize_png(path: Path, quality: int) -> int:
    """
    Optimize PNG with lossy quantization + max compression and overwrite original.
    Returns new file size (bytes).
    """
    tmp_path = path.with_name(path.name + ".tmp")
    colors = png_palette_colors_from_quality(quality)
    method, dither = get_quantize_constants()

    with Image.open(path) as img:
        img = ImageOps.exif_transpose(img)

        # Keep alpha where possible by quantizing directly.
        if img.mode not in ("RGB", "RGBA"):
            img = img.convert("RGBA" if "A" in img.getbands() else "RGB")

        quantized = img.quantize(colors=colors, method=method, dither=dither)
        quantized.save(
            tmp_path,
            format="PNG",
            optimize=True,
            compress_level=9,
        )

    tmp_path.replace(path)  # overwrite original path
    return path.stat().st_size


def human_kb(size_bytes: int) -> str:
    return f"{size_bytes / 1024:.1f} KB"


def main() -> None:
    args = parse_args()
    quality = safe_quality(args.quality)
    images_root = Path(args.images_dir).resolve()

    if not images_root.exists() or not images_root.is_dir():
        raise SystemExit(f"Image directory not found: {images_root}")

    files = list(find_images(images_root))
    if not files:
        print(f"No .jpg/.jpeg/.png files found under: {images_root}")
        return

    total_before = 0
    total_after = 0
    optimized_count = 0
    error_count = 0

    print(f"Scanning: {images_root}")
    print(f"Found {len(files)} file(s). Using quality={quality}\n")

    for path in files:
        try:
            before = path.stat().st_size
            suffix = path.suffix.lower()

            if suffix in (".jpg", ".jpeg"):
                after = optimize_jpeg(path, quality)
            elif suffix == ".png":
                after = optimize_png(path, quality)
            else:
                continue

            total_before += before
            total_after += after
            optimized_count += 1

            delta = before - after
            sign = "-" if delta >= 0 else "+"
            print(
                f"[OK] {path.relative_to(images_root)} | "
                f"{human_kb(before)} -> {human_kb(after)} ({sign}{abs(delta) / 1024:.1f} KB)"
            )

        except (OSError, UnidentifiedImageError) as exc:
            error_count += 1
            print(f"[ERR] {path}: {exc}")

    print("\nDone.")
    print(f"Optimized: {optimized_count} file(s)")
    print(f"Errors:    {error_count} file(s)")
    print(
        f"Total:     {human_kb(total_before)} -> {human_kb(total_after)} "
        f"({(total_before - total_after) / 1024:.1f} KB saved)"
    )


if __name__ == "__main__":
    main()
