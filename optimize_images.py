#!/usr/bin/env python3
"""
Optimize every image under ./images into WebP for web delivery.

What this script does:
1) Recursively scans the images directory
2) Processes JPG/JPEG/PNG/WebP input files
3) Resizes image width to max 1000 px (keeps aspect ratio)
4) Encodes to WebP and tries to keep result under 100 KB
5) Saves result as .webp alongside original file name

Usage (from project root):
  python optimize_images.py
  python optimize_images.py --images-dir images --target-kb 100 --max-width 1000
  python optimize_images.py --remove-originals
"""

from __future__ import annotations

import argparse
import io
from pathlib import Path
from typing import Iterable, Optional, Tuple

from PIL import Image, ImageOps, UnidentifiedImageError


SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Recursively convert images to WebP with max width and target file size."
    )
    parser.add_argument(
        "--images-dir",
        default="images",
        help="Root image directory to scan recursively (default: images).",
    )
    parser.add_argument(
        "--max-width",
        type=int,
        default=1000,
        help="Maximum output width in pixels (default: 1000).",
    )
    parser.add_argument(
        "--target-kb",
        type=int,
        default=100,
        help="Target maximum file size in KB (default: 100).",
    )
    parser.add_argument(
        "--quality-start",
        type=int,
        default=86,
        help="Starting WebP quality (1-100, default: 86).",
    )
    parser.add_argument(
        "--quality-min",
        type=int,
        default=42,
        help="Minimum WebP quality during search (1-100, default: 42).",
    )
    parser.add_argument(
        "--quality-step",
        type=int,
        default=4,
        help="Quality decrement per attempt (1-20, default: 4).",
    )
    parser.add_argument(
        "--remove-originals",
        action="store_true",
        help="Delete source JPG/JPEG/PNG files after successful WebP conversion.",
    )
    return parser.parse_args()


def find_images(root: Path) -> Iterable[Path]:
    for path in root.rglob("*"):
        if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS:
            yield path


def clamp(value: int, minimum: int, maximum: int) -> int:
    return max(minimum, min(maximum, value))


def human_kb(size_bytes: int) -> str:
    return f"{size_bytes / 1024:.1f} KB"


def webp_ready_mode(image: Image.Image) -> Image.Image:
    """
    Normalize mode for WebP encoding while preserving transparency when present.
    """
    if image.mode in ("RGBA", "LA"):
        return image.convert("RGBA")
    if image.mode == "P":
        if "transparency" in image.info:
            return image.convert("RGBA")
        return image.convert("RGB")
    if image.mode != "RGB":
        return image.convert("RGB")
    return image


def max_width_resize(image: Image.Image, max_width: int) -> Image.Image:
    if image.width <= max_width:
        return image

    scale = max_width / float(image.width)
    new_size = (max_width, max(1, int(round(image.height * scale))))
    resampling = (
        Image.Resampling.LANCZOS
        if hasattr(Image, "Resampling")
        else Image.LANCZOS
    )
    return image.resize(new_size, resampling)


def encode_webp_bytes(image: Image.Image, quality: int) -> bytes:
    buffer = io.BytesIO()
    image.save(
        buffer,
        format="WEBP",
        quality=quality,
        method=6,
    )
    return buffer.getvalue()


def encode_under_target(
    image: Image.Image,
    target_bytes: int,
    quality_start: int,
    quality_min: int,
    quality_step: int,
) -> Tuple[bytes, int, Tuple[int, int]]:
    """
    Try quality fallback first, then gradual downscale if still above target size.
    Returns best encoded bytes, selected quality, and final dimensions.
    """
    best_data: Optional[bytes] = None
    best_quality = quality_min
    working = image
    min_width = 480
    resampling = (
        Image.Resampling.LANCZOS
        if hasattr(Image, "Resampling")
        else Image.LANCZOS
    )

    while True:
        for quality in range(quality_start, quality_min - 1, -quality_step):
            data = encode_webp_bytes(working, quality)
            if best_data is None or len(data) < len(best_data):
                best_data = data
                best_quality = quality
            if len(data) <= target_bytes:
                return data, quality, working.size

        if working.width <= min_width:
            break

        next_width = max(min_width, int(round(working.width * 0.9)))
        if next_width >= working.width:
            break
        next_height = max(1, int(round(working.height * (next_width / working.width))))
        working = working.resize((next_width, next_height), resampling)

    if best_data is None:
        best_data = encode_webp_bytes(working, quality_min)
        best_quality = quality_min
    return best_data, best_quality, working.size


