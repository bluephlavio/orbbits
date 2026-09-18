---
name: jsxgraph-bit
description: Author a dynamic-geometry / interactive-mathematics Bit with JSXGraph inside the OrbBits React wrapper — board setup, construction, React↔board sync, reset, responsiveness, export.
---

# JSXGraph Bit

Reference: `bits/unit-circle-explorer`. General rules: `web-interactive-bit` skill and
`docs/style/interactive.md`. Template: `templates/jsxgraph`.

## Pattern

```tsx
import JXG from 'jsxgraph';
import 'jsxgraph/distrib/jsxgraph.css';   // aliased in web/astro.config.mjs
// container id from useId() (strip ':'), board created in useEffect, freed in cleanup
const board = JXG.JSXGraph.initBoard(containerId, {
  boundingbox: [-5, 5, 5, -5], axis: true, keepaspectratio: true,
  showCopyright: false, showNavigation: false,
  pan: { enabled: false }, zoom: { wheel: false, pinchHorizontal: false, pinchVertical: false },
  resize: { enabled: true, throttle: 100 },
});
```

- Put the whole construction in a `build(board, …)` function; return the elements React needs.
- React → board: `point.moveTo([x, y]); board.update()`.
- Board → React: `board.on('update', () => setState(read from elements))`.
- Reset: bump a generation counter in the effect's dependencies (rebuilds the board), or
  `moveTo` the initial positions.
- Container: `<div id={containerId} className="board jxgbox" />` with CSS `width: 100%;
  aspect-ratio: 1 / 1; touch-action: none`.
- JSXGraph lower-cases attribute names internally, so the camelCase names from the bundled
  typings (`defaultAxes`, `keepAspectRatio`) are fine; the typings lag the runtime — prefer
  option names that type-check (`just web-check`). Fixed tick spacing needs
  `ticks: { insertTicks: false, ticksDistance: … }`.

## Construction conventions

- Colours: primary `#1f5fbf`, active point `#e0a100`, paired quantities `#d1495b` / `#2a9d8f`,
  construction `#7a7a7a` dashed.
- Draggable things are `glider`s or free points with `size: 4–5`; everything else `fixed: true`.
- Labels via `text` elements with function coordinates; keep them off the axes.
- Live values as function texts on the board **and/or** a React readout (`<dl>`), tabular numerals.
- Disable pan/zoom unless they are the point of the Bit.

## Workflow

```bash
just dev <id>      # live preview
just web-check     # types
just export <id>   # standalone site in dist/web/
just check <id>
```
