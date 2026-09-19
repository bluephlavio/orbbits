# Esplora la circonferenza goniometrica

Technical notes. Pedagogical intent: `brief.md`; classroom prose: `narrative.md`.

- Kind: interactive · Engine: JSXGraph (React wrapper) · Public page: `/bits/unit-circle-explorer/`
- Source: `src/index.tsx` (construction in `build()`), `src/styles.css` (scoped under `.unit-circle-explorer`)
- Locales: `it` (default), `en` — strings in `locales/it.yml` / `locales/en.yml`
- Standalone export: `just export unit-circle-explorer` → `dist/web/` (rebuildable, not versioned)

## Workflow

```bash
just dev unit-circle-explorer      # live preview at /bits/unit-circle-explorer/
just web-check                     # TypeScript diagnostics
just check unit-circle-explorer
just export unit-circle-explorer   # dist/web/index.html + assets
```

## Implementation notes

Reference implementation for the interactive-Bit contract: default-exported component, no
dependence on page layout, responsive board, accessible slider + reset.

- Bounding box `[-1.5, 1.5, 1.5, -1.5]`, `keepaspectratio`, pan/zoom disabled, fixed tick
  spacing 0.5 (`insertTicks: false`).
- P is a `glider` on the circle; every other element is `fixed`. The projections are segments
  to invisible foot points defined by functions of P.
- Board → React: `board.on('update', …)` recomputes θ from `atan2(P.Y(), P.X())` and drives the
  `<dl>` readout. React → board: the slider calls `P.moveTo([cos, sin])` + `board.update()`.
- Reset moves P back to 40° rather than rebuilding the board (cheaper, no flicker).
- Colours follow the project palette (`docs/style/interactive.md`); cos = `#d1495b`,
  sin = `#2a9d8f`, the same pairing as the Manim Bit `angle-as-rotation`.
- Localisation (reference implementation for docs/localization.md): the component takes an
  optional `locale` prop from the runtime, looks the messages up in `MESSAGES` (the two YAML
  files imported directly, cast to the `Messages` interface) and falls back to Italian.
  `build()` receives the messages so the on-board labels follow the locale too; `t` is in
  the effect's dependencies, so a locale change rebuilds the board. Five strings: the slider's
  accessible name, Reset, "cos θ", "sin θ", "rad" — mathematics needs no translation, which
  is why this Bit was the cheap proof of concept. The public page renders `it`.

## Limitations / open issues

- Angles are shown to 1° on the slider and 0.1° in the readout; no snapping to notable angles.
