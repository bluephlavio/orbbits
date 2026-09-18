# Angle as rotation

A point *P* rotates on the unit circle while its horizontal shadow (cos θ) and vertical
shadow (sin θ) are highlighted and read out live. The point stops at a few notable angles so
the teacher can comment. Companion of the interactive `unit-circle-explorer` Bit.

- Kind: video · Engine: Manim
- Source: `src/scene.py` (scene `AngleAsRotation`)
- Outputs: `dist/angle-as-rotation.mp4` (1080p60), `dist/poster.webp`

## Workflow

```bash
just build angle-as-rotation --quick   # 480p preview in .build/preview/
just build angle-as-rotation           # final render into dist/
just check angle-as-rotation
```

## Notes

Serves as the end-to-end validation of the Manim builder (render → copy to dist → poster
frame with ffmpeg). Text is in Italian; labels are mathematical.
