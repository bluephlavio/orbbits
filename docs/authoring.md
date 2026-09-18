# Authoring workflow

Everything goes through `just` (see `justfile`), which delegates to the Python CLI
(`uv run orbbits …`) and the web runtime (`pnpm exec astro …`). `orb` is an alias of `orbbits`.

## Setup

```bash
just setup            # uv sync (Python, incl. manim) + pnpm install (Astro, React, JSXGraph)
```

External toolchains used by engines: a TeX distribution with `latexmk` (TikZ/LaTeX),
`pdf2svg` or `dvisvgm` (SVG figures), `ffmpeg` (Manim posters), `gs` (PNG figures).

## Create a Bit

```bash
just new                                     # interactive: title, slug, template
just new --title "Projectile motion" --template web        # non-interactive (agents)
just new --title "Hubble 1929" --id hubble-1929-plot --template tikz --role plot
just new --list                              # available templates
```

`new` creates `bits/<id>/` from `templates/<template>/`, substitutes placeholders, refuses to
overwrite an existing Bit, and prints the next steps. Only title, slug and template are
asked; edit `bit.yml` afterwards for description, subjects, topics, levels, provenance.

| template | kind | engine | role |
|----------|------|--------|------|
| `manim` | video | manim | animation |
| `web` | interactive | react | explorable |
| `jsxgraph` | interactive | jsxgraph | dynamic-geometry |
| `tikz` | figure | tikz | diagram |
| `latex` | document | latex | handout |

p5, Mafs and three.js Bits start from the `web` template (`pnpm add p5` etc. at the repository
root, set `engine:` accordingly).

## Inspect

```bash
just list                                    # id · kind · role · engine · status · title
just list --kind interactive --status usable
just list --json                             # for scripts and agents
```

## Develop

```bash
just dev unit-circle-explorer     # interactive: Astro dev server, opens /bits/<id>
just dev angle-as-rotation        # manim: quick 480p render into .build/preview/
just web                          # the whole local catalog at http://localhost:4321
```

When run by an AI agent, Astro starts the dev server in the background and returns
(`pnpm exec astro dev stop --root "$PWD/web"` stops it; `… dev logs` shows its log).

## Build

```bash
just build alkhwarizmi-completing-square     # tikz → dist/figure.svg + dist/figure.pdf
just build angle-as-rotation                 # manim → dist/<id>.mp4 + dist/poster.webp
just build angle-as-rotation --quick         # fast low-quality render, stays in .build/
just build unit-circle-explorer              # web → same as export
just export unit-circle-explorer             # standalone site in dist/web/ (not versioned)
```

Engine-specific options live under `build:` in `bit.yml`:

| engine | option | default |
|--------|--------|---------|
| manim | `scene` | first `Scene` subclass in `src/scene.py` |
| manim | `quality` | `h` (1080p60); `--quick` forces `l` |
| manim | `poster` | `last` (`first`, or seconds) |
| tikz / latex | `main` | the only `.tex` in `src/` (`figure.tex` / `main.tex` preferred) |
| tikz / latex | `compiler` | `pdflatex` (`lualatex`, `xelatex`) |
| python | `main` | `src/main.py` |

## Validate

```bash
just check                        # whole repository
just check angle-as-rotation      # one Bit
just check --strict               # warnings are errors
```

## Finish

Before considering a Bit done: build it, run `check`, update `README.md` and `bit.yml`
(status, description, taxonomy, provenance), keep sources in `src/` and outputs in `dist/`.

## Tests

```bash
just test                         # pytest + ruff
just web-check                    # astro check: types for the runtime and every interactive Bit
```
