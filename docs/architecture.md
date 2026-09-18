# Architecture

OrbBits is a personal, local-first authoring system for reusable educational media.
The repository *is* the authoring environment; a public website will later be an output of it.

## Concepts

| Term | Meaning | Where |
|------|---------|-------|
| **Bit** | An independently authored, reusable educational artifact with its own production pipeline | `bits/<id>/` |
| **Block** | An editorial unit inside an Orbit (paragraph, equation, quote, image, … or a Bit) | future Orbit layer |
| **Orbit** | A rich lesson / narrative path composing Bits and Blocks | `orbits/` (empty for now) |

A Bit can be used as a Block; not every Block is a Bit. A trivial image or formula used once
in a lesson is a Block, not a Bit.

## Layout

```text
orbbits/
├── bits/<id>/            one directory per Bit, flat namespace, semantic slugs
│   ├── bit.yml           manifest — the source of truth (docs/bit-spec.md)
│   ├── README.md         intent, usage notes, decisions
│   ├── src/              editable material
│   ├── dist/             classroom-ready outputs (versioned, except dist/web/)
│   └── .build/           scratch space, never versioned
├── orbits/               reserved for future lessons
├── templates/<name>/     scaffolds, one per authoring engine (template.yml + files)
├── web/                  Astro + React runtime: standalone shells that mount Bits
├── src/orbbits/          Python CLI: new · list · check · build · dev · export
├── docs/                 canonical documentation (this directory)
├── .agents/skills/       operational guides for AI agents (also linked as .claude/skills)
├── AGENTS.md             rules of the house for agents (CLAUDE.md is a symlink)
├── justfile              human-facing task façade; delegates to uv / pnpm
├── pyproject.toml        Python project (uv); manim is a default dependency group
└── package.json          JavaScript project (pnpm); one node_modules for runtime and Bits
```

Bits are **not** organised by subject, topic, grade or technology on disk. Those live in
metadata; discovery derives from `bit.yml`, never from directory depth. Hundreds of
directories under `bits/` are fine.

## Three orthogonal dimensions

- `kind` — how the runtime renders the object: `video`, `interactive`, `figure`, `document`.
- `role` — what it is pedagogically: `animation`, `simulation`, `diagram`, `handout`, … (open).
- `engine` — how it is produced: `manim`, `react`, `jsxgraph`, `tikz`, `latex`, `python`, …

The engine determines the build pipeline (`src/orbbits/engines/`), the template that
scaffolds it (`templates/<name>/template.yml`) and the skill an agent should load.

## Engines

| engine | kind | build | dev |
|--------|------|-------|-----|
| `manim` | video | `manim render` at 1080p60 → `dist/<id>.mp4` + poster frame via ffmpeg | quick 480p render into `.build/preview/` |
| `tikz` | figure | `latexmk` → PDF → SVG (`pdf2svg`/`dvisvgm`), PNG via ghostscript if declared | — |
| `latex` | document | `latexmk` → PDF | — |
| `python` / `matplotlib` | figure | runs `src/main.py`, which writes into `dist/` | — |
| `react`, `jsxgraph`, `p5`, `mafs`, `three` | interactive | standalone static export into `dist/web/` | Astro dev server on the Bit's page |
| `static`, `external`, `blender` | any | none — outputs are maintained by hand, provenance is mandatory | — |

All web libraries are one engine family (`WebEngine`). Adding one is a template plus an entry
in `WEB_ENGINES` (`src/orbbits/engines/__init__.py`) and, if it needs a package, `pnpm add`.

## Web runtime

`web/` is an Astro project. It is a *shell*, not the future site:

- `web/src/lib/catalog.ts` discovers every `bits/*/bit.yml` at build time (`import.meta.glob`);
- `web/src/lib/BitHost.tsx` lazily mounts `bits/<id>/src/index.tsx` as a React island;
- `web/src/pages/bits/[id].astro` is the standalone page for any Bit (interactive → `BitHost`;
  video/figure/document → the declared `dist/` outputs);
- `web/src/pages/index.astro` is a local catalog.

An interactive Bit is a default-exported React component that owns all of its content and
never depends on the surrounding page. Orbits will mount the same component through the same
`BitHost`. See `docs/web-runtime.md`.

## Decisions worth knowing

- **One `node_modules` at the repository root.** Bits under `bits/*/src` import `react`,
  `jsxgraph`, … from the same place the runtime does; no per-Bit `package.json`.
- **Manifest first, no database.** `list`/`check` scan `bits/*/bit.yml`. A generated
  `catalog.json` or SQLite index may be added later as a rebuildable cache.
- **`dist/` is versioned** (SVG, PDF, posters, and for now MP4). `dist/web/` and `.build/`
  are not. Large videos may move to Git LFS or object storage later; nothing depends on
  their physical location except the `outputs` entries in `bit.yml`.
- **Templates are files with placeholders** (`__BIT_ID__`, `__BIT_TITLE__`, `__BIT_ROLE__`,
  `__BIT_CLASS__`, `__BIT_DATE__`), not a templating language. Every template file is valid
  source in its own right.
- **Opinions live in templates, docs/style and skills**, not in a configuration layer.
- **TexBits stays separate.** Exercise banks are TexBits' concern; a future Orbit may
  reference TexBits selections through a provider Block.
