# OrbBits

Personal, local-first authoring system for reusable educational media (**Bits**) and, later,
rich lessons that compose them (**Orbits**). The repository is the authoring environment;
the public site — <https://bluephlavio.github.io/orbbits/> — is built from it on every push.

- **Bit** — an independently authored, reusable artifact with its own production pipeline:
  a Manim animation, an interactive simulation, a dynamic-geometry construction, a TikZ
  figure, a LaTeX handout… lives in `bits/<id>/` with `bit.yml`, `README.md`, `brief.md`,
  `narrative.md`, `src/`, `dist/`. Every published Bit has a stable address,
  `/bits/<id>/`, meant to be shared in class.
- **Orbit** — a future lesson / narrative path that composes Bits and simpler editorial
  Blocks. `orbits/` is reserved; nothing is implemented yet.

Classroom content is in Italian by default — a Bit declares its `default_locale` and may
exist in several `locales` without changing identity or URL (docs/localization.md); code,
tooling and documentation are in English; a Bit's own notes (`brief.md`, `narrative.md`) are
optional and in whatever language helps. Sibling of TexBits (exercise banks, assessment
generation) by design, not by code.

## Quick start

```bash
just setup                        # uv sync + pnpm install
just new                          # scaffold a Bit (title, slug, template; --tags, --locale, --locales optional)
just list                         # id · kind · role · engine · status · tags
just list --tag unit-circle       # related Bits
just dev unit-circle-explorer     # interactive Bit in the browser
just build angle-as-rotation      # render through the Bit's engine into dist/
just export unit-circle-explorer  # standalone static site in bits/<id>/dist/web/
just check                        # validate every manifest and publication readiness
just site && just site-preview    # the public site, exactly as CI builds it
just test                         # pytest + ruff
```

Requirements: [uv](https://docs.astral.sh/uv/), [pnpm](https://pnpm.io), [just](https://just.systems)
(`uv tool install rust-just`), plus the engines you use: a TeX distribution with `latexmk`
(+ `pdf2svg`), `ffmpeg`, and the system libraries Manim needs (cairo, pango).

## Layout

```text
bits/<id>/        the Bits (flat namespace, metadata-driven discovery, tags for relations)
orbits/           future lessons
templates/        one scaffold per authoring engine: manim · web · jsxgraph · tikz · latex
web/              Astro + React runtime: local catalog, public site, standalone exports
src/orbbits/      Python CLI: new · list · check · build · dev · export
docs/             architecture, bit-spec, authoring, localization, web-runtime, publishing, provenance, licensing, style/
.agents/skills/   operational guides for AI agents (AGENTS.md has the rules)
.github/          CI: verify and deploy the site to GitHub Pages
```

## Reference Bits

| id | kind | engine | shows |
|----|------|--------|-------|
| `unit-circle-explorer` | interactive | jsxgraph | drag *P* on the unit circle, read θ, cos θ, sin θ (locales it, en) |
| `angle-as-rotation` | video | manim | the same idea as a 22 s animation |
| `alkhwarizmi-completing-square` | figure | tikz | the geometric argument for x² + 10x = 39 |

## Publishing

`status: usable` (or `curated`) in `bit.yml` + `git push` → GitHub Actions runs the tests,
`orbbits check` and the Astro build, and deploys the site. Drafts stay local. Details, the
one-time GitHub Pages setup and the custom-domain path: [`docs/publishing.md`](docs/publishing.md).

## Licensing

| what | licence | where |
|------|---------|-------|
| software — CLI, runtime, templates, source code inside Bits | MIT | [`LICENSE`](LICENSE) |
| original educational content — videos, figures, handouts, briefs, narratives, titles | CC BY-SA 4.0 (unless a Bit says otherwise) | [`CONTENT-LICENSE.md`](CONTENT-LICENSE.md) |
| third-party and historical material | its own terms | `provenance` in each `bit.yml` |

Details, per-Bit overrides and what the site shows: [`docs/licensing.md`](docs/licensing.md).

## Documentation

Start with [`docs/architecture.md`](docs/architecture.md), then
[`docs/bit-spec.md`](docs/bit-spec.md), [`docs/authoring.md`](docs/authoring.md),
[`docs/localization.md`](docs/localization.md) and [`docs/publishing.md`](docs/publishing.md).
