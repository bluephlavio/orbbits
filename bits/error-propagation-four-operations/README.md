# Propagazione degli errori nelle quattro operazioni

<!-- Technical notes for maintainers and agents. The pedagogical intent lives in brief.md,
     classroom prose in narrative.md; do not repeat them here. -->

- Kind: document · Engine: LaTeX · Public page: `/bits/error-propagation-four-operations/` (once `status` is usable)
- Source: `src/main.tex` (+ `src/assets/` for scans, images, data)
- Output: `dist/error-propagation-four-operations.pdf`

## Workflow

```bash
just build error-propagation-four-operations
just check error-propagation-four-operations
```

## Implementation notes

- Template preamble (article 11pt A4, babel italian, amsmath, microtype, hidelinks) plus
  `booktabs` for the closing summary table — the only addition.
- Final formulas are `amsmath` `\boxed{}` with a flush-right `\tag*{}` label that encodes
  the exact/approximate distinction (`esatta`, `al primo ordine`, `formula d'uso`); the
  legend is stated in the text before the labels first appear.
- Derivations use `align*` with short `\text{}` annotations on the conceptually loaded
  steps (sign flip in the difference, crossed extremes, term-by-term simplification).
- Italian typography details: decimal comma written `0{,}01\%` in math mode.
- No assets, no external sources: content is original, hence no `provenance` and default
  CC BY-SA 4.0 inheritance.

## Limitations / open issues

- No worked numeric examples by design (brief says derivations only); a future Orbit could
  pair this with an exercise Block or an interactive comparing exact vs first-order intervals.
- Single locale (`it`); localization would require `\orbLocale` switching as per
  docs/localization.md.
