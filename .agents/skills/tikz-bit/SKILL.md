---
name: tikz-bit
description: Author and build a static figure Bit with TikZ (kind figure, engine tikz) — standalone document, project palette, SVG/PDF outputs via latexmk and pdf2svg, validation.
---

# TikZ Bit

Reference: `bits/alkhwarizmi-completing-square` (with a filled `brief.md`). Style:
`docs/style/tikz.md`. Flow (relatives, naming, brief, publication): `create-bit` skill.

## Files

```text
bits/<id>/
├── bit.yml            kind: figure · engine: tikz · outputs: dist/figure.svg, dist/figure.pdf · tags · provenance
├── brief.md           what the picture must make visible at a glance; what is left out
├── README.md          parameters/macros, libraries, compiler
├── narrative.md       how to "read" the figure with the class (optional)
├── src/figure.tex     \documentclass[tikz,border=6pt]{standalone}
└── dist/              produced by `just build <id>`, committed (CI does not render)
```

Start from the brief. A figure is the medium for *one instant, readable at a glance and
printable*: the brief's "essential relations" become what is drawn to scale and labelled;
a related interactive or animation on the same concept tells you which instant to freeze.

## Authoring

- Keep the template preamble: `amsmath`, `calc`, `arrows.meta`; add libraries as needed
  (`angles,quotes`, `decorations.pathreplacing`, `pgfplots` for data plots).
- Palette macros `orbPrimary`, `orbAccent`, `orbMuted`; light fills with `!18`.
- Use `\def` / `\pgfmathsetmacro` for the parameters of the figure so it is "to scale" and
  easy to vary. Comment the intent at the top of the file.
- Labels `\small`, math mode for symbols, words in the Bit's `default_locale`. Localised
  figure: `outputs` with `locale` (`dist/it/figure.svg`, `dist/en/figure.svg`), and the
  source starts with `\providecommand{\orbLocale}{it}` and switches the words on it
  (`\usepackage{ifthen}`, `\ifthenelse{\equal{\orbLocale}{en}}{…}{…}`, or
  `\input{../locales/\orbLocale.tex}`); `just build` compiles once per locale.
- Extra formats: add `{format: png, file: dist/figure.png}` to `outputs` (ghostscript, 300 dpi).
- Compiler: `build.compiler: lualatex|xelatex` in `bit.yml` when fonts require it.

## Build and validate

```bash
just build <id>        # latexmk → .build/tex/<locale>/figure.pdf → dist/figure.pdf + dist/figure.svg
just check <id>
```

Inspect without a viewer: `gs -q -dSAFER -dBATCH -dNOPAUSE -sDEVICE=png16m -r110
-sOutputFile=/tmp/fig.png bits/<id>/dist/figure.pdf` and view the PNG. Compilation errors
are printed by latexmk; the log is under `bits/<id>/.build/tex/<locale>/`.

## Finish

`status: usable` once `dist/` is built and reviewed — that publishes the SVG/PDF at
`/bits/<id>/` on the next push. `provenance` (with `license`) when redrawing a historical
figure; `description` in the default locale; concept `tags`; `README.md` technical,
`brief.md` with what the figure argues. `just check <id>` clean; commit `dist/`.
