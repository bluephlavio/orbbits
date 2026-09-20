# Esplora la circonferenza goniometrica — brief

Engine-independent specification. This Bit explores the **function concept** through multiple
synchronized representations of a single mathematical state (the angle α).

## Intent

Sine and cosine are functions: each input α determines exactly one output value. The learner
should experience this through simultaneous geometric, numerical, symbolic and graphical views,
all synchronized through the same underlying angle.

The pedagogical progression is: **movement on a circle → changing coordinates → numerical pairs
→ points plotted on a graph → understanding sine and cosine as functions**.

This Bit helps students transitioning between the third and fourth years of upper-secondary
mathematics, consolidating the relationship between angle and trigonometric values.

## Essential relations

- A point P on the unit circle, moving as the angle α changes.
- The coordinates of P are (x_P, y_P), where x_P and y_P live in [−1, 1].
- These coordinates ARE sine and cosine: x_P = cos α, y_P = sin α.
- For each angle α, there is exactly one point P and exactly one pair of values (x_P, y_P).
- As α increases, the pairs (α, x_P) and (α, y_P) trace curves on a graph.
- α can be measured in degrees or radians; the relationships remain the same.

## Required elements

### Geometric view
- Unit circle with axes and clear tick marks.
- Draggable point P on the circle.
- Angle α marked at the origin.
- Projections (segments from P to axes) shown in two colors (cos = red, sin = teal).
- Clear visual connection between the moving point and changing coordinates.

### Numerical / Observational view
- A table accumulating (α, x_P, y_P) observations as the learner moves P.
- Notable angles (0°, 30°, 45°, 60°, 90°, etc.) recorded automatically.
- Latest observation highlighted.
- Clicking a row restores that angle.

### Symbolic view
- Displays P = (x_P, y_P) with current numerical values (primary).
- Shows the naming step: x_P = cos α, y_P = sin α (secondary, visually quieter).
- Angle α displayed in both degrees and π notation.

### Function graphs
- Two Cartesian plots, vertically stacked, sharing an α-axis.
- sin(α) and cos(α) curves, with points traced as the learner moves P.
- Current point highlighted on both graphs.
- Faint reference curves show the complete functions without giving away discovery.

## Deliberately left out

- Tangent and other trigonometric functions (separate Bit).
- The right triangle as the main object; it is a consequence, not the definition.
- Parametrization of the views (learner sees all representations simultaneously).
- Fixed sampling rates for the table; instead, notable angles and pauses.

## Didactic progression

1. **Drag P slowly and observe:** the circle, coordinates, and table accumulate observations.
2. **Stop at notable angles:** 0°, 90°, 180°, 270° — read exact values from projections and table.
3. **Notice the naming:** "These coordinates are what we call cosine and sine."
4. **Watch the graphs:** as P moves, points accumulate on two curves — you are tracing functions.
5. **See the connection:** the same α generates one point on each graph and one point on the circle.

## Misconceptions / pitfalls

- Do not let P leave the circle.
- Do not hide the signs of the coordinates; negative must be visible in direction.
- Do not present cos α and sin α as separate objects; they are coordinates obtained by reading one point.
- Do not make the curves appear all at once; discovery comes from tracing.
- Do not overwhelm with controls; dragging is primary.

## Related ideas

- `angle-as-rotation` (video): a narrated version of the same concept, same tags.
- `unit-circle-diagram` (figure): a static frozen moment (future).
- Function notation, mapping diagrams, rate of change of sine/cosine (future, other Bits).
