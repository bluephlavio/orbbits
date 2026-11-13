# Trigonometria e componenti di un vettore — brief

Engine-independent specification. The fourth vector Bit (tag `vectors`) and the second
trigonometry step after `right-triangle-trigonometry`: the ratios of a right triangle applied
to the Cartesian decomposition of a vector, in both directions.

## Who it is for

Students who know sen, cos, tan only as ratios of the sides of a right triangle (acute angles)
and know components from `vector-components-explorer`. No unit circle, no oriented angles,
no sen/cos of obtuse angles, no atan2.

## Intent

The right triangle O–H–P of a vector v⃗ (O the origin, P the tip, H = (v_x, 0)) carries
everything: its hypotenuse is |v⃗|, its legs are |v_x| and |v_y|, its acute angle at O is the
direction. The learner reads it both ways and learns to keep **lengths** (always positive,
from the triangle) apart from **components** (numbers with a sign, from the orientation of the
axes).

## Essential relations

- First quadrant, α the angle with the positive x half-axis: v_x = |v⃗| cos α, v_y = |v⃗| sen α
  (here components and legs coincide), straight from cos = adjacent/hyp, sen = opposite/hyp.
- Any quadrant, β the *reference angle* (acute, between v⃗ and the nearer half of the x-axis):
  |v_x| = |v⃗| cos β, |v_y| = |v⃗| sen β; then the signs from the quadrant
  (I +,+ · II −,+ · III −,− · IV +,−). In the first quadrant β = α.
- |v⃗_x| = |v_x|, |v⃗_y| = |v_y|; v⃗ = v_x x̂ + v_y ŷ (notation of the suite; never call v_x a
  "modulus of the projection").
- Inverse: |v⃗| = √(v_x² + v_y²); tan β = |v_y| / |v_x|, β = tan⁻¹(|v_y| / |v_x|); the quadrant
  from the signs of v_x and v_y. The calculator's tan⁻¹ of the signed ratio does not give the
  quadrant: (−3; 4) and (3; −4) give the same −53,1°; (−3; −4) and (3; 4) the same 53,1°.
- Special cases: v_x = 0 (vertical, β = 90°, no ratio to compute, no division), v_y = 0
  (horizontal, β = 0°), the zero vector (modulus 0, direction undefined).

## Required elements

- One Cartesian plane (same unit on both axes), v⃗ from the origin, the reference angle as a
  filled arc, quadrant numerals with the current quadrant tinted.
- Two modes on the same model and diagram: "Modulo e angolo" (data |v⃗|, α or β, quadrant) and
  "Componenti" (data v_x, v_y). Switching keeps the vector (round data in the new mode).
- "Primo quadrante" (α, the start) and "Tutti i quadranti" (β, signs).
- Layers: the triangle with the lengths of the legs; the projections with the signed values at
  the feet; the vector components as arrows. The angle is always on.
- The calculation, step by step on request ("Passaggi"), linked to the diagram by highlighting;
  a sign table of the four quadrants; short remarks (the calculator one in the inverse problem).
- Direct manipulation of the tip (snapped in polar data or on the grid, depending on the mode),
  fields for exact data, a mask for computed results (in the inverse problem it hides the
  quadrant too, on the plane as well).

## Deliberately left out

Tails away from the origin (that is `vector-components-explorer`), angles beyond 90° in sen and
cos, atan2 as a topic, radians, vector operations.

## Progression in class

1. First quadrant, modulus and angle: v_x = |v⃗| cos α from cos α = adjacent/hypotenuse.
2. Components layer: v⃗ = v_x x̂ + v_y ŷ, and the components are the legs.
3. All quadrants: the same triangle in II, III, IV; lengths from β, signs from the axes.
4. Projections: the signed values at the feet against the positive lengths of the legs.
5. Inverse problem in the first quadrant (tan α = v_y / v_x), then in the others with the
   calculator remark. Then the axes and the zero vector.

## Pitfalls to design against

- "cos of 145°": never needed; β is acute by construction.
- Negative lengths: the triangle's labels are |v_x|, |v_y| and always positive.
- tan⁻¹ of a signed ratio taken as the direction: the remark shows the counter-example live.
- Division by zero on an axis: the case is named instead of computed.
