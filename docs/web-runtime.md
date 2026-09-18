# Web runtime

`web/` is a minimal Astro + React project whose job is to mount interactive Bits, preview any
Bit standalone, and export interactive Bits as static sites. It is not the public website;
it is the reusable runtime the website will be built on.

## Contract for an interactive Bit

`bits/<id>/src/index.tsx` default-exports a React component:

```tsx
export default function ProjectileMotion() {
  // the whole interactive: stage, controls, readouts
}
```

Rules (details in `docs/style/interactive.md`):

- no props required; the component owns its state and offers a reset;
- it fills its container's width and keeps its own aspect ratio; it must work on touch;
- it imports only from the repository's root `node_modules` (react, jsxgraph, …) and its own
  `src/`; nothing from `web/`;
- styles are scoped under a class named after the Bit id (several Bits may share a page);
- it never assumes a page layout, header, theme or route.

## How mounting works

- `web/src/lib/catalog.ts` — `import.meta.glob('../../../bits/*/bit.yml')` (parsed by
  `@rollup/plugin-yaml`) gives every manifest at build time; `bits/*/dist/*` outputs are
  exposed as URLs the same way.
- `web/src/lib/BitHost.tsx` — `import.meta.glob('../../../bits/*/src/index.tsx')` (lazy)
  plus `React.lazy`; `<BitHost id="…" client:only="react" />` mounts one Bit as its own chunk.
- `web/src/components/BitView.astro` — renders any Bit by kind (BitHost, `<video>`, `<img>`,
  PDF frame) with links to its outputs.
- `web/src/pages/bits/[id].astro` — standalone page per Bit; `index.astro` — local catalog.
- `web/src/layouts/Shell.astro` — minimal chrome. Bits never depend on it.

Astro is run with `--root <absolute path>/web` from the repository root, with
`vite.server.fs.allow` covering the whole repository so `bits/` is servable.

## Export

`orbbits export <id>` runs `astro build` with `ORBBITS_EXPORT_BIT=<id>` and
`ORBBITS_OUT_DIR=bits/<id>/dist/web`. In that mode:

- a Vite transform narrows the `bits/*` globs in `web/src/lib` to the one Bit, so only its
  code, styles and outputs are bundled;
- `index.astro` renders the Bit at the site root and `[id].astro` emits nothing;
- `build.assetsPrefix: '.'` plus a `renderBuiltUrl` override make every URL relative, so the
  folder can be served from any path (any static host, a USB stick with a local server, a
  subfolder of a site).

Result: `bits/<id>/dist/web/index.html` + `_astro/`. It is rebuildable, hence ignored by git.

## Adding a web engine

1. `pnpm add <library>` at the repository root;
2. optionally a template in `templates/<name>/` with a `template.yml` (`kind: interactive`);
3. add the engine name to `WEB_ENGINES` in `src/orbbits/engines/__init__.py`;
4. a skill in `.agents/skills/` if the library has conventions worth encoding.

## Known limitations (deliberate for now)

- Astro hoists the CSS of every Bit reachable from `BitHost` into every page of the local
  runtime (JS stays per-Bit and lazy). Fine at the current scale; exports are unaffected.
  Revisit when building the public site.
- JSXGraph's package `exports` hides `distrib/jsxgraph.css`; `astro.config.mjs` aliases it.
- The runtime has no theme/dark-mode contract for Bits yet beyond `color-scheme`.
