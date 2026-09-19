# Authoring workflow

Everything goes through `just` (see `justfile`), which delegates to the Python CLI
(`uv run orbbits …`) and the web runtime (`pnpm exec astro …`). `orb` is an alias of `orbbits`.

## Setup

```bash
just setup            # uv sync (Python, incl. manim) + pnpm install (Astro, React, JSXGraph)
```

External toolchains used by engines: a TeX distribution with `latexmk` (TikZ/LaTeX),
`pdf2svg` or `dvisvgm` (SVG figures), `ffmpeg` (Manim posters), `gs` (PNG figures).

## Related Bits first

The same concept often deserves several Bits (an explorer, an animation, a diagram, a
handout). Before creating one, look for relatives and read their briefs:

```bash
just list                                    # every Bit with its tags
just list --tag unit-circle                  # Bits sharing a tag (repeat --tag to narrow)
cat bits/unit-circle-explorer/brief.md       # the concept, independent of the engine
```

Create a new Bit when the artifact has its own pedagogical or media identity; reuse the
brief's intent, relations and pitfalls, and adapt them to the strengths of the new medium
rather than porting the implementation. Give the new Bit the same concept tags.

## Create a Bit

```bash
just new                                     # interactive: title, slug, template
just new --title "Moto del proiettile" --template web            # non-interactive (agents)
just new --title "Hubble 1929" --id hubble-1929-plot --template tikz --role plot
just new --title "Circonferenza goniometrica" --id unit-circle-animation --template manim \
         --tags "unit-circle,trigonometry,rotation"
just new --title "Projectile motion" --template web --locale en          # English-only Bit
just new --title "Circonferenza goniometrica" --template manim --locales it,en   # two languages, default it
just new --list                              # available templates
```

`new` creates `bits/<id>/` from `templates/<template>/`, substitutes placeholders, refuses to
overwrite an existing Bit, and prints the next steps. Only title, slug and template are
asked; `--tags` (comma-separated, normalised to slugs), `--locale` (the default language,
`it` unless given) and `--locales` (every language the Bit will exist in; its first entry
becomes the default when `--locale` is absent) are optional. Everything else — description,
subjects, topics, levels, provenance — is edited afterwards in `bit.yml`. The scaffold
includes `README.md`, `brief.md` and `narrative.md` skeletons and writes
`default_locale` / `locales` (docs/localization.md).

Name the artifact, not the engine: `projectile-motion-explorer`, not `projectile-motion-p5`
(docs/bit-spec.md, "Identifier and naming").

| template | kind | engine | role |
|----------|------|--------|------|
| `manim` | video | manim | animation |
| `web` | interactive | react | explorable |
| `jsxgraph` | interactive | jsxgraph | dynamic-geometry |
| `tikz` | figure | tikz | diagram |
| `latex` | document | latex | handout |

p5, Mafs and three.js Bits start from the `web` template (`pnpm add p5` etc. at the repository
root, set `engine:` accordingly).

## Write the brief, then author

Fill `brief.md` (intent, essential relations, required elements, progression, pitfalls)
before coding or drawing: it is short, it forces the pedagogical decisions, and it is what
the next Bit on the same concept will start from. `narrative.md` collects what you plan to
say and ask; update it after using the Bit in class. Both are working notes in whatever
language suits you, with whatever structure helps; nothing validates them beyond "a
published Bit says something about itself" (a `description` is enough).

## Inspect

```bash
just list                                    # id · kind · role · engine · status · tags · title
just list --kind interactive --status usable
just list --published                        # what the public site shows
just list --json                             # for scripts and agents (adds published, path, brief, narrative)
```

## Develop

```bash
just dev unit-circle-explorer     # interactive: Astro dev server, opens /bits/<id>/
just dev angle-as-rotation        # manim: quick 480p render into .build/preview/
just web                          # the whole local catalog at http://localhost:4321 (drafts included)
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

Built outputs under `dist/` are committed: the public site consumes them without re-rendering
(docs/publishing.md).

A Bit with localised outputs (`locale:` on entries of `outputs`) is built once per language:
the engine sets `ORBBITS_LOCALE` (manim, python) or `\orbLocale` (tikz, latex) and writes
each language's files; `--quick` previews the default language only. Details and source
patterns: docs/localization.md.

## Validate

```bash
just check                        # whole repository
just check angle-as-rotation      # one Bit
just check --strict               # warnings are errors
```

## Publish

Set `status: usable` (or `curated`) in `bit.yml`, commit, push. CI builds the site and the
Bit appears at `https://bluephlavio.github.io/orbbits/bits/<id>/` — the link to put in
Classroom. Drafts stay local. Preview the exact production build with `just site` and
`just site-preview`; `just ci` runs everything CI runs. Details: docs/publishing.md.

Publishing makes the content public under the repository's terms: software MIT, original
content CC BY-SA 4.0 unless the Bit sets `license`, third-party material under its own
`provenance` licence (docs/licensing.md).

## Translate

Same Bit, one more language: add the tag to `locales`, add `locales/<tag>.yml` (interactive)
or localised `outputs` + a language-aware source (generated), build, check. Never a second
directory. Step by step: docs/localization.md, "Translating an existing Bit".

## Finish

Before considering a Bit done: build it, run `check` (0 errors, no warnings about your Bit),
fill `bit.yml` (`status`, `description`, `tags`, taxonomy, provenance), write `brief.md`,
keep `README.md` technical, keep sources in `src/` and outputs in `dist/`.

## Tests

```bash
just test                         # pytest (incl. a site build into a temp dir) + ruff
just web-check                    # astro check: types for the runtime and every interactive Bit
just ci                           # test + check + web-check + site
```
