# Angolo come rotazione

Technical notes. Pedagogical intent: `brief.md`; classroom prose: `narrative.md`.

- Kind: video · Engine: Manim · Public page: `/bits/angle-as-rotation/`
- Source: `src/scene.py` (scene `AngleAsRotation`)
- Outputs: `dist/angle-as-rotation.mp4` (1080p60, ≈ 22 s, 1.1 MB), `dist/poster.webp` (last frame)

## Workflow

```bash
just build angle-as-rotation --quick   # 480p preview in .build/preview/
just build angle-as-rotation           # final render into dist/
just check angle-as-rotation
```

## Implementation notes

End-to-end validation of the Manim builder (render → copy to dist → poster frame with ffmpeg).

- One `ValueTracker` (θ) drives everything through `always_redraw`: radius, point, label,
  dashed drops, projection segments, angle arc, and two `DecimalNumber` updaters.
- The circle is drawn at on-screen radius `R = 2.4`, shifted left to leave room for the readout.
- Pauses at π/3, 5π/6, 3π/2, 2π are `wait(0.8)` between smooth `run_time` 2.5–3 s rotations.
- `MathTex` needs a LaTeX distribution; text is Italian, mathematics in math mode.
- Colours: `BLUE` circle, `YELLOW` moving parts, `RED` cos, `TEAL` sin (`docs/style/manim.md`).

## Limitations / open issues

- No audio; the narration is meant to be live (see `narrative.md`).
- The mp4 is versioned in git for now (small); revisit if videos grow (LFS or object storage).
