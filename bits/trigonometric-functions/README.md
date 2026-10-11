# Trigonometric functions

Technical notes. Pedagogical intent: `brief.md`; classroom prose: `narrative.md`.

- Kind: video · Engine: Manim · Public page: `/bits/trigonometric-functions/`
- Source: `src/scene.py` (scene `TrigonometricFunctions`)
- Outputs: `dist/trigonometric-functions.mp4` (1080p60, 27.3 s, 1.7 MB), `dist/poster.webp` (last frame)

## Workflow

```bash
just build trigonometric-functions --quick
just build trigonometric-functions
just check trigonometric-functions
```

## Implementation notes

- One angle tracker drives P, projections, the rotation arc, Q and coordinate expressions.
- The angle is displayed in degrees, rounded to an integer during motion. Values use the
  continuous angle and two decimals; both agree at every pause (20°, 45°, 150°, 270°, 360°).
- The right panel contains only P(cos …°, sin …°) and Q(1, tan …°). Each function has an
  underbrace with its numerical value. There is no separate value table or final formula.
- Static TeX is built once. Updaters move labels and update numerical glyphs in place.
- P and Q use the same fixed point-to-label-center distance, `LABEL_DISTANCE = 0.50`.
  Only their directions change. Two small authored angular paths use SciPy's PCHIP
  interpolation (already a Manim dependency) for continuous direction and angular
  velocity without overshoot. From 45° onward P's direction is the rotation angle + 45°;
  the opening transition holds the upper-right sector until 20°, then joins that rule
  while clearing the extended radius. P stays outside the circle. Q stays in the right
  to lower-right sector (−45° to 0°), turning gradually as the construction changes.
  At 0°/360° P is upper-right
  and Q lower-right, so the labels remain distinct even when the points coincide.
  Small opaque backgrounds keep unavoidable moving crossings legible; all pauses
  must clear the construction.
- Layout validation samples the complete turn every 0.1° with the actual label boxes:
  both center distances remain 0.50, P never crosses the circle, the labels stay separate,
  and the pauses clear axes, projections, the circle, the tangent and the extended radius.
  Moving crossings of axes and the tangent are checked in the rendered preview.
- Coordinate updaters read the group passed to them, including Manim's animation copies;
  they never reposition children captured from another group during a fade.
- Q and its label fade before leaving the frame. The extended radius and tangent segment
  are clipped to the visible vertical range, avoiding huge coordinates at asymptotes.
  At 270° the tangent annotation reads “non definita”; finite off-screen Q values remain
  available in the panel. The tangent's numeric value fades near singularities.
- Colours: `BLUE` circle, `YELLOW` moving geometry, `RED` cosine, `TEAL` sine, `PURPLE` tangent.
- MathTex requires LaTeX; ffmpeg extracts the poster. No audio: narration is live.
