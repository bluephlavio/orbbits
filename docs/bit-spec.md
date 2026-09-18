# Bit specification

A Bit is a directory `bits/<id>/` whose name is the Bit's stable identifier.

```text
bits/<id>/
├── bit.yml       manifest (required)
├── README.md     intent and notes (expected)
├── src/          editable material (required unless engine is static/external)
├── dist/         classroom-ready outputs (created on demand)
└── .build/       scratch space (ignored by git)
```

## Identifier

Lowercase words separated by single dashes: `^[a-z0-9]+(-[a-z0-9]+)*$`.
Prefer stable semantic slugs (`roemer-io-eclipses`, `mercator-rhumb-lines`).
No numeric prefixes: Bits are reusable objects, not chapters. Renaming a Bit means renaming
the directory *and* `id`; `orbbits check` flags mismatches.

## `bit.yml`

```yaml
id: alkhwarizmi-completing-square      # == directory name
title: Completing the square in al-Khwarizmi

kind: figure          # video | interactive | figure | document
role: diagram         # open vocabulary, see below
engine: tikz          # manim | react | jsxgraph | p5 | mafs | three | tikz | latex | python | matplotlib | static | external | blender

status: usable        # draft | usable | curated
language: it          # optional, BCP-47-ish
created: 2026-09-18   # optional
description: >-       # optional, one or two sentences
  ...

outputs:              # classroom-ready artifacts under dist/
  - format: svg
    file: dist/figure.svg
  - format: pdf
    file: dist/figure.pdf
    description: print version

build:                # optional, engine-specific (see docs/authoring.md)
  compiler: pdflatex

subjects: [mathematics, history-of-science]   # optional, evolvable taxonomy
topics: [algebra, al-khwarizmi]
levels: [upper-secondary]
tags: []

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

### `kind` (closed)

| kind | rendered as | typical outputs |
|------|-------------|-----------------|
| `video` | `<video>` | mp4 (+ webm), poster webp/png |
| `interactive` | React component mounted by the runtime | none declared; `dist/web/` is a rebuildable export |
| `figure` | `<img>` | svg, pdf, png |
| `document` | PDF viewer / download | pdf |

Do not add kinds without a concrete rendering need.

### `role` (open, suggested)

`animation`, `simulation`, `explorable`, `dynamic-geometry`, `diagram`, `plot`,
`data-visualization`, `map`, `illustration`, `model`, `annotated-source`, `handout`.
Other values are allowed; `check` only warns, to keep the vocabulary from drifting silently.

### `status`

- `draft` — under development or experimental; missing outputs are tolerated;
- `usable` — used in class or reliable enough to be; declared outputs must exist;
- `curated` — polished for publication or stable inclusion in an Orbit.

Maturity is metadata, not location: there is no separate tree for drafts.

### `outputs`

Each entry names a file under `dist/` and its format. Engines use the declared list to decide
what to produce (e.g. a TikZ Bit declaring `svg` and `pdf` gets both). `check` verifies that
declared outputs exist for non-draft Bits. Interactive Bits normally declare nothing.

## `src/` and `dist/`

- `src/` is everything the Bit is produced or maintained from: code, TeX, project files,
  prompts, references. A Bit's own assets go in `src/assets/`.
- `dist/` is what goes to class, into a slide, an Orbit or the website.
- Non-deterministic Bits (AI-generated, Blender renders, scans) still keep their production
  material in `src/` (prompts, seeds, `.blend`, notes) and record provenance.

## Validation

`orbbits check [ids…]` reports errors (exit 1) and warnings (`--strict` makes them fatal):
manifest parse/shape errors, id/directory mismatch, unknown kind/status, outputs outside
`dist/`, missing outputs for non-draft Bits, missing `src/`, missing `README.md`, unknown
engine or role (warning), engine-specific checks (missing entry file, unknown compiler…).
