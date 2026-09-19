---
name: create-bit
description: Create a new OrbBits Bit end to end — find related Bits and read their brief, choose the template, name the pedagogical artifact, scaffold with the CLI, write the brief, author, build, validate, fill in metadata and tags, decide publication. Use for any "create/add a new Bit" request before loading an engine-specific skill.
---

# Create a Bit

## 1. Decide whether it is a Bit

A Bit deserves its own directory when it has a meaningful, preservable production pipeline
and will be reused: an animation, an interactive, a generated figure, a typeset handout.
A one-off image or formula is a Block for a future Orbit, not a Bit.

## 2. Find relatives and read their brief

```bash
just list                                  # every Bit with its tags
just list --tag <tag>                      # Bits on the same concept (repeat --tag to narrow)
cat bits/<related-id>/brief.md             # intent, essential relations, pitfalls
cat bits/<related-id>/bit.yml              # tags to reuse, kind/role/engine
```

Read the brief **before** the implementation. Then decide:

- same concept, new medium or affordance (explorer → animation → diagram → handout): a new
  Bit, reusing the brief's intent and the same concept tags, adapted to what the new medium
  does best — not a port of the code;
- same artifact, small variation: extend the existing Bit instead;
- same artifact, another language: **not a new Bit** — add the locale to the existing one
  (step 10). Never `<id>-en`.

If the request says "based on `<id>`", the brief of `<id>` is the specification; the
implementation of `<id>` is only a reference for colours and conventions.

## 3. Choose kind → template

| you need | template | kind / engine |
|----------|----------|---------------|
| animation, video | `manim` | video / manim |
| explorable, simulation, general UI | `web` | interactive / react (also p5, mafs, three) |
| dynamic geometry, math visualisation | `jsxgraph` | interactive / jsxgraph |
| static diagram | `tikz` | figure / tikz |
| plot from data/code | `tikz` (pgfplots) or `web` template with `engine: python` and `src/main.py` | figure |
| handout, annotated source, reference sheet | `latex` | document / latex |

## 4. Name it

The id is a stable public URL (`/bits/<id>/`). Name the **pedagogical artifact**, not the
technology: `unit-circle-animation` (not `unit-circle-manim`), `projectile-motion-explorer`
(not `projectile-motion-p5`), `hubble-1929-plot`, `alkhwarizmi-completing-square`. Suffixes
that work: `-explorer`, `-simulation`, `-animation`, `-diagram`, `-plot`, `-map`, `-handout`,
`-source`. `check` warns when an id contains an engine name.

## 5. Scaffold (never by hand)

```bash
just new --title "<Titolo in italiano>" --template <template> --id <slug> [--role <role>] [--tags a,b,c]
just new --title "<Title>" --template <template> --locale en            # a Bit authored in English
just new --title "<Titolo>" --template <template> --locales it,en       # planned in two languages
```

Tags: the concept keywords of the relatives plus what is specific to this Bit; slugs,
comma-separated. Language: Italian unless the task says otherwise (`--locale`,
`--locales`; the id stays language-neutral). The command creates `bit.yml` (with
`default_locale` / `locales`), `README.md`, `brief.md`, `narrative.md`, `src/`, `dist/` and
prints the next steps.

## 6. Write the brief

Fill `bits/<id>/brief.md` first: intent, essential relations, required elements (and what is
deliberately left out), didactic progression, misconceptions/pitfalls, related ideas. Short
and concrete, engine-independent, in whichever language serves the work (the reference
briefs are in English; Italian is just as good). One brief per Bit, whatever its locales: it
describes the concept, not a translation. It is the file the next Bit on this concept will
start from — memory for the next author, not a form: keep the headings that help.

## 7. Author

Load the engine skill (`manim-bit`, `web-interactive-bit`, `jsxgraph-bit`, `tikz-bit`,
`latex-bit`) and follow `docs/style/<engine>.md`. Keep everything editable in `src/`.
On-screen text in the Bit's `default_locale` (Italian by default). If the Bit is planned in
several languages, keep the strings in `locales/<tag>.yml` from the start
(docs/localization.md); otherwise inline strings are fine.

## 8. Build and validate

```bash
just build <id> [--quick]      # or: just export <id> for interactive Bits
just check <id>
```

Fix every error; fix warnings that concern your Bit (missing outputs, brief, description,
licence notes, naming, role).

## 9. Metadata, notes, publication

Edit `bits/<id>/bit.yml`: `description` (in the default locale, shown on the public page),
`tags`, `subjects`, `topics`, `levels`, `provenance` (with `license`; mandatory for
third-party/historical material). Original content inherits CC BY-SA 4.0; set `license:`
only if this Bit's own content must differ (docs/licensing.md). `README.md` gets the
technical notes (sources, options, decisions, limitations); `narrative.md` what to say and
ask in class, if you have it.

`status`: `draft` while it is not ready — local only. `usable` once it is built, checked and
works: it is then **published** at `/bits/<id>/` on the next push, together with everything
under its `dist/`. `curated` only when polished; it requires licence notes on all provenance.

## 10. Translating an existing Bit (not a new Bit)

1. Add the tag to `locales` in `bit.yml`; the id, directory and URL do not change.
2. Interactive: add `locales/<tag>.yml` with the same keys as the existing file and make the
   component resolve it from its `locale` prop (`bits/unit-circle-explorer` is the model).
   Generated: add `outputs` entries with `locale` (under `dist/<tag>/`), make the source read
   `ORBBITS_LOCALE` (manim, python) or `\orbLocale` (tikz, latex), `just build <id>`.
3. Translate meaning, not words: adapt examples, names and conventions to the language.
4. Leave `brief.md` alone; note anything non-obvious in `README.md`. `just check <id>`.

## Done when

- `just check <id>` reports 0 errors and no warnings about the Bit;
- the outputs in `dist/` (or the dev page for interactive Bits) show what the brief promises;
- `brief.md` is filled, `README.md` is technical, tags match the relatives;
- no `.build/` or `dist/web/` files are staged.
