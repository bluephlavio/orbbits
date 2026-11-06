"""Renders the meteorite and the three pebbles of the game to transparent WebP images.

A small physically inspired renderer: each object is a signed distance field sphere-traced with an
orthographic camera, lit by three lights and a soft environment. numpy and scipy only, and only
here: the Bit itself loads the images, so nothing of this reaches the browser.

    uv run --no-project --with numpy --with scipy --with pillow python render_specimens.py [size]

The output is deterministic: the seeds below are part of the design.
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import map_coordinates, spline_filter

OUT = Path(__file__).parent
SIZE = int(sys.argv[1]) if len(sys.argv) > 1 else 760
SUPER = 2
EXTENT = 1.42  # half-width of the view, in object units

rng = np.random.default_rng(1908)
# Cubic interpolation: a linear one leaves the lattice visible on smooth surfaces.
VOLUME = spline_filter(rng.random((64, 64, 64)), order=3, mode="grid-wrap")


def noise(p, freq, offset=0.0):
    coords = (p * freq + offset).T * 7.3
    return map_coordinates(VOLUME, coords, order=3, mode="grid-wrap", prefilter=False)


def fbm(p, freq, octaves=4, gain=0.5):
    total = np.zeros(len(p))
    amp = 1.0
    norm = 0.0
    for i in range(octaves):
        total += amp * (noise(p, freq * 2.03**i, i * 3.7) - 0.5)
        norm += amp
        amp *= gain
    return total / norm * 2


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def normalize(v):
    return v / np.maximum(np.linalg.norm(v, axis=-1, keepdims=True), 1e-9)


def rotation(x, y, z):
    x, y, z = np.radians([x, y, z])
    rx = np.array([[1, 0, 0], [0, np.cos(x), -np.sin(x)], [0, np.sin(x), np.cos(x)]])
    ry = np.array([[np.cos(y), 0, np.sin(y)], [0, 1, 0], [-np.sin(y), 0, np.cos(y)]])
    rz = np.array([[np.cos(z), -np.sin(z), 0], [np.sin(z), np.cos(z), 0], [0, 0, 1]])
    return rz @ ry @ rx


class Meteorite:
    """An oriented iron meteorite: a blunt, flowing mass with regmaglypts, thumbprints left by the
    passage through the atmosphere, under a dark fusion crust worn to metal on its crests."""

    rotate = rotation(14, -22, 8)
    scale = np.array([1.16, 0.84, 0.9])
    exposure = 0.92

    def __init__(self):
        r = np.random.default_rng(77)
        count = 18
        self.centres = normalize(r.normal(size=(count, 3)))
        self.radii = r.uniform(0.3, 0.56, count)
        self.depths = r.uniform(0.016, 0.038, count)

    def dimples(self, p):
        directions = normalize(p / self.scale)
        cos = directions @ self.centres.T
        limit = np.cos(self.radii)
        x = np.clip((cos - limit) / (1 - limit), 0, 1)
        shape = x * x * (3 - 2 * x)
        # Summed softly, so that neighbouring prints melt into each other without a sharp ridge.
        total = (shape * self.depths).sum(axis=1)
        return 0.085 * (1 - np.exp(-total / 0.085))

    def sdf(self, p, detail=False):
        q = p / self.scale
        radius = np.linalg.norm(q, axis=1)
        d = radius - 1.0
        d -= 0.26 * fbm(p, 0.42, 2)
        d += self.dimples(p)
        if detail:
            d -= 0.006 * fbm(p, 4.5, 3)
            d -= 0.002 * fbm(p, 30.0, 2)
        return d * 0.7

    def material(self, p, n):
        crest = fbm(p, 1.5, 3)
        depth = self.dimples(p)
        grain = fbm(p, 16.0, 3)
        crust_a = np.array([0.016, 0.013, 0.012])
        crust_b = np.array([0.060, 0.038, 0.026])
        mix = smoothstep(-0.25, 0.45, fbm(p, 2.6, 4))[:, None]
        albedo = crust_a * (1 - mix) + crust_b * mix
        # Traces of oxidation, warm and fine.
        rust = smoothstep(0.3, 0.6, fbm(p, 4.5, 4, 0.6))[:, None] * 0.7
        albedo = albedo * (1 - rust) + np.array([0.15, 0.062, 0.022]) * rust
        # The crust wears away on the crests, between the thumbprints.
        worn = smoothstep(0.06, 0.26, crest + 0.4 * grain - depth * 7)
        flakes = smoothstep(0.16, 0.34, fbm(p, 4.5, 4, 0.58) + 0.3 * grain)
        metal = np.clip(worn * flakes * 1.1, 0, 1)
        rough = 0.5 - 0.27 * metal + 0.1 * grain
        return albedo, metal, np.clip(rough, 0.16, 0.8), np.array([0.95, 0.68, 0.42])


class Pebble:
    """An ordinary river pebble: rounded by water, matte, of no interest to anyone."""

    metal_colour = np.array([0.5, 0.5, 0.5])
    exposure = 0.66

    def __init__(self, scale, rotate, bumps, grit):
        self.scale = np.array(scale)
        self.rotate = rotation(*rotate)
        self.bumps = bumps
        self.grit = grit

    def sdf(self, p, detail=False):
        q = p / self.scale
        # A superellipsoid sits flatter and more like a stone than an ellipsoid does.
        e = 2.45
        radius = (np.abs(q) ** e).sum(axis=1) ** (1 / e)
        d = radius - 1.0
        d -= self.bumps * fbm(p, 0.55, 1)
        if detail:
            d -= self.grit * fbm(p, 7.0, 3)
            d -= self.grit * 0.25 * fbm(p, 40.0, 2)
        return d * 0.7


class GreyPebble(Pebble):
    def material(self, p, n):
        tone = fbm(p, 1.3, 4)[:, None]
        albedo = np.array([0.20, 0.205, 0.21]) * (1 + 0.42 * tone)
        # A band of quartz across the stone.
        band = p[:, 0] * 0.62 + p[:, 1] * 0.92 + 0.16 * fbm(p, 0.9, 2) + 0.08
        vein = (1 - smoothstep(0.03, 0.075, np.abs(band)))[:, None]
        albedo = albedo * (1 - vein) + np.array([0.62, 0.60, 0.56]) * vein
        return albedo, np.zeros(len(p)), 0.72 + 0 * tone[:, 0], self.metal_colour


class SandPebble(Pebble):
    def material(self, p, n):
        tone = fbm(p, 1.6, 4)[:, None]
        albedo = np.array([0.31, 0.235, 0.165]) * (1 + 0.3 * tone)
        speck = smoothstep(0.3, 0.42, fbm(p, 22.0, 2))[:, None]
        albedo = albedo * (1 - 0.5 * speck)
        strata = 0.1 * np.sin(p[:, 1] * 15 + 2.2 * fbm(p, 1.1, 2))[:, None]
        return albedo * (1 + strata), np.zeros(len(p)), np.full(len(p), 0.8), self.metal_colour


class PalePebble(Pebble):
    def material(self, p, n):
        tone = fbm(p, 1.8, 3)[:, None]
        albedo = np.array([0.36, 0.35, 0.325]) * (1 + 0.16 * tone)
        fine = fbm(p, 30.0, 2)
        dark = smoothstep(0.26, 0.4, fine)[:, None]
        light = smoothstep(0.26, 0.4, -fine)[:, None]
        albedo = albedo * (1 - 0.6 * dark) + np.array([0.7, 0.69, 0.65]) * light * 0.3
        return albedo, np.zeros(len(p)), np.full(len(p), 0.76), self.metal_colour


def trace(obj, origins, direction):
    t = np.zeros(len(origins))
    hit = np.zeros(len(origins), bool)
    active = np.arange(len(origins))
    for _ in range(90):
        if len(active) == 0:
            break
        d = obj.sdf(origins[active] + t[active, None] * direction)
        t[active] += d
        done = d < 0.0012
        hit[active[done]] = True
        keep = ~done & (t[active] < 5.0)
        active = active[keep]
    return t, hit


def normals(obj, p):
    e = 0.0022
    k = np.array([[1, -1, -1], [-1, -1, 1], [-1, 1, -1], [1, 1, 1]], float)
    total = np.zeros_like(p)
    for v in k:
        total += v * obj.sdf(p + v * e, True)[:, None]
    return normalize(total)


def occlusion(obj, p, n):
    ao = np.zeros(len(p))
    for i, (h, w) in enumerate(((0.05, 1.0), (0.14, 0.6), (0.3, 0.32))):
        ao += w * np.clip(h - obj.sdf(p + n * h) / 0.7, 0, 1) / h
    return np.clip(1 - 0.44 * ao, 0, 1) ** 1.4


def environment(r):
    """A dim room: a broad soft light above, a warm low glow behind, night around."""
    up = np.clip(r[:, 1] * 0.5 + 0.5, 0, 1)[:, None]
    sky = np.array([0.05, 0.06, 0.11]) * (1 - up) + np.array([1.0, 0.93, 0.82]) * up**2.4 * 1.9
    softbox = smoothstep(0.55, 0.92, r @ normalize(np.array([-0.45, 0.7, 0.55])))[:, None]
    return sky + softbox * np.array([3.6, 3.2, 2.7])


def ggx(n, v, l, roughness, f0):
    h = normalize(l + v)
    nl = np.clip((n * l).sum(1), 0, 1)
    nv = np.clip((n * v).sum(1), 1e-3, 1)
    nh = np.clip((n * h).sum(1), 0, 1)
    vh = np.clip((v * h).sum(1), 0, 1)
    a2 = (roughness**2) ** 2
    d = a2 / (np.pi * (nh**2 * (a2 - 1) + 1) ** 2)
    k = (roughness + 1) ** 2 / 8
    g = (nl / (nl * (1 - k) + k)) * (nv / (nv * (1 - k) + k))
    f = f0 + (1 - f0) * ((1 - vh)[:, None]) ** 5
    return (d * g / (4 * nl * nv + 1e-4))[:, None] * f * nl[:, None], nl[:, None]


LIGHTS = (
    (normalize(np.array([-0.52, 0.72, 0.56])), np.array([1.0, 0.95, 0.86]) * 3.1),
    (normalize(np.array([0.78, 0.08, 0.5])), np.array([0.45, 0.55, 0.85]) * 0.5),
    (normalize(np.array([0.72, 0.42, -0.62])), np.array([1.0, 0.76, 0.5]) * 3.0),
)


def render(obj, name):
    res = SIZE * SUPER
    axis = (np.arange(res) + 0.5) / res * 2 - 1
    xs, ys = np.meshgrid(axis * EXTENT, -axis * EXTENT)
    origins = np.stack([xs.ravel(), ys.ravel(), np.full(res * res, 2.4)], axis=1)
    rotate = obj.rotate
    local_origins = origins @ rotate
    direction = np.array([0.0, 0.0, -1.0]) @ rotate

    inside = np.hypot(xs.ravel(), ys.ravel()) < 1.4
    t, hit = np.zeros(res * res), np.zeros(res * res, bool)
    t[inside], hit[inside] = trace(obj, local_origins[inside], direction)

    p = local_origins[hit] + t[hit, None] * direction
    n_local = normals(obj, p)
    albedo, metal, rough, metal_colour = obj.material(p, n_local)
    ao = occlusion(obj, p, n_local)

    n = n_local @ rotate.T
    v = np.array([0.0, 0.0, 1.0])
    v = np.broadcast_to(v, n.shape)
    f0 = 0.04 * (1 - metal[:, None]) + metal_colour * metal[:, None]
    diffuse_colour = albedo * (1 - metal[:, None])
    rough = np.asarray(rough)

    colour = np.zeros_like(n)
    for direction_l, radiance in LIGHTS:
        l = np.broadcast_to(direction_l, n.shape)
        spec, nl = ggx(n, v, l, rough, f0)
        colour += (diffuse_colour / np.pi * nl + spec) * radiance

    # What the surface reflects: everything for metal, a sheen for the rest.
    r = normalize(2 * (n * v).sum(1, keepdims=True) * n - v)
    nv = np.clip((n * v).sum(1), 0, 1)[:, None]
    fresnel = f0 + (1 - f0) * (1 - nv) ** 5
    sharp = environment(r)
    broad = environment(normalize(r + n))
    blur = np.clip((rough - 0.16) / 0.5, 0, 1)[:, None]
    colour += fresnel * (sharp * (1 - blur) + broad * blur) * (0.34 + 0.66 * metal[:, None]) * ao[:, None]
    colour += diffuse_colour * (environment(n) * 0.14 + 0.012) * ao[:, None]
    colour *= (0.25 + 0.75 * ao)[:, None]

    # Filmic curve, then sRGB.
    c = colour * obj.exposure
    c = (c * (2.51 * c + 0.03)) / (c * (2.43 * c + 0.59) + 0.14)
    c = np.clip(c, 0, 1) ** (1 / 2.2)

    image = np.zeros((res * res, 4))
    image[hit, :3] = c
    image[hit, 3] = 1
    image = image.reshape(res, res, 4)
    # Premultiplied downsample, so that the edge carries no dark fringe.
    image[..., :3] *= image[..., 3:]
    small = image.reshape(SIZE, SUPER, SIZE, SUPER, 4).mean(axis=(1, 3))
    alpha = small[..., 3:]
    small[..., :3] = small[..., :3] / np.maximum(alpha, 1e-4)
    picture = Image.fromarray((np.clip(small, 0, 1) * 255 + 0.5).astype(np.uint8), "RGBA")
    picture.save(OUT / f"{name}.webp", quality=86, method=6, alpha_quality=90)
    print(name, picture.size, (OUT / f"{name}.webp").stat().st_size // 1024, "KB")


SPECIMENS = {
    "meteorite": Meteorite(),
    "stone-0": GreyPebble((1.02, 0.64, 0.78), (24, 18, -10), 0.028, 0.0012),
    "stone-1": SandPebble((0.92, 0.58, 0.84), (30, -16, 8), 0.04, 0.003),
    "stone-2": PalePebble((0.84, 0.68, 0.7), (18, 30, 14), 0.03, 0.0012),
}

if __name__ == "__main__":
    for key, specimen in SPECIMENS.items():
        render(specimen, key)
