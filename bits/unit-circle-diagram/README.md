# Circonferenza goniometrica e angoli notevoli

<!-- Technical notes for maintainers and agents. The pedagogical intent lives in brief.md,
     classroom prose in narrative.md; do not repeat them here. -->

- Kind: figure · Engine: TikZ · Public page: `/bits/unit-circle-diagram/`
- Source: `src/figure.tex` (standalone TikZ picture)
- Outputs: `dist/figure.svg` (web/slides), `dist/figure.pdf` (print)

## Workflow

```bash
just build unit-circle-diagram
just check unit-circle-diagram
```

## Implementation notes

- `scale=5`: geometry lives in units of the circle radius (5 cm), text stays `\small`; the
  figure is ≈ 14.5 cm square, so it prints on A4 and stays legible at 12–14 cm on a slide.
  Fractions use `\dfrac`; everything is exact/symbolic.
- **Radial model.** Every non-cardinal angle owns a thin ray from the origin, and its
  information is read along that ray: degrees → radians → point → coordinates. Labels are
  centred on the ray and rotated along it (θ in the right half-plane, θ−180° in the left,
  so nothing is upside down); a white halo interrupts the ray behind each label.
  Coordinates start just outside the point (`\gapCrd`) and grow outwards, anchored
  `west` on the right and `east` on the left. Radial text spends radial space, which is
  free, instead of tangential space, which 15° spacing makes scarce: that is why
  horizontal coordinate labels collided in the first version and radial ones cannot.
- **Two rings** for the inner labels, the same for every direction (cardinals included):
  degrees at `\rDeg` = 0.52, radians at `\rRad` = 0.80. At 5 cm radius 15° leaves room
  for neighbours on the same ring, so no staggering is needed. Each quadrant is the
  mirror image of Q1.
- **Cardinals** have their own loop: horizontal labels on the counterclockwise side of
  their axis (0° above +x, 90° left of +y, 180° below −x, 270° right of −y), so a
  quarter turn maps each one onto the next.
- One discreet arc 0°→30° with θ states the reading convention; the single annotation
  P_θ = (cos θ, sin θ) sits in the top-right corner.
- Colour marks the family (π/6 `orbPrimary`, π/4 `orbAccent!70!black`, axes black) on ray,
  labels, point and coordinates; it is redundant with the values (grayscale-safe).
- The data table holds only mathematics (angle, radians, cos, sin, family); the radii are
  the few macros at the top. Hand corrections go in optional keys `deg <a>`, `rad <a>`,
  `crd <a>` (applied with `/.try`, e.g. `crd 60/.style={xshift=2pt}` in the picture
  options); the current layout needs none.
- Nodes are named `deg-<a>`, `rad-<a>`, `crd-<a>`, `theta`, `annot`. After moving anything,
  check clearances: dump each named node's four corners (`\pgfgetlastxy` on
  `(name.north west)` etc.) from a scratch copy and test the boxes against each other and
  against rays, axes, circle and points (e.g. with shapely).

## Limitations / open issues

- Fixed 16-angle content: no variant with fewer angles for beginners (would be a new Bit
  or a source variant, not an edit).
- At small embed sizes (< 9 cm wide) the coordinate labels approach the readability
  limit; the intended uses are A4/handout and 12–14 cm slides.