def convert_to_webp(
    source_path: Path,
    max_width: int,
    target_bytes: int,
    quality_start: int,
    quality_min: int,
    quality_step: int,
) -> Tuple[Path, int, int, Tuple[int, int], int]:
    output_path = source_path.with_suffix(".webp")

    with Image.open(source_path) as img:
        img = ImageOps.exif_transpose(img)
        img = webp_ready_mode(img)
        img = max_width_resize(img, max_width)

        encoded, used_quality, final_size = encode_under_target(
            img,
            target_bytes=target_bytes,
            quality_start=quality_start,
            quality_min=quality_min,
            quality_step=quality_step,
        )

    tmp_path = output_path.with_name(output_path.name + ".tmp")
    tmp_path.write_bytes(encoded)
    tmp_path.replace(output_path)

    return output_path, source_path.stat().st_size, len(encoded), final_size, used_quality


def main() -> None:
    args = parse_args()

    max_width = clamp(args.max_width, 320, 4000)
    target_kb = clamp(args.target_kb, 20, 5000)
    target_bytes = target_kb * 1024
    quality_start = clamp(args.quality_start, 1, 100)
    quality_min = clamp(args.quality_min, 1, 100)
    quality_step = clamp(args.quality_step, 1, 20)

    if quality_start < quality_min:
        quality_start, quality_min = quality_min, quality_start

    images_root = Path(args.images_dir).resolve()
    if not images_root.exists() or not images_root.is_dir():
        raise SystemExit(f"Image directory not found: {images_root}")

    files = sorted(find_images(images_root))
    if not files:
        print(f"No supported images found under: {images_root}")
        return

    total_before = 0
    total_after = 0
    optimized_count = 0
    skipped_count = 0
    error_count = 0

    print(f"Scanning:      {images_root}")
    print(f"Found files:   {len(files)}")
    print(f"Max width:     {max_width}px")
    print(f"Target size:   <= {target_kb} KB")
    print(
        f"Quality range: {quality_start}..{quality_min} (step {quality_step})\n"
    )

    for source_path in files:
        rel = source_path.relative_to(images_root)

        try:
            output_path, before, after, final_dims, quality = convert_to_webp(
                source_path=source_path,
                max_width=max_width,
                target_bytes=target_bytes,
                quality_start=quality_start,
                quality_min=quality_min,
                quality_step=quality_step,
            )
            total_before += before
            total_after += after
            optimized_count += 1

            size_tag = "OK" if after <= target_bytes else "WARN"
            print(
                f"[{size_tag}] {rel} -> {output_path.relative_to(images_root)} | "
                f"{human_kb(before)} -> {human_kb(after)} | "
                f"{final_dims[0]}x{final_dims[1]} | q={quality}"
            )

            # Keep existing source files by default for safety.
            if (
                args.remove_originals
                and source_path.suffix.lower() != ".webp"
                and source_path != output_path
            ):
                source_path.unlink(missing_ok=True)
                skipped_count += 1

        except (OSError, UnidentifiedImageError, ValueError) as exc:
            error_count += 1
            print(f"[ERR] {rel}: {exc}")

    saved = total_before - total_after
    print("\nDone.")
    print(f"Optimized:         {optimized_count} file(s)")
    print(f"Originals removed: {skipped_count} file(s)")
    print(f"Errors:            {error_count} file(s)")
    print(
        f"Total bytes:       {human_kb(total_before)} -> {human_kb(total_after)} "
        f"({saved / 1024:.1f} KB saved)"
    )


if __name__ == "__main__":
    main()
