# Architecture

OrbBits is a personal, local-first authoring system for reusable educational media.
The repository *is* the authoring environment; the public site is one of its outputs, built
and deployed automatically (docs/publishing.md) and disposable.

## Concepts

| Term | Meaning | Where |
|------|---------|-------|
| **Bit** | An independently authored, reusable educational artifact with its own production pipeline | `bits/<id>/` |
| **Block** | An editorial unit inside an Orbit (paragraph, equation, quote, image, … or a Bit) | future Orbit layer |
| **Orbit** | A rich lesson / narrative path composing Bits and Blocks | `orbits/` (empty for now) |

A Bit can be used as a Block; not every Block is a Bit. A trivial image or formula used once
in a lesson is a Block, not a Bit.

The *concept* behind a Bit (e.g. "the unit circle") is **not** a repository object. Several
Bits may realise one concept in different media; they are related through shared `tags`,
their `brief.md`, and human/AI reading — never through a `family`/`parent` field or a
folder. If real use later shows that such an abstraction is needed, it will be extracted
from examples, not designed up front.

```text
concept (implicit)
   ├── unit-circle-explorer     interactive / jsxgraph   tags: [unit-circle, trigonometry, …]   locales: [it, en]
   ├── unit-circle-animation    video / manim            tags: [unit-circle, trigonometry, …]   locales: [it]
   └── unit-circle-diagram      figure / tikz            tags: [unit-circle, …]                 locales: [it]
```

Language is the other axis, and it is *inside* a Bit: one pedagogical identity, several
language realisations (`default_locale`, `locales`, `locales/<tag>.yml`, localised
`outputs`), the same id and URL. A translation never creates a Bit; a new medium always
does (docs/localization.md).

## Layout

```text
orbbits/
├── bits/<id>/            one directory per Bit, flat namespace, semantic slugs
│   ├── bit.yml           manifest — the source of truth (docs/bit-spec.md)
│   ├── README.md         technical notes (implementation, build, decisions)
│   ├── brief.md          pedagogical specification, engine-independent
│   ├── narrative.md      classroom prose, questions, notes after use (optional)
│   ├── locales/          per-language strings, <tag>.yml (only when the Bit has translatable text)
│   ├── src/              editable material
│   ├── dist/             classroom-ready outputs (versioned, except dist/web/)
│   └── .build/           scratch space, never versioned
├── orbits/               reserved for future lessons
├── templates/<name>/     scaffolds, one per authoring engine (template.yml + files)
├── web/                  Astro + React runtime: local catalog, public site, exports
├── src/orbbits/          Python CLI: new · list · check · build · dev · export
├── tests/                pytest, incl. an end-to-end site build
├── docs/                 canonical documentation (this directory)
├── .agents/skills/       operational guides for AI agents (also linked as .claude/skills)
├── .github/workflows/    site.yml — verify and deploy to GitHub Pages
├── AGENTS.md             rules of the house for agents (CLAUDE.md is a symlink)
├── justfile              human-facing task façade; delegates to uv / pnpm
├── pyproject.toml        Python project (uv); manim is a default dependency group
├── package.json          JavaScript project (pnpm); one node_modules for runtime and Bits
├── LICENSE               MIT — the software (CLI, runtime, templates, sources inside Bits)
└── CONTENT-LICENSE.md    CC BY-SA 4.0 — original educational content (docs/licensing.md)
```

Bits are **not** organised by subject, topic, grade or technology on disk. Those live in
metadata; discovery derives from `bit.yml`, never from directory depth. Hundreds of
directories under `bits/` are fine.

## Three orthogonal dimensions

- `kind` — how the runtime renders the object: `video`, `interactive`, `figure`, `document`.
- `role` — what it is pedagogically: `animation`, `simulation`, `diagram`, `handout`, … (open).
- `engine` — how it is produced: `manim`, `react`, `jsxgraph`, `tikz`, `latex`, `python`, …

The engine determines the build pipeline (`src/orbbits/engines/`), the template that
scaffolds it (`templates/<name>/template.yml`) and the skill an agent should load. None of
the three appears in the Bit's id or URL: the id names the pedagogical artifact.

## Engines

| engine | kind | build | dev |
|--------|------|-------|-----|
| `manim` | video | `manim render` at 1080p60 → `dist/<id>.mp4` + poster frame via ffmpeg; `ORBBITS_LOCALE` per localised output | quick 480p render into `.build/preview/` |
| `tikz` | figure | `latexmk` → PDF → SVG (`pdf2svg`/`dvisvgm`), PNG via ghostscript if declared; `\orbLocale` per localised output | — |
| `latex` | document | `latexmk` → PDF; `\orbLocale` per localised output | — |
| `python` / `matplotlib` | figure | runs `src/main.py`, which writes into `dist/`; `ORBBITS_LOCALE` per localised output | — |
| `react`, `jsxgraph`, `p5`, `mafs`, `three` | interactive | standalone static export into `dist/web/` | Astro dev server on the Bit's page |
| `static`, `external`, `blender` | any | none — outputs are maintained by hand, provenance is mandatory | — |

All web libraries share one engine class (`WebEngine`). Adding one is a template plus an
entry in `WEB_ENGINES` (`src/orbbits/engines/__init__.py`) and, if it needs a package, `pnpm add`.

Every engine builds once per locale that declares outputs (`Engine.locale_runs`); a Bit
without localised outputs builds exactly once, in its default language.

## Web runtime and public site

`web/` is an Astro project with three modes (docs/web-runtime.md):

- **dev** (`just web`, `just dev <id>`): every Bit, drafts included, at `/bits/<id>/`;
- **site** (`just site`, CI): the public library — home page with the published Bits and a
  tag filter, one canonical page `/bits/<id>/` per published Bit (interactive mount, video,
  figure or PDF, downloads, related Bits). Base path and origin come from the environment;
