# Operazioni con i vettori

Technical notes. Pedagogical intent: `brief.md`; classroom prose: `narrative.md`.

- Kind: interactive · Engine: react (plain SVG) + KaTeX · Public page: `/bits/vector-operations-explorer/`
- Language: Italian only, strings inline
- Tests: `node --test bits/vector-operations-explorer/tests/*.test.ts`, also run by `just test`
- Standalone export: `just export vector-operations-explorer` → `dist/web/`
- Family: shares the rendering core of `vector-components-explorer` by copy; its README explains
  the core (view, arrows, parallel tracks, labels, KaTeX, number formatting).

## Structure

```text
src/index.tsx            composition: vectors, operation, construction, motion, the panel
src/model/operations.ts  vectors (P, a⃗, b⃗, k), results, constructions as pieces, Motion
src/ui/Stage.tsx         the diagram: pieces on tracks, parallelogram, x/y steps, handles
src/ui/formulas.ts       relations, remarks, the Cartesian reading (`algebra`, `columns`)
tests/model.test.ts      constructions agree, degenerate cases, steps, algebra, KaTeX validity
(the other files are the shared core, see vector-components-explorer/README.md)
```

## Constructions as data

`pieces(state, op, motion)` returns the arrows to draw, each with a role (original, copy,
opposite, result), a key for highlighting and its TeX name. A copy shares key and name with
its original: it is the same vector, drawn lighter and dashed. The tests check that every copy
is its original translated, that all sum constructions end at P + a⃗ + b⃗, and that a⃗ + (−b⃗)
and the arrow between the tips are the same vector, in the right sense.

Transitions are part of the model: `Motion` holds how far each copy has travelled (0 = on its
original, hidden; 1 = in place), how far b⃗ has turned into −b⃗ (drawn as (1 − 2·flip) b⃗, so it
passes through the zero vector, as multiplication by −1 does), and where a⃗ − b⃗ is applied.
`index.tsx` only tweens `Motion` (`useTween`). The difference stages two steps on one tween:
first b⃗ flips, then the copy travels; going back, the copy returns first. Selecting an
operation replays its construction from rest; switching construction glides from where it is.

## Constructions seen together

The sum always shows its tip-to-tail copy (of b⃗ at the tip of a⃗, or of a⃗ at the tip of b⃗
for b⃗ + a⃗). "Parallelogramma" adds, on top, a light shaded parallelogram with dashed far sides
(`auxiliary`); the side under the tip-to-tail copy fades out, so nothing is drawn twice. In the
difference the same toggle shows both diagonals: a⃗ + b⃗ from the common tail (role
`secondary`, lighter) and a⃗ − b⃗ from the tip of b⃗ to the tip of a⃗ — the result itself in
"Fra le punte", a translated copy of it in "a⃗ + (−b⃗)", where the result is applied at P.
A degenerate parallelogram (`degenerate`: |a⃗ × b⃗| < 1e-9) is not drawn and a remark says why.

## The Cartesian reading

`algebra()` writes the operation in components as a three-column KaTeX array (left side,
"= x column", "y column"; KaTeX has no `@{}` column specs, and `aligned` spaces the columns
too far apart): the vectors, the general rule, the numbers, the result. Numbers carry the
colour of their vector; adding a negative is written as a subtraction, subtracting one keeps
brackets; ±1 and 0 coefficients follow `columns()`. With values hidden, only the last line is
masked. Pointing at a column (`hk-x`, `hk-y`) draws on the diagram the steps of the
construction along that direction (`steps` in the model): bands laid end to end from P on the
line through P, the result on a parallel track, dashed drops from the tips; the arrows fade
rather than dim. The NumberFields above it edit the components directly.

## Layout of k a⃗

k a⃗ always runs on its own track beside a⃗ (fixed offset along `trackNormal`), so a⃗ and k a⃗
can be compared at k = 1, 0 < k < 1 or k > 1, and so that nothing jumps when k changes sign.
The line of a⃗ is drawn dashed across the stage; small ticks on k a⃗ mark whole multiples of a⃗.
The tip of k a⃗ is a handle: dragging it sets k from the projection on the line of a⃗.

## Limitations

- The common tail is draggable but not editable numerically (the components are what matter).
- k is limited to [−3, 3]; large a⃗ with large |k| leaves the stage (zoom out).
- With a⃗ ∥ b⃗ the stacked tracks keep everything visible, but the picture is busier than usual.
- The difference with the parallelogram in "a⃗ + (−b⃗)" mode shows seven arrows: complete but
  dense; "Fra le punte" is the lighter view of the diagonals.
