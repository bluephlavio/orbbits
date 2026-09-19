---
name: manim-bit
description: Author, render and validate a Manim video Bit (kind video, engine manim) following OrbBits conventions — scene structure, palette, pacing, quick vs final render, poster, outputs.
---

# Manim Bit

Reference: `bits/angle-as-rotation` (its `brief.md` shows how the interactive
`unit-circle-explorer` concept was adapted to a narrated sequence). Style:
`docs/style/manim.md`. Spec: `docs/bit-spec.md`. Flow (relatives, naming, brief,
publication): `create-bit` skill.

## Files

```text
bits/<id>/
├── bit.yml            kind: video · engine: manim · outputs: dist/<id>.mp4, dist/poster.webp · tags
├── brief.md           intent, essential relations, the progression the animation narrates
├── README.md          scene structure, trackers, pacing, packages
├── narrative.md       where to pause, what to ask (optional)
├── locales/<tag>.yml  on-screen strings per language (only for a localised Bit)
├── src/scene.py       one main Scene subclass (build picks the first, or build.scene)
└── dist/              produced by `just build <id>`, committed (CI does not render);
                       localised renders under dist/<tag>/
```

Start from the brief. A video is the medium for a *controlled sequence*: turn the brief's
"didactic progression" into the scene's steps and its "pitfalls" into what stays visible or
moves smoothly. If an interactive on the same concept exists, keep its colour pairing and
labels; do not try to reproduce its freedom — pick the notable values and pause there.

## Authoring checklist

- `from manim import *`; module docstring says what the animation shows.
- Palette: `BLUE` primary, `YELLOW` active/moving, `RED`/`TEAL` paired quantities, `GREY_B` axes.
- `Text` for titles (font_size 40), `MathTex` for all mathematics (≥ 36 pt), labels in the
  Bit's `default_locale`. Localised Bit: `outputs` with `locale` (`dist/it/<id>.mp4`,
  `dist/en/<id>.mp4`), and the scene reads the language it is rendering —
  `LOCALE = os.environ.get("ORBBITS_LOCALE", "it")`, strings from `locales/{LOCALE}.yml`
  (`yaml.safe_load`; the cwd is the Bit directory). `just build` renders once per locale.
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

Set `status: usable` once the final render exists and looks right — that publishes the Bit
(and its mp4/poster) at `/bits/<id>/` on the next push. Fill `description` (in the default
locale), `tags` (shared with related Bits), `subjects`, `topics`, `levels`, `locales`;
`README.md` technical, `brief.md` filled, pauses and questions in `narrative.md`.
`just check <id>` clean. Commit `dist/`, never `.build/`.