- **export** (`just export <id>`): one interactive Bit as a self-contained folder.

`web/src/lib/catalog.ts` discovers `bits/*/bit.yml` at build time; `web/src/lib/BitHost.tsx`
lazily mounts `bits/<id>/src/index.tsx` as a React island. An interactive Bit is a
default-exported React component that owns all of its content and never depends on the
surrounding page or base path; the one thing the page tells it is the `locale` to render.
Orbits will mount the same component through the same `BitHost`, at `/orbits/<id>/`.

The canonical page renders a Bit in its `default_locale`. Localised routes
(`/en/bits/<id>/`) are a future addition to the runtime that would touch no Bit.

## Publication

```text
edit / build locally  →  git commit + push  →  GitHub Actions  →  astro build  →  GitHub Pages
```

- Publication is derived from `status`: `draft` is local only; `usable` and `curated` are
  published. No duplicate `published` flag.
- Canonical URL: `/bits/<id>/`, stable across kinds, engines and hosts; the host/base is
  configuration. Classroom links target the page, never a raw file.
- CI verifies (tests, `orbbits check`, `astro check`) and builds the site from the outputs
  already committed under `dist/`; it never renders Manim/TikZ/LaTeX. Details and the
  trade-off in docs/publishing.md.

## Decisions worth knowing

- **One `node_modules` at the repository root.** Bits under `bits/*/src` import `react`,
  `jsxgraph`, … from the same place the runtime does; no per-Bit `package.json`.
- **Manifest first, no database.** `list`/`check`/the site scan `bits/*/bit.yml`. A generated
  catalog may be added later as a rebuildable, non-authoritative cache.
- **Tags, not families.** Relationships between Bits are many-to-many keywords; there is no
  hierarchy, no parent object, no folder per concept.
- **Language is metadata, not identity.** `default_locale` / `locales` in the manifest,
  strings in `locales/<tag>.yml`, files in localised `outputs`; the id and the URL never
  carry a language, and Italian is a default, not a requirement (docs/localization.md).
- **Two licences, one rule.** Software is MIT, original content is CC BY-SA 4.0 unless a Bit
  says otherwise, third-party material keeps its own terms in `provenance`; a Bit inherits
  the content default without declaring it (docs/licensing.md).
- **Documentation in three files.** `README.md` (technical), `brief.md` (pedagogical,
  engine-independent, what an agent reads to re-create a concept in another medium),
  `narrative.md` (classroom prose). Scaffolded by every template as starting points, in any
  working language, never parsed: `check` only asks a published Bit for *some*
  human-readable text (a `description`, or one of the notes).
- **`dist/` is versioned** (SVG, PDF, posters, and for now MP4). `dist/web/` and `.build/`
  are not. Large videos may move to Git LFS or object storage later; nothing depends on
  their physical location except the `outputs` entries in `bit.yml`.
- **Templates are files with placeholders** (`__BIT_ID__`, `__BIT_TITLE__`, `__BIT_ROLE__`,
  `__BIT_CLASS__`, `__BIT_DATE__`, `__BIT_TAGS__`), not a templating language. Every template
  file is valid source in its own right.
- **Opinions live in templates, docs/style and skills**, not in a configuration layer.
- **GitHub Pages is a target, not a dependency.** Two environment variables and one workflow
  file are all that know about it.
- **TexBits stays separate.** Exercise banks are TexBits' concern; a future Orbit may
  reference TexBits selections through a provider Block.

## Internal Componentization

Interactive Bits can have arbitrarily complex internal React structure: multiple synchronized
components sharing state, dynamic views, progressive reveal, custom hooks and utilities. All
of this is implementation detail.

**Public boundary:** A Bit is the unit of publication. The caller (the runtime, an Orbit, the
public catalog) does not choose or configure internal components; they mount the Bit and get
the whole thing. `BitHost` passes only the `locale` prop; the component owns everything else.
Internal components are discovered through reading the brief.md (what views the learner
should see) and the source code, never through a schema or registry.

**Example:** `unit-circle-explorer` can internally decompose into `<UnitCircleBoard />`,
`<CoordinateDisplay />`, `<ValueTable />`, `<SymbolicRepresentation />`, and `<TrigPlots />`
all sharing state through React patterns. The pedagogical identity remains one: "exploring
the unit circle as a function." The id, URL, and brief.md reflect that identity, not the
component tree.

---

## Deferred on purpose

Ideas that were considered and set aside until actual authoring pressure appears. None of
them has a field, a folder or a dependency in the repository, and none should be introduced
without a concrete current need:

- a general **variant** or **parametrization** system (`context`, `variant_of`, parameters)
  — today a variation is either the same Bit (a locale) or a new Bit related by tags.
  **Why deferred:** caller-facing context would require defining a schema per Bit, a runtime
  interface to pass parameters, and discovery machinery. The use case is not yet clear:
  would Orbits want `Bit(context={type: "2"})` or would they embed multiple separate Bits?
  When a real Orbit needs this, the pattern will clarify.
- per-Bit **forks** and upstream/downstream lineage (`forked_from`, `upstream`) — the
  repository is the unit of versioning;
- **Bit.dev**-style component tooling (isolated previews, generators, per-component
  environments) — appealing for interactive Bits, but OrbBits Bits are broader than
  software components (videos, figures, PDFs, Blender pipelines) and the current model is
  intentionally simpler;
- a **multilingual public site** (localised routes and chrome, per-language
  `title`/`description`) — the architecture is ready for it (docs/localization.md), the
  site is Italian until an international audience exists.
