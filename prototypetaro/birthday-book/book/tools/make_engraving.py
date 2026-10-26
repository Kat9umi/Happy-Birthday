"""Turn a black & white picture into a metal-engraved PNG for the book cover.

White parts of the picture become shiny metal, black parts become see-through
(so the leather cover shows through).

Usage:
    python3 tools/make_engraving.py my_picture.png assets/engrave-silver.png silver
    python3 tools/make_engraving.py my_picture.png assets/engrave-gold.png gold
Needs:  pip install pillow numpy
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

METALS = {   # colour ramps (position 0..1 -> RGB). Silver uses the palette colours.
    "silver": [(0, (137, 139, 164)), (.25, (245, 239, 240)), (.5, (189, 190, 211)),
               (.75, (245, 239, 240)), (1, (137, 139, 164))],
    "gold":   [(0, (150, 112, 40)), (.25, (255, 241, 192)), (.5, (217, 180, 91)),
               (.75, (250, 232, 160)), (1, (150, 112, 40))],
}

def make(src, out, metal="silver", width=1000, pad=10):
    stops = METALS[metal]
    im = Image.open(src).convert("L")
    h = round(im.height * width / im.width)
    im = im.resize((width, h), Image.LANCZOS)
    a = np.asarray(im, dtype=np.float32) / 255
    a = np.clip((a - .22) / .56, 0, 1)                      # clean up the edges

    yy, xx = np.mgrid[0:h, 0:width]
    t = xx / width * .55 + yy / h * .45                      # diagonal sweep
    band = np.sin(t * np.pi * 6) * .5 + .5                   # shiny bands
    grain = np.random.default_rng(3).normal(0, .045, (h, width))
    k = np.clip(band * .9 + grain + .05, 0, 1)
    xs = [s[0] for s in stops]
    rgb = np.stack([np.interp(k, xs, [s[1][c] for s in stops]) for c in range(3)], -1)

    W, H = width + pad * 2, h + pad * 2
    alpha = Image.fromarray((a * 255).astype(np.uint8))
    metal_img = Image.fromarray(rgb.astype(np.uint8)).convert("RGBA")
    metal_img.putalpha(alpha)

    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    # soft dark shadow (gives the engraved depth) and a thin highlight
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    black = Image.new("RGBA", (width, h), (8, 8, 20, 255)); black.putalpha(alpha.point(lambda v: int(v * .8)))
    shadow.paste(black, (pad + 3, pad + 3), black)
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(2.2)))
    light = Image.new("RGBA", (width, h), (255, 255, 255, 255)); light.putalpha(alpha.point(lambda v: int(v * .35)))
    hl = Image.new("RGBA", (W, H), (0, 0, 0, 0)); hl.paste(light, (pad - 1, pad - 1), light)
    canvas.alpha_composite(hl)
    full = Image.new("RGBA", (W, H), (0, 0, 0, 0)); full.paste(metal_img, (pad, pad), metal_img)
    canvas.alpha_composite(full)
    canvas.save(out, optimize=True)
    print("saved", out, canvas.size)

if __name__ == "__main__":
    src, out = sys.argv[1], sys.argv[2]
    make(src, out, sys.argv[3] if len(sys.argv) > 3 else "silver")
