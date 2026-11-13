# Il modulo della somma — brief

Engine-independent specification. Third of three sibling Bits on vectors (tag `vectors`).

## Intent

In general |a⃗ + b⃗| ≠ |a⃗| + |b⃗|. With the moduli of the addends fixed, the modulus of the sum
depends on the angle α between them: largest when they are parallel and concordant, smallest
when discordant, and in between it changes continuously. Three configurations can be computed
with elementary tools:

| α | configuration | |a⃗ + b⃗| |
|---|---------------|---------|
| 0° | parallel, concordant | |a⃗| + |b⃗| |
| 180° | parallel, discordant | ‖a⃗| − |b⃗‖ (zero when the moduli are equal) |
| 90° | perpendicular | √(|a⃗|² + |b⃗|²), Pythagoras on the tip-to-tail triangle |

For any other angle these three rules do not apply directly: one needs further tools, for
example the Cartesian decomposition. The value is still there and the Bit shows it; the cosine
rule is an optional deepening, never required (some learners have no trigonometry yet).

## Essential relations

- The tip-to-tail path has length |a⃗| + |b⃗|; a⃗ + b⃗ is the straight line between the same
  endpoints. That is why |a⃗ + b⃗| ≤ |a⃗| + |b⃗|, with equality only when the path is straight.
- The angle is the one between the two vectors drawn with a common tail, from 0° to 180°.
- Continuous variation of α matters more than the three special values.

## Required elements

- a⃗ and b⃗ from a common tail, a⃗ + b⃗, the copy of b⃗ at the tip of a⃗ (the triangle),
  optionally the parallelogram.
- Controls: |a⃗|, |b⃗|, α (0°–180°); three buttons for 0°, 90°, 180° that rotate b⃗ there
  continuously; dragging the tip of b⃗ sets α and |b⃗|, the tip of a⃗ sets |a⃗|.
- The angle arc at the common tail; a correctly proportioned right-angle mark at 90°
  (at the tail and in the triangle).
- A case readout: the special formula with numbers, or "caso generale" with the computed value.
- A discreet range bar: where |a⃗ + b⃗| sits between ‖a⃗| − |b⃗‖ and |a⃗| + |b⃗|.
- Optional deepening: the inequality, the cosine rule, |a⃗ + b⃗| as a function of α.
- Hide the result's value for a prediction. Reset.

## Pitfalls to design against

- Saying the general case "cannot be computed". It can: with other tools.
- Treating 89° as 90°: the special cases are exact; near them the case is general.
- Floating-point artefacts: cos 90° is not exactly 0 in floating point; |a⃗ + b⃗| = 0 at 180°
  with equal moduli must be exactly 0 and drawn as a point.
- Using θ: the angle is α throughout the family.
