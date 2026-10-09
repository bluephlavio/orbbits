# La forza di Archimede

<!-- Technical notes for maintainers and agents. The pedagogical intent lives in brief.md,
     classroom prose in narrative.md; do not repeat them here. -->

- Kind: document · Engine: LaTeX · Public page: `/bits/archimedes-principle-derivation/` (once `status` is usable)
- Source: `src/main.tex` (+ `src/assets/` for scans, images, data)
- Output: `dist/archimedes-principle-derivation.pdf`

## Workflow

```bash
just build archimedes-principle-derivation
just check archimedes-principle-derivation
```

## Implementation notes

- One-page handout, pdflatex via latexmk. Template preamble plus `array` (for the
  math-column sink/suspend/rise table) and TikZ (`arrows.meta`, `decorations.pathreplacing`
  for the $\Delta h$ brace). Block paragraphs (`\parskip`), no page number, no author/date.
- The TikZ figure is inline in `main.tex` (fluid with wavy free surface, immersed
  parallelepiped, pressure-force resultants on the bases, depth arrows, brace).
- Body authored outside the repo (author-composed handout, `archimede-dimostrazione-v2.tex`);
  adapted to the OrbBits preamble only — content and figure are unchanged.
- Conventions shared with `stevino-law-derivation`: $d$ for density (not $\rho$),
  $F_P^{f}$ / $F_P^{c}$ for the weights of fluid / body, Stevino's law as
  $p = p_0 + d_f g h$.

## Limitations / open issues

- The "any shape" extension of the principle is asserted, not derived (see brief).
