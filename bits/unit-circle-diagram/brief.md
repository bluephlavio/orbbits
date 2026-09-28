# Circonferenza goniometrica e angoli notevoli — brief

Engine-independent specification. This Bit is the **static reference chart** of the unit
circle: the one page a learner keeps while doing trigonometry. The dynamic counterparts
(`unit-circle-explorer`, `angle-as-rotation`) build the concept; this figure freezes it
into something printable and projectable.

## Intent

Memorise, in one glance, the three-way association **angle ↔ radians ↔ exact coordinates**:
for every notable angle the learner should be able to read the degrees/radians equivalence
and the exact values of cosine and sine *as the coordinates of the point*, with the correct
signs, in all four quadrants.

## Essential relations

- The angle is measured counterclockwise from the positive x-axis (the sweep arcs in the
  first quadrant establish the convention once; the rest of the figure relies on it).
- Degrees and radians name the same angle: 30° = π/6, 45° = π/4, 60° = π/3, and so on.
- The coordinates of the point ARE the values: one annotation, P_θ = (cos θ, sin θ), makes
  the reading rule explicit; no per-point "cos θ = …, sin θ = …" repetition.
- Values repeat by symmetry across quadrants; only the signs change. The quadrant pattern
  must be visually identical up to reflection.

## Required elements

- Unit circle x² + y² = 1 on Cartesian axes calibrated by the circle itself: the four axis
  points carry their natural coordinates (1, 0), (0, 1), (−1, 0), (0, −1).
- The 16 notable angles 0°, 30°, 45°, 60°, 90°, …, 330°, each labelled with the
  degrees = radians pair.
- The exact coordinates of each point, symbolic only (√3/2, √2/2, 1/2 and signs), never
  decimal approximations.
- A radial hierarchy that separates the two kinds of information: angle machinery inside
  the circle, coordinates immediately outside.
- Print-first: legible in grayscale, no colour-only distinctions, no decorative elements.

### Deliberately left out

- Any dynamic behaviour (that is `unit-circle-explorer`'s job).
- Function graphs of sine/cosine, tangent, projection segments (other Bits).
- Decimal values, symmetry tables, worked examples: the figure is a reference, not a book.
- A separate legend; the single P_θ annotation replaces it.

## Didactic progression

1. Read the first quadrant: how the angle is measured (sweep arcs from the x-axis), the
   three fundamental values 30/45/60.
2. Extend by symmetry to the other quadrants: same numbers, signs change.
3. Afterwards the figure works as a lookup table during exercises.

## Misconceptions / pitfalls

- Density is the enemy: with 32 labels the figure must not degenerate into noise. Label
  collisions are a design failure, not a minor flaw.
- Signs must be explicit; Q3/Q4 must not look like copies of Q1.
- Radians must appear as exact fractions of π, not as decimals.
- The coordinates must read as a *position*, not as a separate "cos θ = / sin θ =" ritual.

## Related ideas

- `unit-circle-explorer` (interactive, same tags): the dynamic counterpart that discovers
  these values.
- `angle-as-rotation` (video): why the angle is a rotation from the positive x-axis.
- Future: a values table handout; a tangent-line construction.
