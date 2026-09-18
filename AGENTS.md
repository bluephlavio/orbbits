# Guidance for AI agents working in OrbBits

OrbBits is a **personal, local-first repository of reusable educational artifacts (Bits)**.
Not a platform, not multi-user, not TexBits. Optimise for low friction and inspectable results.

## Language policy

- Italian: authored classroom content (on-screen text, handouts, labels) unless the Bit says otherwise.
- English: code, paths, identifiers, comments, commit messages, docs.

## Before creating a Bit

1. Scaffold with the CLI, never by hand:
   `just new --title "<title>" --template <manim|web|jsxgraph|tikz|latex> [--id <slug>] [--role <role>]`
2. Read `docs/bit-spec.md` (manifest contract) and load the skill for the engine
   (`.agents/skills/<engine>-bit/SKILL.md`; `create-bit` for the overall flow).
3. Check `just list` first: a Bit with the same purpose may exist. Ids are stable semantic
   slugs (`roemer-io-eclipses`), never numbered.

## Rules of the house

- Editable material in `src/`; classroom/publishable outputs in `dist/`; scratch in `.build/`.
- `bit.yml` is the source of truth: keep `kind` / `role` / `engine` / `status` honest,
  declare `outputs`, record `provenance` for any third-party or historical material.
- Do not organise Bits by subject/topic/level on disk; that is metadata.
- Not every asset is a Bit: a one-off image or formula belongs in a future Orbit as a Block.
- Interactive Bits are self-contained React components (`src/index.tsx`, default export,
  no dependence on page layout). Video/figure/document Bits produce files under `dist/`.
- Follow the style guides in `docs/style/`; do not add configuration layers to make them optional.
- Keep the tooling small: no plugin systems, no databases, no generic frameworks.

## Before finishing

- `just build <id>` (or `just export <id>` for interactive Bits) and make sure it succeeds.
- `just check <id>` → 0 errors; fix warnings that are about your Bit.
- Update the Bit's `README.md` and `bit.yml` (`status`, `description`, taxonomy, provenance).
- For changes to the tooling: `just test` and `just web-check`.
- Leave every editable source in the repository; never commit `.build/` or `dist/web/`.

## Where things are

| Need | Look at |
|------|---------|
| Concepts, layout, decisions | `docs/architecture.md` |
| Manifest fields | `docs/bit-spec.md` |
| Commands and options | `docs/authoring.md`, `justfile`, `uv run orbbits --help` |
| Web runtime and export | `docs/web-runtime.md` |
| Provenance | `docs/provenance.md` |
| Engine conventions | `docs/style/*.md` and `.agents/skills/*/SKILL.md` |
| Reference Bits | `bits/unit-circle-explorer` (jsxgraph), `bits/alkhwarizmi-completing-square` (tikz), `bits/angle-as-rotation` (manim) |
