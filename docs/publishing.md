# Publishing

The repository is the source of truth; the public site is a disposable build artifact.

```text
local repository  →  git push  →  GitHub Actions  →  astro build  →  GitHub Pages
```

Nothing in the authoring model depends on the host. GitHub Pages is the current target
because it is free and needs no server; another static host would replace the last two steps.

## Three ways a Bit reaches a screen

| mode | command | what it is | URL |
|------|---------|-----------|-----|
| local runtime | `just web`, `just dev <id>` | dev server, every Bit including drafts | `http://localhost:4321/bits/<id>/` |
| standalone export | `just export <id>` | one interactive Bit as a self-contained folder (`bits/<id>/dist/web/`), relative URLs, works from any path or a USB stick | wherever you copy it |
| public site | `just site` locally, CI on push | the library: home page + one canonical page per published Bit | `https://<host>/<base>/bits/<id>/` |

Export and site coexist on purpose: the export is for embedding somewhere else (a school
platform, an offline machine); the site is for sharing a link.

## Canonical URLs

Every published Bit has one address, derived from its id only:

```text
/bits/<id>/
```

Not from `kind`, `role`, `engine`, template or file names, and not from the language: the
page renders the Bit in its `default_locale`, and a translation adds a locale to the same
Bit, not a URL. Rendering technology can change under the same URL; a Classroom link keeps
working. Links always point at the Bit page, never at a raw `.mp4` / `.svg` / `.pdf`: the
page embeds the artifact and offers the files below it. Localised routes such as
`/en/bits/<id>/` are a possible future prefix, never a replacement (docs/localization.md).

The host and base path are configuration (`ORBBITS_SITE`, `ORBBITS_BASE`; see below). Moving
from `https://bluephlavio.github.io/orbbits/` to a custom domain changes the prefix only:

```text
https://bluephlavio.github.io/orbbits/bits/unit-circle-explorer/
https://orbbits.example/bits/unit-circle-explorer/
```

## What gets published

Publication is derived from `status` in `bit.yml`; there is no separate `published` flag.

| status | local runtime | public site |
|--------|---------------|-------------|
| `draft` | yes, under "Bozze (solo in locale)" | no page, no code, no styles |
| `usable` | yes | yes |
| `curated` | yes | yes |

A production build (`astro build`) narrows the runtime's discovery globs to published Bits
(`web/astro.config.mjs`, `scopeGlobs`), so a draft's sources never end up in the bundle; the
dev server keeps everything. `orbbits check` warns when a published Bit has neither a
`description` nor a `brief.md` / `narrative.md` to make sense of it, and when its provenance
has no license note (an error for `curated`).

If usable-but-private Bits ever become a real need, publication state can be split from
maturity then; not before.

## The site

`web/` is the Astro runtime (docs/web-runtime.md). The site is deliberately minimal:

- `/` — title, one-line description, the published Bits as cards (title, kind, role, status,
  description, tags, id) with a client-side tag filter (`#tag=<tag>` in the URL);
- `/bits/<id>/` — the Bit (interactive mount, video, figure or PDF) in its default locale,
  download links (every output, localised ones labelled), a short metadata box (tags, date,
  languages, licence of the original content, provenance, canonical address) and related
  Bits by shared tags.

Every page's footer links the source repository and states the licence split — software
MIT, original content CC BY-SA 4.0 unless otherwise indicated, third-party material under
its own terms (docs/licensing.md). Everything derives from `bits/*/bit.yml` at build time;
no registry, no database. The chrome is Italian; each Bit page is in the Bit's own language.

## Building locally

```bash
just site            # astro build for https://bluephlavio.github.io/orbbits/ → web/dist/
just site-preview    # serve web/dist/ at http://localhost:4321/orbbits/
just ci              # test + check + web-check + site: what CI runs before deploying
```

`site_origin` and `site_base` at the top of the `justfile` hold the deployment target for
local builds; `ORBBITS_SITE` / `ORBBITS_BASE` override them. `astro.config.mjs` reads the
same two variables (base defaults to `/`). The test-suite also builds the site into a
temporary directory with base `/orbbits/` and checks pages, draft exclusion and URLs
(`tests/test_site.py`, skipped when `node_modules` is absent).

The repository the footer links to is never guessed: `ORBBITS_REPO` if set (the `justfile`
derives it from the `origin` remote for local builds), otherwise the repository GitHub
Actions is building (`GITHUB_SERVER_URL` / `GITHUB_REPOSITORY`), otherwise no link at all.
Moving the sources elsewhere changes nothing in the pages' code.

## GitHub Pages

Workflow: `.github/workflows/site.yml`.

```text
push to main | workflow_dispatch
  → checkout
  → uv sync --locked --no-group manim        (no cairo/pango/TeX in CI)
  → pnpm install --frozen-lockfile
  → pytest + ruff · orbbits check · astro check
  → actions/configure-pages   (gives origin + base_path)
  → astro build               (ORBBITS_SITE / ORBBITS_BASE from the step above)
  → upload-pages-artifact (web/dist) → deploy-pages
pull_request: same checks and build (placeholder base), no deployment
```

One-time configuration in GitHub, after the repository exists:

1. *Settings → Pages → Build and deployment → Source*: **GitHub Actions** — or, from the
   CLI, `gh api -X POST repos/<user>/<repo>/pages -f build_type=workflow`.
2. *Settings → Actions → General*: allow actions (default) — the workflow needs
   `pages: write` and `id-token: write`, which it requests itself.
3. Push to `main` (or *Actions → site → Run workflow*). The first run creates the
   `github-pages` environment. The site appears at `https://<user>.github.io/<repo>/`.

Pages on a **private** repository needs a paid plan; on a public repository it is free.

### Trade-off: CI does not render

CI consumes the outputs versioned under `bits/*/dist/` (SVG, PDF, MP4, posters) and never
runs Manim, TikZ or LaTeX. This keeps the workflow at a couple of minutes and free of heavy
toolchains, at the price of committing built artifacts. `orbbits check` fails the build if a
published Bit declares an output that is not there, so "forgot to build before pushing" is
caught. Revisit (Git LFS, an artifact bucket) only when videos make the repository heavy.

### Custom domain later

1. DNS: `CNAME orbbits.example → <user>.github.io`.
2. *Settings → Pages → Custom domain*; GitHub writes the domain and `configure-pages` then
   reports `base_path: ""`, so the workflow builds for the root automatically.
3. Update `site_origin` / `site_base` in the `justfile` for local previews.
4. Old `github.io/orbbits/...` links keep redirecting to the custom domain while the Pages
   site exists (GitHub's behaviour, not ours).

Bit ids and `/bits/<id>/` never change through any of this.
