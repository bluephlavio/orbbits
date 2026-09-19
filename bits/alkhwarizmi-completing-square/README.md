# Completare il quadrato con al-Khwarizmi

Technical notes. Pedagogical intent: `brief.md`; classroom prose: `narrative.md`.

- Kind: figure · Engine: TikZ · Public page: `/bits/alkhwarizmi-completing-square/`
- Source: `src/figure.tex` (standalone TikZ picture)
- Outputs: `dist/figure.svg` (web/slides), `dist/figure.pdf` (print)

## Workflow

```bash
just build alkhwarizmi-completing-square
just check alkhwarizmi-completing-square
```

## Implementation notes

End-to-end validation of the TikZ builder (latexmk → PDF → SVG via pdf2svg).

- The drawing is parametric: `\x` (the solution, 3) and `\h` (half the coefficient, 5) set
  every coordinate, so the proportions are "to scale" and another example is a two-line edit.
- Palette macros `orbPrimary` / `orbAccent` / `orbMuted` with `!18`–`!20` fills; braces via
  `decorations.pathreplacing`; the algebra is one `align=left` node beside the figure.
- Compiles with `pdflatex`; no fonts beyond Computer Modern.

## Limitations / open issues

- Labels are set in `\small`; on a phone the SVG is readable only in landscape.
