# Bit specification

A Bit is a directory `bits/<id>/` whose name is the Bit's stable identifier.

```text
bits/<id>/
├── bit.yml        manifest (required) — the source of truth
├── README.md      technical notes: implementation, build, decisions (expected)
├── brief.md       pedagogical specification, engine-independent (recommended)
├── narrative.md   reusable classroom prose and notes after use (optional)
├── locales/       per-language strings, <tag>.yml, only for Bits with translatable text (optional)
├── src/           editable material (required unless engine is static/external)
├── dist/          classroom-ready outputs (created on demand, versioned except dist/web/)
└── .build/        scratch space (ignored by git)
```

## Identifier and naming

Lowercase words separated by single dashes: `^[a-z0-9]+(-[a-z0-9]+)*$`. Renaming a Bit means
renaming the directory *and* `id`; `orbbits check` flags mismatches. The id is also the
Bit's public address, `/bits/<id>/` (docs/publishing.md), so choose it to last.

**Name the pedagogical artifact, not the technology.** The same concept legitimately yields
several Bits with different affordances; their ids say what each one *is* for the learner:

```text
unit-circle-explorer        interactive / jsxgraph
unit-circle-animation       video / manim
unit-circle-diagram         figure / tikz
unit-circle-construction    document / latex
```

Avoid the engine in the id (`unit-circle-jsxgraph`, `angle-as-rotation-manim`): the engine
lives in `bit.yml` and may change under the same URL. `check` warns when an id contains an
engine name. Useful suffixes: `-explorer`, `-simulation`, `-animation`, `-diagram`, `-plot`,
`-map`, `-handout`, `-source`. No numeric prefixes: Bits are reusable objects, not chapters.

**Language is not identity either.** A translation is the same Bit with one more entry in
`locales` (docs/localization.md), never `unit-circle-explorer-en`. Ids are language-neutral
slugs (English words, as the rest of the code).

Before creating a Bit, look for relatives: `just list --tag <tag>` and the `brief.md` of any
Bit that shares the concept (docs/authoring.md, "Related Bits").

## `bit.yml`

```yaml
id: alkhwarizmi-completing-square      # == directory name
title: Completare il quadrato con al-Khwarizmi   # shown on the public page → Italian

kind: figure          # video | interactive | figure | document
role: diagram         # open vocabulary, see below
engine: tikz          # manim | react | jsxgraph | p5 | mafs | three | tikz | latex | python | matplotlib | static | external | blender

status: usable        # draft | usable | curated  (usable/curated = published)
default_locale: it    # BCP-47 tag; language of title/description and of /bits/<id>/ (default it)
locales: [it]         # every language the Bit is realised in; must include default_locale
created: 2026-09-18   # optional
description: >-       # optional but expected for published Bits; shown on the public page
  ...
license: CC BY 4.0    # optional: the Bit's ORIGINAL content, when not the default CC BY-SA 4.0

outputs:              # classroom-ready artifacts under dist/
  - format: svg
    file: dist/figure.svg
  - format: pdf
    file: dist/figure.pdf
    description: print version
  - format: svg       # a localised output: exists in that language only (docs/localization.md)
    file: dist/en/figure.svg
    locale: en

build:                # optional, engine-specific (see docs/authoring.md)
  compiler: pdflatex  # interpreted by the engine; not a caller-facing interface

subjects: [mathematics, history-of-science]   # curricular placement (optional)
topics: [algebra, al-khwarizmi]
levels: [upper-secondary]
tags: [completing-the-square, quadratic-equations, geometric-algebra]   # concept keywords

provenance:           # third-party / historical material (docs/provenance.md)
  - source: "..."
    author: "..."
    url: "..."
    license: "..."
    modifications: "..."
    retrieved: 2026-09-18
    notes: "..."
```

Required: `id`, `title`, `kind`, `role`, `engine`. Everything else is optional.
Unknown top-level keys are preserved, so the manifest can grow without code changes.
The Python model is `src/orbbits/manifest.py`; the TypeScript view is `web/src/lib/catalog.ts`.

`title` and `description` appear on the public site in the Bit's `default_locale` (Italian
unless the Bit says otherwise); `README.md`, `brief.md` and code comments are documentation
(English). `language:` is the pre-2026-09 name of `default_locale`: still read, `check` asks
to rename it.

### `default_locale` and `locales`

The language of the canonical realisation and the set of languages the Bit exists in.
Normalised on load (`IT` → `it`, `en_gb` → `en-GB`, duplicates dropped); a tag that is not
`language[-Script][-REGION]` is an error, and so is a `default_locale` absent from `locales`.
Defaults: `it` and `[default_locale]`. Localised strings live in `locales/<tag>.yml`,
localised files in `outputs` with a `locale`. Everything about it: docs/localization.md.

### `license`

Optional. The licence of the Bit's *original* content when it differs from the repository
default (CC BY-SA 4.0, `CONTENT-LICENSE.md`). Leave it out for ordinary Bits: the default is
inherited and shown on the public page. It never covers third-party material, which is
licensed per `provenance` entry (docs/licensing.md).

### `kind` (closed)

| kind | rendered as | typical outputs |
|------|-------------|-----------------|
| `video` | `<video>` with poster | mp4 (+ webm), poster webp/png |
| `interactive` | React component mounted by the runtime | none declared; `dist/web/` is a rebuildable export |
| `figure` | `<img>` + downloads | svg, pdf, png |
| `document` | PDF frame + "open PDF" link | pdf |

Do not add kinds without a concrete rendering need.

### `role` (open, suggested)

