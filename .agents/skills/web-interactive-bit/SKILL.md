---
name: web-interactive-bit
description: Author, preview, export and validate an interactive web Bit (kind interactive; engine react, p5, mafs or three) as a self-contained React component mounted by the OrbBits Astro runtime.
---

# Web interactive Bit

Style: `docs/style/interactive.md`. Runtime: `docs/web-runtime.md`. Spec: `docs/bit-spec.md`.
For dynamic geometry prefer the `jsxgraph-bit` skill.

## Files

```text
bits/<id>/
├── bit.yml            kind: interactive · engine: react (or p5 | mafs | three) · no outputs
├── src/index.tsx      default export = the whole Bit (stage + controls + readout)
└── src/styles.css     scoped under .<id>
```

## Component contract

- Default-exported React function component, no required props, owns its state, has Reset.
- Imports only from root `node_modules` (react, and libraries added with `pnpm add` at the
  repository root) and its own `src/`. Never from `web/`.
- Responsive: `width: 100%`, `aspect-ratio`, a sensible `max-width`; touch works
  (`touch-action: none` on the stage).
- Accessible controls: `<label>` + `<input type="range">`, `<button type="button">`,
  `<output>` for values, `aria-label` for symbol-only labels.
- No page assumptions: no global selectors, no theme classes, no routes, no network.
- Library-owned canvases (p5, three): create in `useEffect`, dispose in cleanup, rebuild on
  reset by bumping a `key`/generation state. Prefer plain SVG + React state for simple stages.
- Adding a library: `pnpm add <lib>` at the root; set `engine:` in `bit.yml` (`p5`, `mafs`,
  `three`, or keep `react`).

## Preview, check, export

```bash
just dev <id>            # http://localhost:4321/bits/<id> (agents: server runs in background;
                         #   stop with: pnpm exec astro dev stop --root "$PWD/web")
just web-check           # TypeScript diagnostics for the runtime and every Bit
just export <id>         # bits/<id>/dist/web/ standalone static site (not versioned)
just check <id>
```

Headless verification: serve `dist/web/` (`python3 -m http.server -d bits/<id>/dist/web`)
and load it with a browser automation tool; there must be no console errors.

## Finish

`status: usable` once it renders and the controls work standalone; fill `description`,
taxonomy, `provenance` for adapted code or data; write `README.md`.
