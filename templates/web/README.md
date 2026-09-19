# __BIT_TITLE__

<!-- Technical notes for maintainers and agents. The pedagogical intent lives in brief.md,
     classroom prose in narrative.md; do not repeat them here. -->

- Kind: interactive · Engine: React · Public page: `/bits/__BIT_ID__/` (once `status` is usable)
- Source: `src/index.tsx` (default export = the whole interactive), `src/styles.css`
- Standalone export: `just export __BIT_ID__` → `dist/web/` (rebuildable, not versioned)

## Workflow

```bash
just dev __BIT_ID__      # live preview at /bits/__BIT_ID__/
just web-check           # TypeScript diagnostics
just check __BIT_ID__
just export __BIT_ID__   # dist/web/index.html + assets
```

## Implementation notes

<!-- State model, libraries (added with `pnpm add` at the repository root), rendering approach. -->

## Limitations / open issues
