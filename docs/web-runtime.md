# Web runtime

`web/` is a minimal Astro + React project with three jobs: mount interactive Bits, build the
public site (one page per published Bit plus a catalog), and export interactive Bits as
standalone static sites. It is a runtime, not a CMS: everything it shows derives from
`bits/*/bit.yml` and `bits/*/dist/` at build time.

## Contract for an interactive Bit

`bits/<id>/src/index.tsx` default-exports a React component:

```tsx
export default function ProjectileMotion({ locale = 'it' }: { locale?: string }) {
  // the whole interactive: stage, controls, readouts — in the language asked for
}
```

Rules (details in `docs/style/interactive.md`):

- no props required; the component owns its state and offers a reset. The only prop the
  runtime passes is `locale` (one of the Bit's `locales`; `BitProps` in `BitHost.tsx`); a
  single-language Bit ignores it, a localised one resolves its strings from
  `locales/<tag>.yml` (docs/localization.md);
- it fills its container's width and keeps its own aspect ratio; it must work on touch;
- it imports only from the repository's root `node_modules` (react, jsxgraph, …) and its own
  `src/`; nothing from `web/`;
- styles are scoped under a class named after the Bit id (several Bits may share a page);
- it never assumes a page layout, header, theme, route or base path.

## How it is put together

- `web/src/lib/catalog.ts` — `import.meta.glob('../../../bits/*/bit.yml')` (parsed by
  `@rollup/plugin-yaml`) gives every manifest at build time; `bits/*/dist/*` and
  `bits/*/dist/*/*` (localised) outputs are exposed as URLs the same way, `dist/web/`
  excluded. Exposes `bits`, `publishedBits` (status usable/curated), `visibleBits` (what the
  current build renders), `bitPath(id)` = `/bits/<id>/`, `bitLocale` / `bitLocales`,
  `outputsFor(bit, locale)`, `contentLicense`, tag and related-Bit helpers.
- `web/src/lib/site.ts` — base-path-aware links (`withBase`, `absoluteUrl`), the repository
  link (`repoUrl`, resolved by `astro.config.mjs` from `ORBBITS_REPO` or the GitHub Actions
  variables, undefined when unknown), the licence pointers (`LICENSES`) and the Italian
  chrome strings. Bits never import it.
- `web/src/lib/BitHost.tsx` — `import.meta.glob('../../../bits/*/src/index.tsx')` (lazy)
  plus `React.lazy`; `<BitHost id="…" locale="it" client:only="react" />` mounts one Bit as
  its own chunk and hands it the locale.
- `web/src/components/BitView.astro` — renders the artifact by kind (BitHost, `<video>`,
  `<img>`, PDF frame with an "open" link) in one locale — the Bit's default unless told
  otherwise — choosing among that locale's outputs, then the download links for every
  output (localised ones labelled with their tag) with proper file names.
- `web/src/components/BitCard.astro` — a catalog entry (`data-tags` for the filter).
- `web/src/pages/index.astro` — home / library: published Bits, tag filter (a few lines of
  vanilla JS, state in `#tag=…`); drafts in a separate section in the dev server only.
- `web/src/pages/bits/[id].astro` — the canonical Bit page: artifact, downloads, metadata box
  (tags, date, languages, licence of the original content, provenance with its licences,
  canonical address), related Bits by shared tags.
- `web/src/layouts/Shell.astro` — page chrome (nav, title, badges, footer with the licence
  split, canonical link); `<html lang>` is the Bit's `default_locale`.
- `web/public/.nojekyll` — copied into the build so `_astro/` survives any Jekyll-based host.

Astro is run with `--root <absolute path>/web` from the repository root, with
`vite.server.fs.allow` covering the whole repository so `bits/` is servable.

## Modes

| mode | trigger | Bits included | base |
|------|---------|---------------|------|
| dev | `astro dev` (`just web`, `just dev <id>`) | all, drafts flagged | `/` |
| site | `astro build` (`just site`, CI) | published only | `ORBBITS_BASE` (e.g. `/orbbits/`) |
| export | `astro build` with `ORBBITS_EXPORT_BIT=<id>` (`just export <id>`) | that Bit, whatever its status | relative URLs |

The mode is decided in `web/astro.config.mjs`:

- `scopeGlobs()` (a Vite transform) rewrites the `bits/*` globs in `web/src/lib` to the set
  of Bits the build may contain — the exported Bit, or the published ids read from
  `bits/*/bit.yml` — so a draft's code, styles and outputs never enter the public bundle.
  The dev server keeps every Bit.
- `site` and `base` come from `ORBBITS_SITE` / `ORBBITS_BASE`; every internal link goes
  through `withBase()`, asset URLs are prefixed by Vite. Nothing under `bits/` knows the base.
- In export mode `base` is `/`, `build.assetsPrefix: '.'` plus a `renderBuiltUrl` override
  make every URL relative, `index.astro` renders the Bit at the root and `[id].astro` emits
  nothing. Result: `bits/<id>/dist/web/index.html` + `_astro/`, servable from any path; it is
  rebuildable, hence ignored by git.

Routes: `trailingSlash: 'ignore'` and the default `build.format: 'directory'`, so every page
is `…/index.html` and `/bits/<id>/` is the canonical form (GitHub Pages redirects the
slash-less form). `orbits/<id>/` can be added the same way later; nothing here assumes only
Bits exist. A localised route (`/en/bits/<id>/`) would be one more page file calling
`<BitView bit={bit} locale="en" />` plus per-language chrome strings; deferred until the
site has a non-Italian audience (docs/localization.md).

## Adding a web engine

1. `pnpm add <library>` at the repository root;
2. optionally a template in `templates/<name>/` with a `template.yml` (`kind: interactive`);
3. add the engine name to `WEB_ENGINES` in `src/orbbits/engines/__init__.py`;
4. a skill in `.agents/skills/` if the library has conventions worth encoding.

## Known limitations (deliberate for now)

- Astro hoists the CSS of every Bit reachable from `BitHost` into every page of the same
  build (JS stays per-Bit and lazy). With the globs scoped to published Bits this is a few
  kilobytes of public CSS; exports are unaffected. Revisit if the catalog grows large.
- JSXGraph's package `exports` hides `distrib/jsxgraph.css`; `astro.config.mjs` aliases it.
- Output files are emitted under `_astro/` with hashed names; the download links restore the
  original file names via the `download` attribute. The canonical URL is the page, not the file.
- No theme/dark-mode contract for Bits yet beyond `color-scheme`.
- `publishedBitIds()` in `astro.config.mjs` reads `status:` with a regular expression; the
  parsed manifest (`catalog.ts`) applies the real rule and `tests/test_site.py` cross-checks
  the build against the Python model.
