#!/usr/bin/env python3
"""Draws the STRATA Dia app icons into src/pwa/icons/ (needs Pillow and the DejaVu Sans Bold font).

Red COLAS background, white "SD" (STRATA Dia), three lines underneath like a filled sheet.
- icon-192.png, icon-512.png : rounded square on a transparent background (purpose "any")
- icon-512-maskable.png      : full-bleed square, drawing kept inside the 80 % safe zone (purpose "maskable")
- apple-touch-icon.png       : full-bleed 180 x 180 square (iOS rounds the corners itself)
Run: python3 tools/make-icons.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

RED = (200, 16, 46, 255)
WHITE = (255, 255, 255, 255)
LETTERS = "SD"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
OUT = Path(__file__).resolve().parent.parent / "src" / "pwa" / "icons"
SS = 4  # drawn 4x larger then reduced, for smooth edges


def draw(size, rounded, scale):
    """scale = share of the icon used by the letters + lines (1.0 for a normal icon, smaller for maskable)."""
    n = size * SS
    img = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if rounded:
        d.rounded_rectangle([0, 0, n - 1, n - 1], radius=int(n * 0.137), fill=RED)
    else:
        d.rectangle([0, 0, n, n], fill=RED)

    # letters: same proportions as the previous icon (cap height ~ 33 % of the icon, centred, above the lines)
    font = ImageFont.truetype(FONT, int(n * 0.40 * scale))
    box = d.textbbox((0, 0), LETTERS, font=font)
    w, h = box[2] - box[0], box[3] - box[1]
    cx = n / 2
    top = n / 2 - n * 0.03 * scale - h / 2
    d.text((cx - w / 2 - box[0], top - box[1]), LETTERS, font=font, fill=WHITE)

    # three lines (the sheet)
    left, right = cx - n * 0.281 * scale, cx + n * 0.281 * scale
    thick = n * 0.02 * scale
    for i in range(3):
        y = n / 2 + n * 0.205 * scale + i * n * 0.053 * scale
        d.rectangle([left, y, right, y + thick], fill=WHITE)
    return img.resize((size, size), Image.LANCZOS)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    draw(192, True, 1.0).save(OUT / "icon-192.png", optimize=True)
    draw(512, True, 1.0).save(OUT / "icon-512.png", optimize=True)
    draw(512, False, 0.8).save(OUT / "icon-512-maskable.png", optimize=True)
    draw(180, False, 0.92).save(OUT / "apple-touch-icon.png", optimize=True)
    for f in sorted(OUT.glob("*.png")):
        print(f.relative_to(OUT.parent.parent.parent), Image.open(f).size)


if __name__ == "__main__":
    main()
