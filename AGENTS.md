# Guidance for AI agents working in OrbBits

OrbBits is a **personal, local-first repository of reusable educational artifacts (Bits)**,
published automatically as a static site (GitHub Pages) so that every usable Bit has a
stable classroom URL. Not a platform, not multi-user, not TexBits. Optimise for low friction
and inspectable results.

## Language policy

- Italian by default: authored classroom content — on-screen text, handouts, labels, the
  public `title` / `description` — unless the task asks for another language. A Bit declares
  `default_locale` (default `it`) and `locales`; an English-only or multilingual Bit is an
  ordinary Bit (`docs/localization.md`).
- English: code, paths, identifiers, comments, commit messages, docs, `README.md`.
- Internal Markdown of a Bit (`brief.md`, `narrative.md`): whichever language best supports
  the authoring task — a brief in English and a narrative in Italian is a normal pair. They
  are working notes, not localised public resources: one file each, never `brief.en.md`.
- **Language is not identity.** A translation adds a locale to the same Bit
  (`locales: [it, en]`, `locales/en.yml`, localised `outputs`); it never creates
  `<id>-en` or a second directory. A new medium (explorer → animation → diagram) is a new Bit.

## Before creating a Bit

1. **Look for relatives.** `just list` (tags are shown) and `just list --tag <tag>`; read the
   `bit.yml` and `brief.md` of any Bit on the same concept, *then* its implementation. A new
   Bit is warranted when the artifact has its own pedagogical or media identity (an
   explorer, an animation and a diagram of the unit circle are three Bits). Adapt the brief's
   intent to the strengths of the new medium; never port an implementation across engines.
2. **Name the pedagogical artifact, not the technology.** `unit-circle-animation`, not
   `unit-circle-manim`; `projectile-motion-explorer`, not `projectile-motion-p5`. The engine
   goes in `bit.yml`. Ids are stable semantic slugs, never numbered; they are public URLs.
3. Scaffold with the CLI, never by hand:
   `just new --title "<Titolo>" --template <manim|web|jsxgraph|tikz|latex> [--id <slug>] [--role <role>] [--tags a,b] [--locale en] [--locales it,en]`
   (without locale options the Bit is Italian; keep the id language-neutral).
4. Read `docs/bit-spec.md` (manifest contract) and load the skill for the engine
   (`.agents/skills/<engine>-bit/SKILL.md`; `create-bit` for the overall flow).
5. Write `brief.md` before coding: intent, essential relations, required elements,
   progression, pitfalls. It is what the next Bit on the same concept will start from.

## Rules of the house

- Editable material in `src/`; classroom/publishable outputs in `dist/`; scratch in `.build/`.
- `bit.yml` is the source of truth: keep `kind` / `role` / `engine` / `status` honest,
  declare `outputs` (with `locale` on language-specific files), record `default_locale` /
  `locales`, give the Bit the concept `tags` its relatives use, record `provenance` (with
  `license`) for any third-party or historical material.
- Licences (`docs/licensing.md`): software is MIT, original content is CC BY-SA 4.0 by
  inheritance (set `license:` in `bit.yml` only to override), third-party material keeps its
  own terms in `provenance`. Never claim CC BY-SA over material the owner does not own.
- Relationships between Bits are tags; there is no `family`/`parent` field and no folder
  per concept. Do not introduce one.
- Documentation has three homes: `README.md` technical, `brief.md` pedagogical and
  engine-independent, `narrative.md` classroom prose and notes after use (optional; update it
  when you learn something worth keeping).
- `status` decides publication: `draft` is local only; `usable` / `curated` go to the public
  site at `/bits/<id>/`. Set `usable` only when the Bit is built, checked and works; anything
  under `dist/` of a usable Bit is public.
- Do not organise Bits by subject/topic/level on disk; that is metadata.
- Not every asset is a Bit: a one-off image or formula belongs in a future Orbit as a Block.
- Interactive Bits are self-contained React components (`src/index.tsx`, default export,
  no dependence on page layout, route or base path; the only prop is an optional `locale`).
  Video/figure/document Bits produce files under `dist/`, which are committed (CI does not
  render); localised ones go under `dist/<tag>/` and are built once per language.
- Translating a Bit: add the tag to `locales`; add `locales/<tag>.yml` with the same keys
  (interactive) or localised `outputs` and a source that reads `ORBBITS_LOCALE` /
  `\orbLocale` (generated); build; keep `brief.md` as it is; adapt names and examples
  when the language calls for it rather than translating word by word. No new directory.
- Follow the style guides in `docs/style/`; do not add configuration layers to make them optional.
- Keep the tooling small: no plugin systems, no databases, no generic frameworks, no
  publication state machine.

## Before finishing

- `just build <id>` (or `just export <id>` for interactive Bits) and make sure it succeeds.
- `just check <id>` → 0 errors; fix warnings that are about your Bit (description,
  licence notes, naming).
- Update `bit.yml` (`status`, `description`, `tags`, taxonomy, provenance), `README.md`
  (technical), `brief.md` (pedagogical); `narrative.md` if you have something to say. The
  Markdown files are memory for the next author, not a schema: `check` never reads them.
- For changes to the tooling or the runtime: `just test`, `just web-check`, and `just site`
  (the production build; `just ci` runs all of them).
- Leave every editable source in the repository; never commit `.build/` or `dist/web/`.

## Where things are

| Need | Look at |
|------|---------|
| Concepts, layout, decisions | `docs/architecture.md` |
| Manifest fields, naming, tags, documentation files | `docs/bit-spec.md` |
| Locales, locale files, localised outputs, translation vs new Bit | `docs/localization.md` |
| Commands and options | `docs/authoring.md`, `justfile`, `uv run orbbits --help` |
| Web runtime, modes, export | `docs/web-runtime.md` |
| Public site, URLs, GitHub Pages, CI | `docs/publishing.md` |
| Provenance and licences | `docs/provenance.md`, `docs/licensing.md`, `CONTENT-LICENSE.md` |
| Engine conventions | `docs/style/*.md` and `.agents/skills/*/SKILL.md` |
| Reference Bits | `bits/unit-circle-explorer` (jsxgraph, localised it/en), `bits/alkhwarizmi-completing-square` (tikz, provenance), `bits/angle-as-rotation` (manim) — each with a filled `brief.md` |
