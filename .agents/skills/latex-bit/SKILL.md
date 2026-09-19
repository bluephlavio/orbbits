---
name: latex-bit
description: Author and build a typeset document Bit with LaTeX (kind document, engine latex) — handouts, annotated historical sources, reference sheets; PDF output via latexmk, provenance for sources.
---

# LaTeX document Bit

Style: `docs/style/latex.md`. Provenance: `docs/provenance.md`. Flow (relatives, naming,
brief, publication): `create-bit` skill.

## Files

```text
bits/<id>/
├── bit.yml            kind: document · engine: latex · outputs: dist/<id>.pdf · tags · provenance
├── brief.md           what the reader should take away; which sources/steps are essential
├── README.md          packages, compiler, included assets
├── narrative.md       how the handout is used in the lesson (optional)
├── src/main.tex       article, 11pt, A4, babel italian, hyperref (template preamble)
├── src/assets/        scans, images, data included from main.tex (paths relative to src/)
└── dist/              produced by `just build <id>`, committed (CI does not render)
```

Start from the brief. A document is the medium for *reading and keeping*: a handout that
accompanies an interactive or animation on the same concept reuses its tags and its
"essential relations" as the backbone of the text.

## Authoring

- Keep the template preamble; add packages deliberately (`booktabs` for tables, `csquotes`
  for quotations, `graphicx` is already there).
- Handouts: title only, no author/date, sections with `\section*`, generous white space,
  numbered steps with `enumitem`.
- Annotated sources: original text (or scan) first, then apparatus; the reference goes in the
  document *and* in `provenance` of `bit.yml`, with `modifications` (translation, excerpt).
- Localised handout: one Bit, `outputs` with `locale` (`dist/it/<id>.pdf`, `dist/en/<id>.pdf`),
  `\providecommand{\orbLocale}{it}` before `\documentclass`, then switch the `babel`
  language and the text on it (docs/localization.md). Never a second Bit for a translation.
- Do not build exercise banks here — that is TexBits.

## Build and validate

```bash
just build <id>        # latexmk (pdflatex; build.compiler for lualatex/xelatex) → dist/<id>.pdf
just check <id>
```

Inspect: render a page with ghostscript (`-sDEVICE=png16m -r80 -dFirstPage=1 -dLastPage=1`)
and view the PNG; errors and the `.log` are under `bits/<id>/.build/tex/<locale>/`.

## Finish

`status: usable` once the PDF is built and read through — that publishes it at
`/bits/<id>/` on the next push (embedded viewer + download), so check that every scan or
quotation inside has `provenance` with a `license`. `description` in the default locale;
concept `tags`; `README.md` technical, `brief.md` filled. `just check <id>` clean; commit
`dist/`.
