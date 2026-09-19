# Esplora la circonferenza goniometrica — brief

Engine-independent specification of the concept. The Manim Bit `angle-as-rotation` tells the
same story as a video; a future `unit-circle-diagram` (figure) would freeze one instant of it.

## Intent

Sine and cosine are the **coordinates of a point that rotates** on the unit circle. The
learner should stop thinking of them as "ratios in a right triangle" only, and see that they
are functions of an angle of rotation, defined for every angle, periodic by construction.

## Essential relations

- P lies on the circle of radius 1 centred at O; the angle θ is measured from the positive
  x-axis, counter-clockwise.
- cos θ is the signed length of the horizontal projection OP_x; sin θ is the signed length of
  the vertical projection OP_y. Both live in [−1, 1] and are read on the axes.
- P = (cos θ, sin θ). The two projections *are* the coordinates: nothing else needs to be
  computed.
- θ in degrees and in radians (as a multiple of π) refer to the same rotation.

## Required elements

- The unit circle with axes and ticks at 0.5 so the values can be read off.
- A draggable point P on the circle (constrained to the circle, never free in the plane).
- The radius OP, the angle mark θ at O, the two projections as thick coloured segments on the
  axes (cos: red, sin: teal — the same pairing used across related Bits), dashed drops from
  P to the axes.
- A live numeric readout of θ (degrees and radians), cos θ, sin θ.
- A way to set θ precisely (slider) and a reset.
- Labels in Italian: "cos θ", "sin θ", "θ".

Deliberately left out: the tangent, the right triangle as the primary object, the graph of
sin/cos as functions (that is a different Bit).

## Didactic progression

1. Start at a "generic" angle (≈ 40°) so both projections are visible and unequal.
2. Drag P slowly: watch one projection shrink while the other grows.
3. Stop at 0°, 90°, 180°, 270°: read the values 1, 0, −1 and connect them to the picture.
4. Cross into the second quadrant: cos θ becomes negative *because the projection points left*,
   not because of a rule.
5. Complete a full turn: the values repeat — periodicity is visible before it is named.

## Misconceptions / pitfalls

- Do not let P leave the circle (a free point would suggest sin/cos depend on the distance).
- Do not draw the projections as unsigned lengths only; the sign must be visible as direction.
- Do not show the right triangle as the main object: the triangle is a *consequence* of the
  projections, not their definition.
- Keep the aspect ratio 1:1, otherwise the circle looks like an ellipse and the projections lie.

## Related ideas

- `angle-as-rotation` (video, same tags): the narrated version of steps 2–5.
- Graphs of sin and cos as θ grows; radians as arc length; the tangent line at (1, 0).
