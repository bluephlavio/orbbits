# Trigonometria e componenti di un vettore

Technical notes. Pedagogical intent: `brief.md`; classroom prose: `narrative.md`.

- Kind: interactive · Engine: react (plain SVG) + KaTeX · Public page: `/bits/vector-trigonometry-explorer/`
- Language: Italian only, strings inline
- Tests: `node --test bits/vector-trigonometry-explorer/tests/*.test.ts`, also run by `just test`
- Standalone export: `just export vector-trigonometry-explorer` → `dist/web/` (rebuildable, not versioned)
- Relatives: `right-triangle-trigonometry` (the ratios), `vector-components-explorer`,
  `vector-operations-explorer`, `vector-sum-magnitude-explorer` (tag `vectors`)

## Structure

```text
src/index.tsx            composition: tip, mode, quadrants, layers, steps, mask, zoom; the panel
src/model/direction.ts   tip ↔ (modulus, reference angle, quadrant); special cases; drags  [this Bit]
src/model/vec.ts         vector arithmetic, clean(), snap()                                [shared]
src/ui/Stage.tsx         the diagram: plane, quadrants, triangle, projections, components,
                         angle, v⃗, the tip handle, labels                                  [this Bit]
src/ui/formulas.ts       the calculation in both modes, the remarks                        [this Bit]
src/ui/marks.ts          angle arcs, right-angle squares        [shared with right-triangle-trigonometry]
src/ui/view.ts, plane.ts, arrow.ts, labels.ts, format.ts, Tex.tsx, Plane.tsx, Arrow.tsx,
src/ui/Label.tsx, NumberField.tsx, Rich.tsx, icons.tsx, useSize.ts, useTween.ts,
src/ui/useFullscreen.ts                                                                     [shared]
tests/core.test.ts (shared core) · tests/marks.test.ts · tests/model.test.ts (quadrants, signs,
reference angle, calculator, special cases, mode changes, masks, KaTeX validity)
```

`[shared]` files are identical copies of the vector suite's core; change one, copy it to the
other vector Bits (see `vector-components-explorer/README.md`). This Bit is the fourth user of
the core: the extraction question in `docs/architecture.md` is still open, deliberately.

## Model

One state: the tip P of v⃗ (tail always at the origin). `analyse(P)` gives `zero`, `axis`
(which axis, which sense, modulus) or `quadrant` (quadrant, modulus, reference angle
β = atan(|v_y| / |v_x|), the positive ratio). Polar data → tip with `tipOf`: lengths
|v⃗| cos β, |v⃗| sen β, signs from `signsOf(quadrant)`. `atan2` is not used; the signed
`calculatorAngle` exists only for the remark.

The two modes only change what is given:

- **Modulo e angolo**: data are multiples of 0.1 (modulus) and 0.1° (angle in [1°, 89°]);
  `givenPolar` reads them back from the tip. Dragging snaps the modulus to 0.5 and the angle to
  1° (0.1 and 0.1° with Shift/Alt); keys ↑↓ turn, ←→ stretch.
- **Componenti**: data are multiples of 0.1; dragging snaps to the unit grid (tenths with
  Shift/Alt); arrow keys move by 1 (0.1).
- Switching mode glides the tip to the nearest round data of the new mode (`toCartesian`,
  `toPolar`: an axis vector moves 1° into a quadrant, the zero vector resets). Restricting to
  the first quadrant mirrors the tip there. Typed values zoom out if needed.

## Rendering

- The suite's grammar: v⃗ blue arrow; lengths of the legs as plain segments (triangle layer,
  labels |v_x|, |v_y|, always positive); scalar components as translucent bands on the axes
  with dashed perpendiculars and signed labels at the feet (projections layer); vector
  components as arrows tip-to-tail (components layer). Violet for the angle.
- First quadrant: the view puts the origin near the bottom-left corner, below the tools.
  All quadrants: origin at the centre, numerals I–IV, the current quadrant tinted.
- Labels by the shared placer, with a little padding; leg labels fall back beyond the tip or
  low inside the triangle when the outer side is off stage.
- "Nascondi i risultati": in 'polar' the components and lengths; in 'cartesian' modulus, angle,
  tangent and quadrant — also the tint and numeral on the plane. Data stay.

## Limitations

- Label sizes of TeX are estimated; extreme zooms may crowd small triangles.
- No tail away from the origin by design.
