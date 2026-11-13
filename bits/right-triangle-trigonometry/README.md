# Triangoli rettangoli e rapporti trigonometrici

Technical notes. Pedagogical intent: `brief.md`; classroom prose: `narrative.md`.

- Kind: interactive · Engine: react (plain SVG) + KaTeX · Public page: `/bits/right-triangle-trigonometry/`
- Language: Italian only, strings inline
- Tests: `node --test bits/right-triangle-trigonometry/tests/*.test.ts`, also run by `just test`
- Standalone export: `just export right-triangle-trigonometry` → `dist/web/` (rebuildable, not versioned)
- Relatives: `vector-trigonometry-explorer` (the next step), the vector suite (tag `vectors`),
  the unit-circle Bits (tag `trigonometry`, a later and different approach)

## Structure

```text
src/index.tsx          composition: state, reference angle, names, copies, mask; the panel
src/model/triangle.ts  the triangle (α, AB): sides, roles, ratios, copies, drags      [this Bit]
src/model/vec.ts       vector arithmetic, clean(), snap()                              [shared]
src/ui/Stage.tsx       the diagram: grid, triangle, copies, marks, handles, labels      [this Bit]
src/ui/formulas.ts     TeX of the ratios, the similar table, the remarks               [this Bit]
src/ui/marks.ts        angle arcs, sectors, right-angle squares, bisectors   [shared with vector-trigonometry-explorer]
src/ui/view.ts, labels.ts, format.ts, Tex.tsx, Label.tsx, NumberField.tsx, Rich.tsx,
src/ui/icons.tsx, useSize.ts, useTween.ts, useFullscreen.ts                            [shared]
tests/core.test.ts     the part of the shared core used here;  tests/marks.test.ts  marks;
tests/model.test.ts    similarity, ratios, roles, complementarity, limits, KaTeX validity
```

`[shared]` files are identical copies of the vector suite's core (`vector-components-explorer`
and siblings). This Bit carries only the part it uses (no arrows, no Cartesian plane), and
`core.test.ts` is the matching subset of the suite's test.

## Model

The state is `{ alpha, hyp }`: α in degrees (multiples of 0.1, in [1°, 89°]) and the hypotenuse
AB (multiples of 0.1, at least 1). A = (0, 0), C = (AB cos α, 0), B = (AB cos α, AB sen α); B
stays in the square [0, 10]², so the scale never follows the drag. `roles(ref)` maps
hyp/opp/adj to sides for the reference angle; the ratios are computed from the angle
(`ratios`) and, for the tests and the table, measured on the sides (`measuredRatios`).
`sinDeg`/`cosDeg` clean float noise, so sen 30° is exactly 0,5 and tan 45° exactly 1.

## Rendering and interaction

- Same sheet, tokens and layout as the vector suite. Colour by **role**: blue hypotenuse,
  ochre adjacent, teal opposite, violet reference angle (matching `vector-trigonometry-explorer`,
  where the adjacent leg of α is v_x and the opposite one v_y).
- Handles: B free (α to whole degrees, tenths with Shift/Alt; AB to tenths), C along the base
  (α fixed, the ray of AB dashed while dragging). Keys: on B ↑↓ change α, ←→ change AB; on C
  ←→ ↑↓ change AB.
- Labels placed by the shared greedy placer; side labels are two-line ("cateto opposto" /
  "ad α") and their width is measured with a canvas, the rest estimated.
- Ratios: one KaTeX line per ratio, words = sides = numbers ≈ value; fixed decimals (0,700);
  the name column appears with "Nomi". On a narrow panel the name goes on its own line.
- "Triangoli simili": copies at scale ½ and ¾, nested at A (they share the angle), drawn thin
  and dashed; the table is transposed (one column per triangle) so equal ratios line up.
- "Nascondi i valori" masks legs and ratios (and the remarks that would give a value away);
  the angle and AB, the data, stay. Highlighting: hover/focus a ratio, a row or a term lights
  its sides; hover a side lights its terms; a click pins.

## Limitations

- Very small triangles (AB near 1) or extreme angles crowd the labels; the copies' vertex
  labels are optional and disappear first.
- Label sizes of TeX are estimated, not measured.
