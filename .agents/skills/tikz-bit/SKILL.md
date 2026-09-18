---
name: tikz-bit
description: Author and build a static figure Bit with TikZ (kind figure, engine tikz) — standalone document, project palette, SVG/PDF outputs via latexmk and pdf2svg, validation.
---

# TikZ Bit

Reference: `bits/alkhwarizmi-completing-square`. Style: `docs/style/tikz.md`.

## Files

```text
bits/<id>/
├── bit.yml            kind: figure · engine: tikz · outputs: dist/figure.svg, dist/figure.pdf
├── src/figure.tex     \documentclass[tikz,border=6pt]{standalone}
└── dist/              produced by `just build <id>`
```

## Authoring

- Keep the template preamble: `amsmath`, `calc`, `arrows.meta`; add libraries as needed
  (`angles,quotes`, `decorations.pathreplacing`, `pgfplots` for data plots).
- Palette macros `orbPrimary`, `orbAccent`, `orbMuted`; light fills with `!18`.
- Use `\def` / `\pgfmathsetmacro` for the parameters of the figure so it is "to scale" and
  easy to vary. Comment the intent at the top of the file.
- Labels `\small`, math mode for symbols, Italian words.
- Extra formats: add `{format: png, file: dist/figure.png}` to `outputs` (ghostscript, 300 dpi).
- Compiler: `build.compiler: lualatex|xelatex` in `bit.yml` when fonts require it.

## Build and validate

```bash
just build <id>        # latexmk → .build/tex/figure.pdf → dist/figure.pdf + dist/figure.svg
just check <id>
```

Inspect without a viewer: `gs -q -dSAFER -dBATCH -dNOPAUSE -sDEVICE=png16m -r110
-sOutputFile=/tmp/fig.png bits/<id>/dist/figure.pdf` and view the PNG. Compilation errors
are printed by latexmk; the log is under `bits/<id>/.build/tex/`.

## Finish

`status: usable` once `dist/` is built and reviewed; `provenance` when redrawing a historical
figure; `README.md` with what the figure argues.
