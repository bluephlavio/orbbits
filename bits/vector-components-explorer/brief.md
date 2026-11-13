# Vettori, componenti e versori — brief

Engine-independent specification. First of three sibling Bits introducing vectors in upper
secondary Mathematics and Physics (tag `vectors`): this one is about *what a vector is* in a
Cartesian plane; `vector-operations-explorer` is about operations; `vector-sum-magnitude-explorer`
about the magnitude of a sum.

## Intent

A precision blackboard for a dialogued lesson, not a guided exercise. The teacher moves the
arrow, asks for a prediction, then reveals or measures. The learner should come away with one
relation at the centre:

    v⃗ = v_x x̂ + v_y ŷ

and with the distinctions it depends on: an arrow is drawn somewhere, a vector is not; a scalar
component is a signed number; a vector component is a vector.

## Essential relations

- A free vector v⃗ drawn as an arrow from tail A to tip B. Translating the arrow rigidly changes
  A and B and changes nothing about v⃗ (modulus, direction, sense, components).
- v_x = x_B − x_A, v_y = y_B − y_A. They equal the coordinates of B only when A is the origin.
- x̂, ŷ: unit vectors along the positive axes, drawn as real arrows of length 1.
- v⃗_x = v_x x̂, v⃗_y = v_y ŷ, v⃗ = v⃗_x + v⃗_y, hence v⃗ = v_x x̂ + v_y ŷ.
- Scalar components carry a sign; |v⃗_x| = |v_x|. If v_x < 0, v⃗_x points against x̂ and still
  has a positive modulus. Never say "the components are the lengths of the projections".
- |v⃗| = √(v_x² + v_y²).

## Required elements

- A large Cartesian plane (orthogonal axes, same unit), the arrow, its tail and tip.
- Direct manipulation: drag the tail, drag the tip, drag the body to translate; tail to origin.
- Exact values: numeric v_x, v_y (moving the tip) and x_A, y_A (translating the arrow).
- Layers, each off at the start: versors, vector components, scalar components, orthogonal
  projections onto the axes, coordinates of A and B. Vector components drawn tip-to-tail (the
  right triangle) or with common tail (the rectangle whose diagonal is v⃗).
- Scalar components as what they are, signed numbers: points on two oriented number lines
  framing the plane (below for v_x, beside for v_y), with the plane's scale, the orientation of
  x̂ and ŷ drawn at their 0, and their 0 under the tail, so the point sits under the tip. Read
  together with the arrow above: v_x, x̂ and v⃗_x = v_x x̂ at once, and for v_x < 0 the point is
  left of 0 while x̂ points right.
- Projections: auxiliary perpendicular lines (dashed, neutral), the projected segment on the
  axis (a segment, not an arrow), and the vector component (an arrow, at the arrow): three
  visual grammars for three kinds of object.
- Formulas that update with the diagram, linked both ways: pointing at a formula highlights
  its objects (and shows them if hidden), pointing at an object highlights its formulas; inside
  a formula each term answers on its own (v_x the scalar, x̂ the versor, v_x x̂ the component).
- Words used strictly: componente scalare (a number), componente vettoriale (a vector, the
  orthogonal projection of v⃗ on the axis direction), proiezione ortogonale, modulo, versore.
- A way to hide the computed values while keeping the geometry, for predictions.

## Deliberately left out

- The versor of v⃗ (only the axis versors for now), oblique bases, change of frame.
- Angles and trigonometry: direction is read from the components here.
- Presets: four quadrants, zero components and the zero vector are all a drag away.

## Progression in class

1. Only the arrow: move the tip into each quadrant; translate it; "what changed?"
2. Coordinates on: A and B change under translation, v_x and v_y do not; tail to origin.
3. Projections: the projected segment on each axis has a signed length, x_B − x_A.
4. Versors, then components: v⃗_x = v_x x̂; drag the tip left of the tail: v_x < 0, v⃗_x points
   against x̂, |v⃗_x| still positive.
5. The boxed relation; switch tip-to-tail ↔ common tail (sum of vectors, previewed).

## Pitfalls to design against

- Confusing the coordinates of B with the components (start with A away from the origin).
- Reading scalar components as lengths: show negative values with a true minus, never "−0".
- Drawing the component vector "on the axis" only when the tail is at the origin: the
  component lives at the arrow; the axis carries its projection.
- Coincident objects (vector parallel to an axis, components on the axis, zero vector) must
  stay distinguishable: offset collinear arrows, a point for the zero vector.
