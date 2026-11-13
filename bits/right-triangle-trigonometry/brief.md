# Triangoli rettangoli e rapporti trigonometrici — brief

Engine-independent specification. The first step of a path that ends in the vector suite (tag
`vectors`): similar right triangles → ratios that depend only on the angle → sen, cos, tan →
the components of a vector (`vector-trigonometry-explorer`) → the inverse problem.

## Who it is for

Students who study vectors in Physics before meeting trigonometric functions in Mathematics:
no unit circle, no oriented angles, no radians, no identities. Only right triangles,
similarity and constant ratios. Acute angles only; 0° and 90° are not triangles.

## Intent

First the phenomenon, then the word. With one acute angle fixed, every right triangle with
that angle is similar to every other: the sides change with the size, the ratios between
corresponding sides do not. Those ratios depend only on the angle, so they deserve a name:
sen, cos, tan. A lab for a dialogued lesson, not a guided path.

## Essential relations

- Right triangle ABC, right angle in C, α in A, β = 90° − α in B; AB the hypotenuse (the side
  opposite the right angle, always the same).
- Opposite and adjacent are relative to the angle chosen as reference: for α the opposite leg
  is BC and the adjacent one AC; for β they swap. The hypotenuse does not.
- sen α = opposto / ipotenusa, cos α = adiacente / ipotenusa, tan α = opposto / adiacente.
- Same angle ⇒ same ratios, whatever the size (similar triangles).
- For acute angles 0 < sen, cos < 1 (a leg is shorter than the hypotenuse); tan may exceed 1
  (from 45° on, the opposite leg is the longer one); tan 45° = 1.
- Complementary angles swap sen and cos: sen β = cos α, cos β = sen α.

## Required elements

- One large right triangle with its sides named by role (colour follows the role, so the legs
  swap colours when the reference angle changes), the reference angle filled, the other angle
  as a thin arc, the right-angle square, vertices A, B, C.
- Direct manipulation: B free (angle and size), C along the base (size only, same angle, the
  ray of AB shown while dragging). Exact values by fields; presets 30°, 45°, 60°.
- Lengths on the sides (switchable), three ratios with live values, written first as
  "opposto / ipotenusa" with the sides and the numbers, and on request with their names.
- Similar copies (scale ½ and ¾) inside the triangle, light and dashed, and a table that puts
  the three triangles side by side: lengths that differ, ratios that line up equal.
- Highlighting both ways between ratios and sides; a mask for computed values.

## Deliberately left out

The unit circle, angles beyond 90°, radians, inverse functions (they come with the vectors),
identities beyond complementarity, rotated triangles (the reference switch does that work).

## Progression in class

1. Lengths on, names off. Drag C: the triangle grows, the angle stays; what changes, what not?
2. Triangoli simili: three triangles, one angle. Read the table row by row.
3. Change the angle (drag B, or 30°/45°/60°): the ratios change now. They depend on the angle.
4. Names on: sen, cos, tan are those ratios. 45°: tan = 1. Steeper: tan > 1, sen and cos never.
5. Riferimento β: the legs swap roles and colours; sen β = cos α.

## Pitfalls to design against

- "Opposite" read as "the vertical side": the reference switch and role colours prevent it.
- Ratios computed from rounded lengths: values come from the angle, shown with fixed decimals
  (0,700, not 0,7), "=" only when exact.
- The copies must not compete with the main triangle: thin, dashed, no labels on their sides.
- Degenerate triangles: angles are kept in [1°, 89°] and the triangle inside its square.