`animation`, `simulation`, `explorable`, `dynamic-geometry`, `diagram`, `plot`,
`data-visualization`, `map`, `illustration`, `model`, `annotated-source`, `handout`.
Other values are allowed; `check` only warns, to keep the vocabulary from drifting silently.

### `status` and publication

- `draft` — under development or experimental; missing outputs are tolerated; **local only**;
- `usable` — used in class or reliable enough to be; declared outputs must exist; **published**;
- `curated` — polished for publication or stable inclusion in an Orbit; **published**, and
  third-party material must carry a license note.

Maturity is metadata, not location: there is no separate tree for drafts, and no separate
`published` flag (docs/publishing.md). `check` warns when a published Bit has no `brief.md`
or `description`.

### `tags`

Free keywords naming the *concept* and its ingredients, shared across Bits whatever their
kind or engine. They are the only relationship mechanism between Bits: many-to-many,
overlapping, non-hierarchical. There is no `family`, `parent` or `concept` field, and there
will not be one until real usage proves the need.

```yaml
# unit-circle-explorer            # unit-circle-animation
tags: [unit-circle, trigonometry,  tags: [unit-circle, trigonometry,
       sine, cosine, rotation]           sine, cosine, rotation]
```

Rules: slugs (`unit-circle`); loaded values are normalised (case, whitespace, underscores,
duplicates) and rejected if still invalid. `check` warns when a tag repeats a kind or engine
name (`manim`, `video`): that is what `kind`/`engine` are for. No controlled vocabulary yet;
reuse existing tags (`just list` shows them) before inventing new ones. `subjects`, `topics`
and `levels` follow the same syntax and place the Bit in a curriculum; they may overlap with
tags. Tags drive `just list --tag`, the site's filter and "related Bits".

### `outputs`

Each entry names a file under `dist/` and its format. Engines use the declared list to decide
what to produce (e.g. a TikZ Bit declaring `svg` and `pdf` gets both). `check` verifies that
declared outputs exist for non-draft Bits. Interactive Bits normally declare nothing. The
public page embeds the first suitable output and lists all of them as downloads.

An output may carry a `locale` (one of `locales`): the file exists in that language only,
conventionally under `dist/<tag>/`. Outputs without `locale` are locale-independent (a
poster, a formula sheet). Engines build once per locale that has outputs; the page embeds
the outputs of its locale (docs/localization.md).

## Documentation files

Three files with three audiences; all plain Markdown, none required, none validated for
content or structure. They are authoring and editorial memory — what the next author (or
agent) reads — not part of a Bit's identity. Write them in whichever language best supports
the task; they are not localised public resources (an Italian brief next to an English
README is fine).

**`README.md` — technical.** How the Bit is implemented and rebuilt: main sources, unusual
dependencies, build options, design decisions, limitations, open issues. For maintainers and
agents. Do not restate the pedagogy here.

**`brief.md` — pedagogical, engine-independent.** What the Bit is *for*, written so that the
concept can be re-created in another medium without copying the implementation:

```markdown
## Intent                      what the learner should understand or notice
## Essential relations         relationships that must stay visible
## Required elements           objects, labels, quantities, transformations (and what is left out)
## Didactic progression        intended order of presentation or discovery
## Misconceptions / pitfalls   what must not be suggested, visually or conceptually
## Related ideas               connections, related Bits by tag
```

This is the file an agent reads first when asked for `unit-circle-animation` "based on"
`unit-circle-explorer`. The headings above are the scaffolded starting point, not a schema:
keep what helps, drop the rest.

**`narrative.md` — editorial memory, optional.** What to say while showing the Bit, questions
to ask, captions, sequencing, historical notes, observations after classroom use. Usually in
the language of the classroom. Not an Orbit; raw material a future Orbit may draw on. No
fixed structure beyond the scaffolded headings.

Neither file is localised: one brief and one narrative per Bit, whatever its `locales`
(docs/localization.md). A published Bit should give a reader *something* human-readable —
`check` warns only when it has neither a `description` nor a brief/narrative.

**`locales/<tag>.yml` — translatable strings, optional.** Flat YAML of what the learner reads
(labels, buttons, captions, prompts, accessibility labels), one file per declared locale with
the same keys. Only for Bits that need it; TeX Bits may use `<tag>.tex`.

## `src/` and `dist/`

- `src/` is everything the Bit is produced or maintained from: code, TeX, project files,
  prompts, references. A Bit's own assets go in `src/assets/`.
- `dist/` is what goes to class, into a slide, an Orbit or the website. It is versioned
  (except `dist/web/`) because the site build consumes it without re-rendering.
- Non-deterministic Bits (AI-generated, Blender renders, scans) still keep their production
  material in `src/` (prompts, seeds, `.blend`, notes) and record provenance.

## Validation

`orbbits check [ids…]` reports errors (exit 1) and warnings (`--strict` makes them fatal):
manifest parse/shape errors (including invalid tags and language tags, a `default_locale`
missing from `locales`, an output `locale` not declared), id/directory mismatch, unknown
kind/status, outputs outside `dist/`, missing outputs for non-draft Bits, missing `src/`,
missing `README.md`, unknown engine or role (warning), engine names inside the id or the tags
(warning), the legacy `language:` field (warning), `locales/` files that do not match
`locales` (warning), localised outputs that leave a declared locale without any (warning),
published Bits with neither a `description` nor a `brief.md` / `narrative.md` (warning),
provenance without a license on published Bits (warning; error for `curated`),
engine-specific checks (missing entry file, unknown compiler…).
