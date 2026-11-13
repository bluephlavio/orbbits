# Vettori, componenti e versori

Technical notes. Pedagogical intent: `brief.md`; classroom prose: `narrative.md`.

- Kind: interactive · Engine: react (plain SVG) + KaTeX · Public page: `/bits/vector-components-explorer/`
- Language: Italian only, strings inline
- Tests: `node --test bits/vector-components-explorer/tests/*.test.ts`, also run by `just test`
- Standalone export: `just export vector-components-explorer` → `dist/web/` (rebuildable, not versioned)
- Family: `vector-operations-explorer`, `vector-sum-magnitude-explorer` (tag `vectors`) share the
  core below, by copy.

## Structure

One state (`ArrowState`: tail A, tip B), many views. Dependencies run one way:
`ui/` reads `model/`, and `model/` knows nothing about React or pixels.

```text
src/index.tsx          composition: state, layers, mask, zoom, highlight; the panel
src/model/vec.ts       vector arithmetic; clean() removes float noise and −0      [shared]
src/model/arrow.ts     the arrow, components, projections, quadrant/axis/zero      [this Bit]
src/ui/Stage.tsx       the diagram: drawing, dragging, keyboard, label requests    [this Bit]
src/ui/formulas.ts     TeX of the relations, keys (row and term), the remarks      [this Bit]
src/ui/rulers.ts       the scalar rulers' geometry                                 [this Bit]
src/ui/view.ts         plane ↔ pixels; fixed scale                                [shared]
src/ui/plane.ts        grid lines, ticks, tick numbers as data                     [shared]
src/ui/arrow.ts        arrow geometry (exact tip), parallel tracks                 [shared]
src/ui/labels.ts       label placement                                             [shared]
src/ui/format.ts       Italian numbers as text and TeX, linear combinations        [shared]
src/ui/Tex.tsx         KaTeX, cached; trusts only \htmlClass                        [shared]
src/ui/Plane.tsx, Arrow.tsx, Label.tsx, NumberField.tsx, Rich.tsx, icons.tsx,
src/ui/useSize.ts, useTween.ts, useFullscreen.ts                                   [shared]
tests/core.test.ts     the shared core;  tests/model.test.ts  model, formulas, KaTeX validity;
tests/rulers.test.ts   rulers: zero under the tail, point under the tip, orientation
```

`[shared]` files are identical copies in the three vector Bits (Bits import only from their own
`src/`). Change them in one Bit and copy the change to the other two; `core.test.ts` is copied too.

## Rendering

- **SVG + React, no JSXGraph.** The scene needs control over every stroke, label and stacking
  rule, which a dynamic-geometry library would have to be fought for; the geometry itself is
  trivial. The SVG viewBox equals the stage's CSS size (`useSize`), so one transform (`view.ts`)
  places strokes and the HTML labels laid over them.
- **Fixed scale.** `centeredView` depends only on the stage size and the zoom level: dragging
  never rescales or recentres. Points are clamped to the visible plane instead.
- **Exact tips.** `arrowShape` puts the apex of the head on the tip and stops the shaft inside
  the head; short arrows get smaller heads; a zero-length arrow is a point.
- **Coincident arrows** (vector parallel to an axis, component on an axis, versor under a
  component) go on parallel tracks: `stackTracks` takes arrows in priority order (v⃗, versors,
  components) and moves a lower one sideways just enough to clear what it overlaps, always up
  for horizontal arrows and right for the others.
- **Components live at the arrow** (tip-to-tail: A → (x_B, y_A) → B; common tail: both from A),
  never only on the axis. The axis carries the projection: dashed perpendiculars (construction
  lines), a translucent band (the projected segment, not an arrow) and the feet.

## Scalar components: the rulers

A scalar component is a number, so it is never drawn as an arrow. The layer "Componenti
scalari" frames the plane with two oriented number lines (`rulers.ts`): below it for v_x,
beside it for v_y. They share the plane's scale; their 0 is aligned with the tail A, so the
point v_x lies exactly under the tip B and the segment from 0 to it is the projection; the
versor is drawn at 0 as the unit and the positive sense. The plane gives up the two strips
only while the layer is on (the view is recomputed then, never during a drag), and the layer
has no hover preview for that reason. The numbers on the rulers follow "Nascondi i valori".



`labels.ts` places every label greedily, by priority (axis names, v⃗, B, A, components, versors,
feet of the projections, O). Each label offers candidates in order of preference (beside its
arrow at several positions, both sides; around its point, starting away from the arrow); each
candidate costs its rank plus its collisions with the stage edges, labels already placed and
the drawing (arrows and points heavy, axes and tick numbers light). Optional labels (feet, O)
are hidden when nothing is clean. Tick numbers under a placed label are not drawn. Controls
floating over the stage (`data-reserve`) are measured and treated as walls. Label sizes are
estimates in em of the label font (`LABEL_SCALE` mirrors the CSS); KaTeX is never measured,
so a drag costs one layout pass.

## Mathematics on screen

KaTeX (root dependency, `pnpm add katex`) renders every formula and label; `Tex.tsx` caches the
HTML by source. Colour and masks are `\htmlClass{…}` classes styled in `styles.css`, the only
trusted command. Numbers go through `format.ts`: decimal comma (`{,}` in TeX), true minus,
negative factors in parentheses, `=` or `≈` decided by whether the shown digits are exact,
coefficients ±1 and 0 dropped (`texCombination`), all-zero → `\vec 0`. State values are
multiples of 0.1 (`snap`) and every arithmetic result goes through `clean`, so no `−0,0`.

## Interaction

- Tail handle, tip handle, body (translation); snap to whole units, tenths with Shift or Alt;
  arrow keys on a focused handle (tenths with Shift). When tail and tip coincide, the tip
  handle is on top, so the zero vector can be pulled open again.
- Numeric fields: x_A, y_A translate (the vector stays); v_x, v_y move the tip (the tail stays).
- Buttons glide (`useTween`, ≈ 0.4 s, instant under reduced motion); drags never do.
- Highlighting: hovering or focusing a formula sets a focus set of keys; the diagram dims the
  rest and *shows* focused objects of hidden layers in preview; hovering an object lights its
  formulas. Terms answer on their own: every symbol and term carries an `hk-<key>` class
  (`formulas.ts`), the pointer handler reads the innermost one, and the relations card exposes
  the focus as `data-focus` so CSS lights the matching terms. KaTeX's box and stretchy layers
  get `pointer-events: none`, or they would swallow the pointer. A click pins a term or a row.
- Keys: `v`, `A`, `B`, `vx`/`vy` (vector components), `sx`/`sy` (scalar components), `xh`/`yh`
  (versors), `px`/`py` (projections).
- "Nascondi i valori" masks computed values (components, moduli) in formulas, inputs and
  rulers, and hides the remarks (each would hint at a hidden value); the coordinates of A and
  B, the given data, stay.

## Limitations

- Label sizes are estimated, not measured: an unusual zoom or font may leave a few pixels of
  overlap with a halo.
- Optional labels (feet of projections, O) disappear in crowded configurations by design.
- No pan: zoom is centred on the origin, with five levels.
- The shared core is copied in three Bits. If a fourth Bit needs it, that is the moment to
  decide where shared interactive code lives (see `docs/architecture.md`, deferred work).
