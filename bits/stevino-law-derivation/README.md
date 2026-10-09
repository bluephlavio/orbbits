# La legge di Stevino

<!-- Technical notes for maintainers and agents. The pedagogical intent lives in brief.md,
     classroom prose in narrative.md; do not repeat them here. -->

- Kind: document · Engine: LaTeX · Public page: `/bits/stevino-law-derivation/` (once `status` is usable)
- Source: `src/main.tex` (+ `src/assets/` for scans, images, data)
- Output: `dist/stevino-law-derivation.pdf`

## Workflow

```bash
just build stevino-law-derivation
just check stevino-law-derivation
```

## Implementation notes

- Adapted from the author's existing handout (`stevino-equilibrio-colonna-v3.tex`, private
  draft): body unchanged, preamble ported to the OrbBits template.
- Template preamble (article 11pt A4, babel italian, amsmath, microtype, hidelinks) plus
  `lmodern` and `tikz` with `arrows.meta` and `decorations.pathreplacing` (braces) — the
  only additions.
- Deviations from the template kept from the original, tuned for a one-page layout:
  `geometry` hmargin 2 cm / vmargin 1.7 cm, block paragraphs (`\parindent` 0,
  `\parskip` 6pt), `\pagestyle{empty}`, left-aligned title block with subtitle instead of
  `\maketitle`.
- The two `tikzpicture` environments (force diagram, p–h graph) are self-contained and
  reusable separately.
- Density is written $d_f$ (school convention $d = m/V$), not $\rho$; see brief.md.
- No assets, no external sources: content is original, hence no `provenance` and default
  CC BY-SA 4.0 inheritance.

## Limitations / open issues

- Single locale (`it`); localization would require `\orbLocale` switching as per
  docs/localization.md.
- Deliberately no numeric exercises (brief says derivation only); a future Orbit could pair
  it with exercise Blocks or a pressure-vs-depth interactive.
