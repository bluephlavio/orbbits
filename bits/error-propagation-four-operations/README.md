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
- Final formulas use `amsmath` `\boxed{}`. The approximation sign and closing summary
  table distinguish exact results from first-order approximations; the setup states
  the positivity and small-relative-error assumptions.
- Derivations use `align*` chains that mirror the blackboard path: substitute the
  extremes, expand, transform visibly; prose (or a short `\text{}` annotation) only
  where the mathematical idea changes (crossed extremes, factoring out
  $\bar a\,\bar b$, conjugate multiplication, dropping second-order terms).
- Relative errors are written explicitly as $\Delta a/\bar a$, $\Delta b/\bar b$ —
  no $e_a$/$\varepsilon_a$ shorthand anywhere, including the summary table.
- The quotient denominator is eliminated by multiplying numerator and denominator
  by the conjugate $1 \pm \Delta b/\bar b$ (difference of squares), worked out in
  full for both max and min — not via the $1/(1-x) \simeq 1+x$ shortcut.
- The approximation sign $\simeq$ appears exactly where second-order terms are
  dropped, never earlier in the chain.
- Italian typography details: decimal comma written `0{,}01\%` in math mode.
- No assets, no external sources: content is original, hence no `provenance` and default
  CC BY-SA 4.0 inheritance.

## Limitations / open issues

- No worked numeric examples by design (brief says derivations only); a future Orbit could
  pair this with an exercise Block or an interactive comparing exact vs first-order intervals.
- Single locale (`it`); localization would require `\orbLocale` switching as per
  docs/localization.md.
