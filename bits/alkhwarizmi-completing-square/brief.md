# Completare il quadrato con al-Khwarizmi — brief

Engine-independent specification. A static figure is the right medium: the argument is a
single picture that must be readable at a glance and printable.

## Intent

"Completing the square" is literally completing a square. The learner should see that the
algebraic step x² + 10x + 25 = 39 + 25 corresponds to adding a 5 × 5 corner to an L-shaped
figure, and that the method has a history (al-Khwarizmi, c. 820) older than the notation.

## Essential relations

- A square of side x (area x²) plus two rectangles 5 × x (together 10x) form an L-shape of
  area x² + 10x = 39.
- The missing corner is a square of side 5, area 25.
- The completed figure is a square of side x + 5, area 39 + 25 = 64, hence x + 5 = 8, x = 3.
- The coefficient 10 is split in *two* halves of 5: this is why "half the coefficient" appears
  in the algebra.

## Required elements

- The three pieces in three colours (x² primary, the two 5x accent, the corner muted/dashed),
  labelled with their areas.
- Dimension braces: x and 5 on both sides, x + 5 on the completed square.
- The algebra alongside, line by line, matching the geometry:
  x² + 10x = 39 → x² + 10x + 25 = 39 + 25 → (x + 5)² = 64 → x = 3.
- Drawn *to scale* with the actual solution (x = 3) so the picture is honest.

Deliberately left out: the general case (ax² + bx = c), negative roots, the quadratic formula.

## Didactic progression

1. Read the L-shape as x² + 10x, one region at a time.
2. Ask what is missing to make a square; measure the corner (5 × 5).
3. Add 25 to *both* the figure and the equation.
4. Read the big square: side x + 5, area 64, side 8, so x = 3.

## Misconceptions / pitfalls

- Do not split 10x into one rectangle 10 × x: the corner would not be a square and the
  "half the coefficient" step would be invisible.
- The figure must be to scale; a schematic with arbitrary proportions undermines the "measure
  the corner" step.
- Do not present the dashed corner as "already there": it is *added*, in the figure and in
  the equation.

## Related ideas

- Geometric algebra in Euclid (Elements II.4), Cardano's cube completion.
- A future interactive with a slider for the coefficient would show the corner growing as
  (b/2)²; a handout with the original text (annotated source) would pair with this figure.
