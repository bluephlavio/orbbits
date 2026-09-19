# Angolo come rotazione — brief

Engine-independent specification. Same concept as the interactive `unit-circle-explorer`,
adapted to what a short narrated animation does best: a controlled sequence with pauses.

## Intent

Make the learner *see* that as the angle of rotation grows, cos θ and sin θ change together
as the two shadows of a rotating point — and that P = (cos θ, sin θ) is a fact of the picture,
not a formula to memorise.

## Essential relations

- P rotates on the unit circle, counter-clockwise from the positive x-axis.
- The horizontal shadow of P is cos θ, the vertical shadow is sin θ; both are signed.
- The numbers in the readout and the lengths on the axes change together, continuously.
- After a full turn the values return to where they started.

## Required elements

- Title "Angolo come rotazione".
- Axes, unit circle, the radius OP, the point P, the angle arc θ.
- Projections as thick coloured segments on the axes (cos red, sin teal, as in related Bits)
  with dashed drops from P.
- A live numeric readout of cos θ and sin θ (two decimals) beside the figure.
- Pauses at notable angles so the teacher can talk: π/3, 5π/6, 3π/2, 2π.
- Closing formula P = (cos θ, sin θ) with the two colours; the last frame is the poster.

Deliberately left out: degrees (the animation speaks radians only), the tangent, the graphs
of sin and cos.

## Didactic progression

1. Stage: axes and circle appear, then P at θ = 0 with its radius.
2. The two projections and the readout appear while P is still (cos = 1, sin = 0).
3. Rotate to π/3 (both shadows visible), pause.
4. Rotate to 5π/6: the cosine shadow crosses the origin and becomes negative, pause.
5. Rotate to 3π/2: sine reaches −1, cosine is 0, pause.
6. Complete the turn to 2π: back to (1, 0).
7. Conclusion: P = (cos θ, sin θ).

## Misconceptions / pitfalls

- P must move at a visibly uniform speed within each segment; sudden jumps would suggest
  the values are discrete.
- The shadows must be drawn *from the origin*, so their sign is a direction, not a rule.
- Do not fade the projections during the rotation; they are the point of the Bit.

## Related ideas

- `unit-circle-explorer` (interactive, same tags): the same picture, driven by the learner.
- Continuation: unrolling θ on a horizontal axis to obtain the graphs of sin and cos.
