#!/usr/bin/env python3
"""Crop regions out of high-res slide exports and save them as resized WebP.

Usage:
  python3 crop_assets.py spec.json

spec.json:
{
  "src_dir": "assets/case-study-x",        # where the slide PNGs live
  "out_dir": "assets/case-study-x/mobile",  # where WebPs are written
  "coord_scale": 6.4,                       # multiply box coords by this (e.g. 1200px thumbs -> 7680px slides); 1 if boxes are in slide pixels
  "quality": 84,
  "crops": {
    "during-booking": {"src": "slide-11.png", "box": [372, 68, 828, 518], "width": 900},
    "home-screen":    {"src": "slide-14.png", "box": [428, 88, 772, 580], "width": 800}
  }
}

Each crop's "width" is the output width in pixels (aim for 2x the CSS width it is shown at).
Prints the output size and file size of every crop so you can check them.
"""
import json
import os
import sys

from PIL import Image


def main(spec_path):
    spec = json.load(open(spec_path))
    src_dir = spec["src_dir"]
    out_dir = spec["out_dir"]
    scale = float(spec.get("coord_scale", 1))
    quality = int(spec.get("quality", 84))
    os.makedirs(out_dir, exist_ok=True)
    for name, crop in spec["crops"].items():
        image = Image.open(os.path.join(src_dir, crop["src"])).convert("RGB")
        box = tuple(round(v * scale) for v in crop["box"])
        region = image.crop(box)
        width = int(crop.get("width", region.width))
        if width != region.width:
            region = region.resize((width, round(region.height * width / region.width)), Image.LANCZOS)
        out = os.path.join(out_dir, name + ".webp")
        region.save(out, quality=quality, method=6)
        print(f"{name}: {region.size[0]}x{region.size[1]}, {os.path.getsize(out) // 1024} KB -> {out}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
