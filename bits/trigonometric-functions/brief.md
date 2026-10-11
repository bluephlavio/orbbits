# Funzioni goniometriche — brief

Engine-independent specification. Related to `unit-circle-explorer`, adapted to a
controlled sequence with pauses and evaluated coordinate expressions.

## Intent

Make the learner see sine and cosine as the signed coordinates of a rotating point P.
The same rotation, read where the line OP meets x = 1, gives Q and its tangent ordinate.
Connect each function expression to its value without making the learner consult a
separate table.

## Essential relations

- P rotates counter-clockwise on the unit circle, from the positive x-axis.
- P = (cos α, sin α); both projections begin at the origin and retain their signs.
- The line through O and P meets x = 1 at Q = (1, tan α), on either ray.
- Q leaves the visible scene near 90° and 270°; at those angles tangent is undefined.
- After a full turn P and Q both return to (1, 0).

## Required elements

- No on-screen title; labelled axes, circle, radius OP, P and rotation arc.
- Dashed projections and thick signed axis segments (cosine red, sine teal).
- Grey tangent line x = 1, Q and its purple ordinate segment, introduced at 20°.
- Only two coordinate expressions at the right: P(cos 20°, sin 20°), Q(1, tan 20°),
  with the angle updated during rotation. An underbrace below each function carries its
  evaluated value (two decimals). At 270°, the tangent value reads “non definita”.
- Pauses at 20°, 45°, 150°, 270° and 360°. The final state is also the poster.
- Point labels must remain distinct, including when the points coincide. Stationary
  labels must clear axes, circle, tangent and other labels; positioning changes smoothly.
  Use the same, approximately constant distance from each point to its label. Adapt the
  direction continuously to the construction: P outside the circle, Q to the right of
  the tangent. Any exception must address a specific collision, not change proximity
  arbitrarily. Transient crossings must remain legible; all pauses must be clear.

Deliberately left out: graphs of the functions, separate numeric tables and general
formulas added to the closing frame.

## Didactic progression

1. Introduce axes and circle, P at 0°, its projections and its coordinate expression.
2. Rotate to 20°, pause, introduce x = 1 and Q with its coordinate expression.
3. Rotate to 45°: the two coordinates of P agree, while Q has ordinate 1.
4. Rotate to 150°: cosine and tangent are negative, sine remains positive.
5. Rotate to 270°: sine is −1 and cosine is 0; Q has left the frame and tangent is undefined.
6. Complete the turn to 360°: both points are at (1, 0), with distinct labels and expressions.

## Misconceptions / pitfalls

- Values vary continuously between pauses; use smooth movement and no abrupt label switches.
- The signed projections must remain visible throughout the rotation.
- When cos α < 0, OQ points opposite to OP: both belong to the same line, not the same ray.
- A Q outside the picture may still exist; distinguish that from an undefined tangent.
- Numerical angle rounding during movement must not obscure exact agreement at the stops.
- P and Q coincide at the end but their names must remain separately legible, off the x-axis.

## Related ideas

- `unit-circle-explorer`: the same picture driven by the learner.
- `unit-circle-diagram`: a static reference for the coordinate interpretation.
- Unrolling the angle on a horizontal axis leads to the graphs of sine and cosine.
