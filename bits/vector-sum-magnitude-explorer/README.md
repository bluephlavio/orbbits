# Il modulo della somma

Technical notes. Pedagogical intent: `brief.md`; classroom prose: `narrative.md`.

- Kind: interactive · Engine: react (plain SVG) + KaTeX · Public page: `/bits/vector-sum-magnitude-explorer/`
- Language: Italian only, strings inline
- Tests: `node --test bits/vector-sum-magnitude-explorer/tests/*.test.ts`, also run by `just test`
- Standalone export: `just export vector-sum-magnitude-explorer` → `dist/web/`
- Family: shares the rendering core of `vector-components-explorer` by copy; its README explains
  the core (view, arrows, parallel tracks, labels, KaTeX, number formatting).

## Structure

```text
src/index.tsx           composition: config, sliders, case buttons, readout, range bar, curve
src/model/magnitude.ts  |a⃗|, |b⃗|, α; exact special angles; cases; snapping for the drag
src/ui/Stage.tsx        the diagram: arrows on tracks, triangle, arc or right-angle marks
src/ui/formulas.ts      the case readout with numbers; inequality and cosine rule
tests/model.test.ts     exact cases, agreement of rules and components, monotonicity, readouts
```

## Decisions

- **Model.** a⃗ lies along the positive x direction from O, b⃗ is turned by α ∈ [0°, 180°].
  `cosSinDeg` is exact at multiples of 90°, so at 90° the components give exactly
  √(|a⃗|² + |b⃗|²), and at 180° with equal moduli the sum is exactly the zero vector (a point).
- **Cases are exact angles.** `caseOf` recognises 0°, 90° and 180° only (|Δ| < 1e-9); 89° is the
  general case. The slider and the drag give whole degrees, and the drag pulls onto 0°, 90°,
  180° within 3°; during a glide α is fractional and the readout follows it continuously.
- **`sumModulus`** uses the elementary rule in the special cases and the components otherwise;
  the tests check that both agree with the cosine rule at every 7.5°.
- **Fixed view.** `fitView` fits the largest configuration (both moduli at the maximum, any α)
  once, so nothing rescales while α turns; the construction sits a third from the left.
- **Layout.** The construction is wide and low: the stage spans the width (2 : 1, 16 : 9 on
  narrow screens) and the controls sit underneath, unlike the two sibling Bits.
- **Glides.** The case buttons rotate b⃗ to the special angle at about 7 ms per degree (up to
  1.4 s), so the continuous change of |a⃗ + b⃗| is visible on the way.
- **Angle mark.** An arc of radius proportional to the shorter vector (16–46 px), or at exactly
  90° two right-angle squares (at O and at the tip of a⃗, inside the tip-to-tail triangle,
  which is then shaded a little stronger).
- **Optional deepening.** The inequality with numbers, the cosine rule (worked out unless the
  values are hidden) and |a⃗ + b⃗| as a function of α. It is closed at the start and on reset.

## Limitations

- Moduli from 0.5 to 5 in steps of 0.5: enough for the cases, not a general calculator.
- On a phone in portrait the stage is small (the view must fit 16 × 7 units); landscape or
  fullscreen is better.
