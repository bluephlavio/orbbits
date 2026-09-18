---
name: create-bit
description: Create a new OrbBits Bit end to end — choose the template, scaffold with the CLI, author, build, validate, and fill in metadata. Use for any "create/add a new Bit" request before loading an engine-specific skill.
---

# Create a Bit

## 1. Decide whether it is a Bit

A Bit deserves its own directory when it has a meaningful, preservable production pipeline
and will be reused: an animation, an interactive, a generated figure, a typeset handout.
A one-off image or formula is a Block for a future Orbit, not a Bit.

## 2. Choose kind → template

| you need | template | kind / engine |
|----------|----------|---------------|
| animation, video | `manim` | video / manim |
| explorable, simulation, general UI | `web` | interactive / react (also p5, mafs, three) |
| dynamic geometry, math visualisation | `jsxgraph` | interactive / jsxgraph |
| static diagram | `tikz` | figure / tikz |
| plot from data/code | `tikz` (pgfplots) or `web` template with `engine: python` and `src/main.py` | figure |
| handout, annotated source, reference sheet | `latex` | document / latex |

## 3. Scaffold (never by hand)

```bash
just list                                          # avoid duplicates
just new --title "<Title>" --template <template> [--id <slug>] [--role <role>]
```

The slug defaults to the slugified title; choose a stable semantic id. The command prints
the next steps for the chosen template.

## 4. Author

Load the engine skill (`manim-bit`, `web-interactive-bit`, `jsxgraph-bit`, `tikz-bit`,
`latex-bit`) and follow `docs/style/<engine>.md`. Keep everything editable in `src/`.

## 5. Build and validate

```bash
just build <id> [--quick]      # or: just export <id> for interactive Bits
just check <id>
```

Fix every error; fix warnings that concern your Bit (missing outputs, README, role).

## 6. Metadata and notes

Edit `bits/<id>/bit.yml`: `description`, `subjects`, `topics`, `levels`, `tags`, `provenance`
(mandatory for third-party/historical material), and `status` (`draft` → `usable` once it has
been built and works; `curated` only when polished for publication). Write the intent and
classroom use in `bits/<id>/README.md`.

## Done when

- `just check <id>` reports 0 errors;
- the outputs in `dist/` (or the dev page for interactive Bits) show what the README promises;
- no `.build/` or `dist/web/` files are staged.
