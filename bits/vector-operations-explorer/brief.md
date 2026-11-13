# Operazioni con i vettori — brief

Engine-independent specification. Second of three sibling Bits on vectors (tag `vectors`;
`vector-components-explorer` before it, `vector-sum-magnitude-explorer` after). Leaner than the
first: the focus is the geometric meaning of three operations, not components.

## Intent

The learner should see an operation as a construction with arrows, and see that different
constructions of the same operation give the same vector:

- sum: tip-to-tail and parallelogram agree; a⃗ + b⃗ = b⃗ + a⃗;
- difference: a⃗ − b⃗ = a⃗ + (−b⃗), and with common tails it is the arrow from the tip of b⃗ to the
  tip of a⃗;
- multiplication by a scalar: k a⃗ keeps the direction, keeps the sense for k > 0, reverses it
  for k < 0, is the zero vector for k = 0, and |k a⃗| = |k| |a⃗|.

## Essential relations

- A translated copy is the same vector, drawn somewhere else: same colour and label as the
  original, visibly a copy (lighter), and the construction shows it travelling there.
- The result of every construction is the same arrow; switching constructions moves the
  arrow without changing it.
- Working in components makes the operations arithmetic: x with x, y with y. It stays in a
  panel that the teacher opens; the diagram answers when a column is pointed at.

## Required elements

- a⃗ and b⃗ with common tail, tips draggable on the grid; the common tail draggable.
- Operation selector (sum, difference, scalar), always one click away.
- Sum: tip-to-tail always (order a⃗ + b⃗ or b⃗ + a⃗), and on request the parallelogram as a light
  dashed construction on top, so both methods are seen reaching the same arrow.
- Difference: a⃗ + (−b⃗) with −b⃗ and its copy, or the direct arrow between the tips; with the
  parallelogram, its two diagonals: a⃗ + b⃗ from the common tail, a⃗ − b⃗ from the tip of b⃗ to
  the tip of a⃗ (a translated copy of the result, when the result is drawn at the tail).
- Degenerate parallelograms (parallel, opposite, coincident or zero vectors) are not drawn, and
  a remark says why; the vectors themselves stay right.
- The same operation in components, step by step with the actual numbers
  (a⃗ + b⃗ = (a_x + b_x) x̂ + (a_y + b_y) ŷ = (2 + 4) x̂ + (3 − 1) ŷ = 6 x̂ + 2 ŷ), x and y in two
  columns; pointing at a column shows, on the diagram, the steps along that direction adding
  up like numbers on a line.
- Scalar: a slider for k across negative, zero and positive values; a⃗ and k a⃗ side by side,
  on parallel tracks, so both can be read at once even when they overlap.
- Short transitions (≈ 0.4 s) when a construction changes; none while dragging.
- Hide the result's values for a prediction, keeping the geometry. Reset.

## Deliberately left out

- Projections, versors, coordinates of points: they belong to `vector-components-explorer`.
- Dot and cross products, linear combinations of more than two vectors.

## Pitfalls to design against

- A copy that looks like a third vector: same colour and label, lighter, and an animation
  that shows it is a translation.
- Difference drawn in the wrong sense (from a⃗ to b⃗): the formula and the arrow must agree.
- k a⃗ hidden under a⃗ when k = 1 or 0 < k < 1: parallel tracks.
- −0 in readouts, a "zero vector" with a direction, k = 0 drawn as an arrow.
