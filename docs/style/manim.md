# Manim style

Conventions for `engine: manim` Bits. Reference implementation: `bits/angle-as-rotation`.

## Frame and output

- 16:9, rendered at 1080p60 by `orbbits build` (`-qh`); `--quick` gives 480p15 in `.build/`.
- Output: `dist/<id>.mp4` plus `dist/poster.webp` (last frame by default: the final state is
  what a slide or catalog should show). Keep videos short (20–90 s); split ideas into Bits
  rather than making one long film.
- Dark background (Manim default). Do not change the background per Bit.

## Palette

`BLUE` for primary geometry, `YELLOW` for the moving/active element, `RED`/`TEAL` for paired
quantities (e.g. cos/sin), `GREY_B` for axes and construction lines. Colour means something;
do not decorate.

## Typography

- Titles: `Text(..., font_size=40)` at the top edge. Mathematics: `MathTex`, never `Text`.
- Labels ≥ 36 pt at 1080p; classroom projectors are worse than your monitor.
- Live numbers: `DecimalNumber` with an updater, 2 decimals unless the lesson needs more.
- Language of on-screen text: Italian by default (`language: it`); mathematics is universal.

## Scene organisation

- One main `Scene` subclass per Bit in `src/scene.py`; `orbbits build` picks the first one
  (or `build.scene`). Helpers may live in other modules under `src/`.
- Structure `construct()` as *stage → introduce objects → the core idea → conclusion*.
- Use `ValueTracker` + `always_redraw` for anything that depends on a parameter; avoid
  hand-animating dependent objects.

## Pacing

- One idea per `play`; then `wait(0.5–1)` so the teacher can talk over it.
- Movements that carry the idea: `run_time` 2–3 s with `smooth`. Transitions: ≤ 1 s.
- Stop at notable values (π/3, π/2, …) rather than sweeping once.
- End with a summarising formula and a 2 s hold (that frame becomes the poster).

## Workflow

```bash
just build <id> --quick   # iterate
just build <id>           # final render + poster
just check <id>
```
