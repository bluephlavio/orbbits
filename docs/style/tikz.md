# TikZ style

Conventions for `engine: tikz` figures. Reference implementation:
`bits/alkhwarizmi-completing-square`.

- `\documentclass[tikz,border=6pt]{standalone}`; one picture per Bit in `src/figure.tex`.
  Related variants belong in the same Bit only if they share the source (use `\ifdefined`
  switches or multiple `.tex` files with `build.main`), otherwise make another Bit.
- Outputs: `dist/figure.svg` (web, slides) and `dist/figure.pdf` (print). Declare `png` in
  `outputs` if a raster is needed (ghostscript, 300 dpi).
- Palette: `orbPrimary` (#1F5FBF), `orbAccent` (#E0A100), `orbMuted` (#7A7A7A); light fills
  via `!18`–`!20`. Colour is semantic: primary geometry, the thing being discussed, construction.
- Line width 0.9 pt, `>=Stealth`, labels `\small`, mathematics in math mode, dashed lines for
  auxiliary constructions, braces (`decorations.pathreplacing`) for dimensions.
- Scale the figure so that labels remain legible when the SVG is 12–14 cm wide on a slide.
- Language of labels: the Bit's `default_locale` (Italian by default); formulas are universal.
  For localised outputs the build defines `\orbLocale`; start the file with
  `\providecommand{\orbLocale}{it}` and switch the words on it (docs/localization.md).
- Preserve the argument in the figure: annotate the algebra next to the geometry when the
  picture *is* the proof.
