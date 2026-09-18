# Unit circle explorer

Drag *P* around the unit circle (or use the slider) and read the angle θ, cos θ and sin θ.
The horizontal and vertical projections are highlighted so that sine and cosine appear as
*coordinates of a rotating point*, which is how the later Manim Bit
(`angle-as-rotation`) tells the same story.

- Kind: interactive · Engine: JSXGraph (React wrapper)
- Source: `src/index.tsx`, `src/styles.css`
- Standalone page: `/bits/unit-circle-explorer` in the web runtime

## Workflow

```bash
just dev unit-circle-explorer      # live preview
just check unit-circle-explorer
just export unit-circle-explorer   # dist/web/ standalone site (not versioned)
```

## Notes

Reference implementation for the interactive-Bit contract: default-exported component,
no dependence on page layout, responsive board, accessible slider + reset, readout kept in
sync through the board's `update` event.
