#!/usr/bin/env python3
"""Trim empty side margins from condition images while keeping bottom description visible."""
from PIL import Image
from pathlib import Path

def trim_image(path: Path) -> None:
    """Trim light/white side margins. Keeps full height for bottom text."""
    img = Image.open(path).convert("RGB")
    w, h = img.size
    pixels = img.load()
    sample_step = max(1, h // 30)

    def col_has_content(x: int) -> bool:
        """Column has substantial non-background (border is very light: R,G,B>210)."""
        content_count = 0
        for y in range(0, h, sample_step):
            r, g, b = pixels[x, y]
            # Border = very light; content = darker or has dark pixels
            if (r < 200 or g < 200 or b < 200) or (r < 230 and g < 230 and b < 230):
                content_count += 1
        return content_count >= max(2, (h // sample_step) // 3)

    left = 0
    for x in range(w):
        if col_has_content(x):
            left = x
            break

    right = w
    for x in range(w - 1, left - 1, -1):
        if col_has_content(x):
            right = x + 1
            break

    if right - left >= w - 2:
        return
    img.crop((left, 0, right, h)).save(path, "PNG", optimize=True)
    print(f"Trimmed {path.name}: {w}x{h} -> {right-left}x{h}")

def main():
    base = Path(__file__).parent.parent / "public" / "images" / "condition"
    for p in sorted(base.glob("*.png")):
        try:
            trim_image(p)
        except Exception as e:
            print(f"Skip {p.name}: {e}")
    for p in sorted((base / "back").glob("*.png")):
        try:
            trim_image(p)
        except Exception as e:
            print(f"Skip {p.name}: {e}")

if __name__ == "__main__":
    main()
