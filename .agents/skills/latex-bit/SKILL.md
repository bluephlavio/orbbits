---
name: latex-bit
description: Author and build a typeset document Bit with LaTeX (kind document, engine latex) — handouts, annotated historical sources, reference sheets; PDF output via latexmk, provenance for sources.
---

# LaTeX document Bit

Style: `docs/style/latex.md`. Provenance: `docs/provenance.md`.

## Files

```text
bits/<id>/
├── bit.yml            kind: document · engine: latex · outputs: dist/<id>.pdf
├── src/main.tex       article, 11pt, A4, babel italian, hyperref (template preamble)
├── src/assets/        scans, images, data included from main.tex (paths relative to src/)
└── dist/              produced by `just build <id>`
```

## Authoring

- Keep the template preamble; add packages deliberately (`booktabs` for tables, `csquotes`
  for quotations, `graphicx` is already there).
- Handouts: title only, no author/date, sections with `\section*`, generous white space,
  numbered steps with `enumitem`.
- Annotated sources: original text (or scan) first, then apparatus; the reference goes in the
  document *and* in `provenance` of `bit.yml`, with `modifications` (translation, excerpt).
- Do not build exercise banks here — that is TexBits.

## Build and validate

```bash
just build <id>        # latexmk (pdflatex; build.compiler for lualatex/xelatex) → dist/<id>.pdf
just check <id>
```

Inspect: render a page with ghostscript (`-sDEVICE=png16m -r80 -dFirstPage=1 -dLastPage=1`)
and view the PNG; errors and the `.log` are under `bits/<id>/.build/tex/`.

## Finish

`status: usable` once the PDF is built and read through; `README.md` with intended use.
