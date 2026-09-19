# LaTeX document style

Conventions for `engine: latex` documents (handouts, source packets, reference sheets).

- `article`, 11 pt, A4, 2.2 cm margins, `microtype`, `babel` Italian, `hyperref` hidden links
  (the template); `\title` from the Bit title, no author/date on classroom handouts.
- `src/main.tex` is the entry; figures and included sources go under `src/assets/` and are
  included with paths relative to `src/` (`latexmk` runs there).
- Output: `dist/<id>.pdf`. Rebuild before changing `status` to `usable`. A handout in two
  languages is one Bit with `dist/it/…` and `dist/en/…` outputs and a source that switches on
  `\orbLocale` (`babel` language included); see docs/localization.md.
- Annotated historical sources: quote the original (or a scan under `src/assets/`), give the
  reference in the document *and* in `provenance` of `bit.yml`, and mark modifications
  (translation, excerpting).
- Exercise banks and assessments are TexBits' job; a handout may *reference* them but should
  not reimplement them.
