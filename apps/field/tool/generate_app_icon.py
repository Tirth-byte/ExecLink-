#!/usr/bin/env python3
"""Generate the ExecLink iOS AppIcon set from the approved brand mark.

Source of truth: the connected-node ExecLink mark, identical in both
existing brand surfaces:

  * apps/web/src/components/execlink-brand.tsx  (viewBox 0 0 20 20 SVG)
  * apps/field/lib/widgets/execlink_logo.dart   (CustomPainter, same geometry)

Geometry is taken verbatim from the 20x20 SVG viewBox:

  <circle cx="4"  cy="10" r="2"/>
  <circle cx="16" cy="5"  r="2"/>
  <circle cx="16" cy="15" r="2"/>
  <path d="M6 10h3.2M10 10l4.2-4M10 10l4.2 4"
        stroke-width="1.7" stroke-linecap="round"/>

No text, no gradients, no glow, no inner shadows, and no baked-in
rounded-rectangle mask: iOS applies its own squircle mask.

Everything is drawn at 4x supersampling and box-downsampled for crisp,
correctly antialiased edges at every required size.

Requires: python3 with Pillow (PIL).
"""

import os

from PIL import Image, ImageDraw

# ---------------------------------------------------------------------------
# Brand tokens (mirror apps/field/lib/core/theme/app_colors.dart)
# ---------------------------------------------------------------------------
BRAND_700 = (0x08, 0x6F, 0x8F)
MARK_ON_BRAND = (0xFF, 0xFF, 0xFF)

# Brand mark geometry in the 20x20 viewBox coordinate space.
NODES = [(4.0, 10.0), (16.0, 5.0), (16.0, 15.0)]
NODE_RADIUS = 2.0
SEGMENTS = [
    ((6.0, 10.0), (9.2, 10.0)),
    ((10.0, 10.0), (14.2, 6.0)),
    ((10.0, 10.0), (14.2, 14.0)),
]
STROKE_WIDTH = 1.7

# The mark's visible bounds span 16 of the 20 viewBox units, so this fraction
# is applied to the viewBox. 0.70 yields a mark that is ~56% of the canvas
# width: large enough to stay legible at 20pt, with the glyph sitting well
# clear of the iOS squircle mask.
MARK_FRACTION = 0.70

SUPERSAMPLE = 4

HERE = os.path.dirname(os.path.abspath(__file__))
ICON_DIR = os.path.join(
    HERE, "..", "ios", "Runner", "Assets.xcassets", "AppIcon.appiconset"
)

# (filename, pixel size) for every entry declared in Contents.json.
SIZES = [
    ("Icon-App-20x20@1x.png", 20),
    ("Icon-App-20x20@2x.png", 40),
    ("Icon-App-20x20@3x.png", 60),
    ("Icon-App-29x29@1x.png", 29),
    ("Icon-App-29x29@2x.png", 58),
    ("Icon-App-29x29@3x.png", 87),
    ("Icon-App-40x40@1x.png", 40),
    ("Icon-App-40x40@2x.png", 80),
    ("Icon-App-40x40@3x.png", 120),
    ("Icon-App-60x60@2x.png", 120),
    ("Icon-App-60x60@3x.png", 180),
    ("Icon-App-76x76@1x.png", 76),
    ("Icon-App-76x76@2x.png", 152),
    ("Icon-App-83.5x83.5@2x.png", 167),
    ("Icon-App-1024x1024@1x.png", 1024),
]

VIEWBOX = 20.0
VIEWBOX_CENTER = VIEWBOX / 2.0


def render(pixels: int) -> Image.Image:
    """Render the ExecLink mark at a square `pixels` size."""
    hi = pixels * SUPERSAMPLE
    image = Image.new("RGB", (hi, hi), BRAND_700)
    draw = ImageDraw.Draw(image)

    scale = (hi * MARK_FRACTION) / VIEWBOX
    offset = hi / 2.0 - VIEWBOX_CENTER * scale

    def to_px(x: float, y: float) -> tuple[float, float]:
        return (offset + x * scale, offset + y * scale)

    stroke = STROKE_WIDTH * scale
    node_r = NODE_RADIUS * scale

    # Connectors first, so the nodes sit cleanly on top of the joins.
    for (x1, y1), (x2, y2) in SEGMENTS:
        draw.line([to_px(x1, y1), to_px(x2, y2)], fill=MARK_ON_BRAND, width=int(round(stroke)))
        # Round caps: a circle of stroke radius at each endpoint.
        for cx, cy in ((x1, y1), (x2, y2)):
            px, py = to_px(cx, cy)
            draw.ellipse(
                [px - stroke / 2, py - stroke / 2, px + stroke / 2, py + stroke / 2],
                fill=MARK_ON_BRAND,
            )

    for x, y in NODES:
        px, py = to_px(x, y)
        draw.ellipse([px - node_r, py - node_r, px + node_r, py + node_r], fill=MARK_ON_BRAND)

    return image.resize((pixels, pixels), Image.LANCZOS)


def main() -> None:
    os.makedirs(ICON_DIR, exist_ok=True)

    # 1024 master first; smaller sizes are produced from the same renderer.
    for filename, pixels in SIZES:
        path = os.path.normpath(os.path.join(ICON_DIR, filename))
        # Force opaque RGB: App Store validation rejects alpha, and palette
        # mode is an unnecessary variable across the set.
        render(pixels).convert("RGB").save(path, "PNG", optimize=True)
        print(f"wrote {filename} ({pixels}x{pixels})")

    print(f"\nAppIcon set regenerated in {ICON_DIR}")


if __name__ == "__main__":
    main()
