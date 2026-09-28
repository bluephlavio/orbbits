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

- `scale=4`: geometry lives in units of the circle radius, text stays `\small`; the whole
  figure is ≈ 13.5 cm wide, so the SVG is legible at 12–14 cm on a slide and the PDF
  prints at page size. Fractions use `\dfrac`; everything is exact/symbolic.
- The figure is **data-driven**: one `\foreach` table holds all 16 angles
  (degrees / radians / x / y / angle-label position / coordinate position / anchor).
  To change a value, edit the table row; to move a label, edit its position.
- Visual hierarchy (grayscale-safe, colour only secondary): black = frame (circle, axes,
  coordinates), blue (`orbPrimary`) = angle machinery (Q1 sweep arcs, angle labels,
  points), grey (`orbMuted`) = construction (terminal sides in Q2–Q4, annotation).
  The only text is mathematics — the figure is locale-neutral by construction.
- Layout decisions worth remembering:
  - **Angles inside, coordinates outside**, so the two semantics never mix; a single
    annotation P_θ = (cos θ, sin θ) carries the reading rule.
  - Terminal sides are drawn only in the outer annulus (r ≥ 0.68): the inner disc stays
    clean around the Q1 arcs and the π/4-family labels.
  - Coordinates **hug the circle tangentially** with one corner anchor per octant
    family; radial centring does not work at 15° spacing with real TeX label widths.
  - Q1 carries the reading convention (three nested sweep arcs from 0°, radii
    0.16/0.23/0.58); cardinals sit on the axes with a white halo.
- Label positions were **computed, not eyeballed**: exact label boxes were measured with
  `\settowidth/\settoheight/\settodepth` and placed by a clearance search (min gap
  ≈ 3 pt against circle, axes, rays, arcs, dots and each other). Horizontal text is not
  mirror-invariant, so each quadrant is tuned individually — three rim labels sit 4° off
  their ray to clear the wide cardinal labels. Re-run the same check after moving
  anything (scratch method, not part of the build).

## Limitations / open issues

- Fixed 16-angle content: no variant with fewer angles for beginners (would be a new Bit
  or a source variant, not an edit).
- At small embed sizes (< 9 cm wide) the coordinate labels approach the readability
  limit; the intended uses are A4/handout and 12–14 cm slides.
