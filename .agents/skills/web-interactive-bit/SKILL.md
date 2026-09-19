---
name: web-interactive-bit
description: Author, preview, export and validate an interactive web Bit (kind interactive; engine react, p5, mafs or three) as a self-contained React component mounted by the OrbBits Astro runtime.
---

# Web interactive Bit

Style: `docs/style/interactive.md`. Runtime: `docs/web-runtime.md`. Spec: `docs/bit-spec.md`.
Flow (relatives, naming, brief, publication): `create-bit` skill. For dynamic geometry
prefer the `jsxgraph-bit` skill.

## Files

```text
bits/<id>/
├── bit.yml            kind: interactive · engine: react (or p5 | mafs | three) · no outputs · tags
├── brief.md           what the learner must notice; which quantities/controls are essential
├── README.md          state model, libraries, rendering approach, limitations
├── narrative.md       what to say/ask while students use it (optional)
├── locales/<tag>.yml  the strings the learner reads, one file per locale (only if localised)
├── src/index.tsx      default export = the whole Bit (stage + controls + readout)
└── src/styles.css     scoped under .<id>
```

Start from the brief: an interactive is the medium for *letting the learner vary* the
essential relation (drag, slider, toggle). If a related video/figure Bit exists, reuse its
tags and colour pairing; do not reproduce its fixed sequence — expose the parameters.

## Component contract

- Default-exported React function component, no required props, owns its state, has Reset.
  The runtime passes one optional prop, `locale` (a tag from the Bit's `locales`).
- Imports only from root `node_modules` (react, and libraries added with `pnpm add` at the
  repository root) and its own `src/`. Never from `web/`.
- Responsive: `width: 100%`, `aspect-ratio`, a sensible `max-width`; touch works
  (`touch-action: none` on the stage).
- Accessible controls: `<label>` + `<input type="range">`, `<button type="button">`,
  `<output>` for values, `aria-label` for symbol-only labels.
- No page assumptions: no global selectors, no theme classes, no routes, no base path, no
  network (the same component is served at `/bits/<id>/`, under `/orbbits/`, and exported).
- Everything on screen (labels, buttons, readouts) in the Bit's `default_locale` (Italian
  by default). Localised Bit: strings in `locales/<tag>.yml`, resolved from `locale`:

  ```tsx
  import en from '../locales/en.yml';
  import it from '../locales/it.yml';
  const MESSAGES: Record<string, Messages> = { it: it as Messages, en: en as Messages };
  export default function X({ locale = 'it' }: { locale?: string }) {
    const t = MESSAGES[locale] ?? MESSAGES.it;
  ```

  Same keys in every file; no i18n library (docs/localization.md, `bits/unit-circle-explorer`).
- Library-owned canvases (p5, three): create in `useEffect`, dispose in cleanup, rebuild on
  reset by bumping a `key`/generation state. Prefer plain SVG + React state for simple stages.
- Adding a library: `pnpm add <lib>` at the root; set `engine:` in `bit.yml` (`p5`, `mafs`,
  `three`, or keep `react`).

## Preview, check, export

```bash
just dev <id>            # http://localhost:4321/bits/<id>/ (agents: server runs in background;
                         #   stop with: pnpm exec astro dev stop --root "$PWD/web")
just web-check           # TypeScript diagnostics for the runtime and every Bit
just export <id>         # bits/<id>/dist/web/ standalone static site (not versioned)
just check <id>
```

Headless verification: serve `dist/web/` (`python3 -m http.server -d bits/<id>/dist/web`)
and load it with a browser automation tool; there must be no console errors.

## Finish

`status: usable` once it renders and the controls work standalone — that publishes the Bit
at `/bits/<id>/` on the next push, in its `default_locale`. Fill `description` (in that
locale), `tags`, taxonomy, `locales` (with a `locales/<tag>.yml` per entry when localised),
`provenance` (with `license`) for adapted code or data; `README.md` technical, `brief.md`
filled; `just check <id>` clean.
