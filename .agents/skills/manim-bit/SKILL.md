---
name: manim-bit
description: Author, render and validate a Manim video Bit (kind video, engine manim) following OrbBits conventions — scene structure, palette, pacing, quick vs final render, poster, outputs.
---

# Manim Bit

Reference: `bits/angle-as-rotation`. Style: `docs/style/manim.md`. Spec: `docs/bit-spec.md`.

## Files

```text
bits/<id>/
├── bit.yml            kind: video · engine: manim · outputs: dist/<id>.mp4, dist/poster.webp
├── src/scene.py       one main Scene subclass (build picks the first, or build.scene)
└── dist/              produced by `just build <id>`
```

## Authoring checklist

- `from manim import *`; module docstring says what the animation shows.
- Palette: `BLUE` primary, `YELLOW` active/moving, `RED`/`TEAL` paired quantities, `GREY_B` axes.
- `Text` for titles (font_size 40), `MathTex` for all mathematics (≥ 36 pt), Italian labels.
- Parameter-driven objects: `ValueTracker` + `always_redraw` / updaters, not hand-animated.
- Structure: stage → introduce → core idea (slow, `run_time` 2–3 s, stop at notable values) →
  conclusion formula → `wait(2)` (becomes the poster).
- 20–90 s total. Split long stories into several Bits.

## Render

```bash
just build <id> --quick    # 480p15 → bits/<id>/.build/preview/<id>.mp4 (inspect frames with ffmpeg)
just build <id>            # 1080p60 → dist/<id>.mp4 + dist/poster.webp (last frame)
just check <id>
```

`build:` options in `bit.yml`: `scene`, `quality` (`l|m|h|p|k`), `poster` (`last|first|<seconds>`).
Manim is installed by `uv sync` (dependency group `manim`); it needs `ffmpeg` and a LaTeX
distribution for `MathTex`.

## Inspect without a player

```bash
ffprobe -v error -show_entries stream=width,height,r_frame_rate -of csv=p=0 bits/<id>/dist/<id>.mp4
ffmpeg -y -ss 5 -i bits/<id>/dist/<id>.mp4 -frames:v 1 /tmp/frame.png   # then view the PNG
```

## Finish

Set `status: usable` once the final render exists and looks right; fill `description`,
`subjects`, `topics`, `levels`; write `README.md`. Never commit `.build/`.
