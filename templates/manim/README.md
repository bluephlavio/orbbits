# __BIT_TITLE__

<!-- Technical notes for maintainers and agents. The pedagogical intent lives in brief.md,
     classroom prose in narrative.md; do not repeat them here. -->

- Kind: video · Engine: Manim · Public page: `/bits/__BIT_ID__/` (once `status` is usable)
- Source: `src/scene.py` (scene `__BIT_CLASS__`)
- Outputs: `dist/__BIT_ID__.mp4` (1080p60), `dist/poster.webp` (last frame)

## Workflow

```bash
just build __BIT_ID__ --quick   # fast 480p preview in .build/
just build __BIT_ID__           # final 1080p60 render into dist/
just check __BIT_ID__
```

## Implementation notes

<!-- Scene structure, updaters/trackers, pacing decisions, fonts or packages needed. -->

## Limitations / open issues
