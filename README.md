# OrbBits

Personal, local-first authoring system for reusable educational media (**Bits**) and, later,
rich lessons that compose them (**Orbits**). The repository is the authoring environment; a
public website will be one of its outputs.

- **Bit** — an independently authored, reusable artifact with its own production pipeline:
  a Manim animation, an interactive simulation, a dynamic-geometry construction, a TikZ
  figure, a LaTeX handout… lives in `bits/<id>/` with `bit.yml`, `src/`, `dist/`.
- **Orbit** — a future lesson / narrative path that composes Bits and simpler editorial
  Blocks. `orbits/` is reserved; nothing is implemented yet.

Sibling of [TexBits](../bits) (exercise banks, assessment generation) by design, not by code.

## Quick start

```bash
just setup                        # uv sync + pnpm install
just new                          # scaffold a Bit (title, slug, template)
just list                         # id · kind · role · engine · status
just dev unit-circle-explorer     # interactive Bit in the browser
just build angle-as-rotation      # render through the Bit's engine into dist/
just export unit-circle-explorer  # standalone static site in bits/<id>/dist/web/
just check                        # validate every manifest
just test                         # pytest + ruff
```

Requirements: [uv](https://docs.astral.sh/uv/), [pnpm](https://pnpm.io), [just](https://just.systems)
(`uv tool install rust-just`), plus the engines you use: a TeX distribution with `latexmk`
(+ `pdf2svg`), `ffmpeg`, and the system libraries Manim needs (cairo, pango).

## Layout

```text
bits/<id>/        the Bits (flat namespace, metadata-driven discovery)
orbits/           future lessons
templates/        one scaffold per authoring engine: manim · web · jsxgraph · tikz · latex
web/              Astro + React runtime: standalone pages that mount Bits, export
src/orbbits/      Python CLI: new · list · check · build · dev · export
docs/             architecture, bit-spec, authoring, web-runtime, provenance, style/
.agents/skills/   operational guides for AI agents (AGENTS.md has the rules)
```

## Reference Bits

| id | kind | engine | shows |
|----|------|--------|-------|
| `unit-circle-explorer` | interactive | jsxgraph | drag *P* on the unit circle, read θ, cos θ, sin θ |
| `angle-as-rotation` | video | manim | the same idea as a 22 s animation |
| `alkhwarizmi-completing-square` | figure | tikz | the geometric argument for x² + 10x = 39 |

## Documentation

Start with [`docs/architecture.md`](docs/architecture.md), then
[`docs/bit-spec.md`](docs/bit-spec.md) and [`docs/authoring.md`](docs/authoring.md).
