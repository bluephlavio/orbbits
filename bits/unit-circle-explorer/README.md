# Esplora la circonferenza goniometrica

Technical notes. Pedagogical intent: `brief.md`; classroom prose: `narrative.md`.

- Kind: interactive · Engine: JSXGraph (React wrapper) · Public page: `/bits/unit-circle-explorer/`
- Source: `src/index.tsx` (main component) + `src/components/` (subcomponents), `src/styles.css`
- Locales: `it` (default), `en` — strings in `locales/it.yml` / `locales/en.yml`
- Standalone export: `just export unit-circle-explorer` → `dist/web/` (rebuildable, not versioned)

## Workflow

```bash
just dev unit-circle-explorer      # live preview at /bits/unit-circle-explorer/
just web-check                     # TypeScript diagnostics
just check unit-circle-explorer
just export unit-circle-explorer   # dist/web/index.html + assets
```

## Architecture: Multi-Representation Synchronization

One authoritative source of truth: the angle **α** (in degrees, 0–360). All views update
synchronously when α changes, whether through dragging P, moving the slider, or clicking a
table row.

### Component Structure (Private Implementation)

The main component (`src/index.tsx`) manages state and coordinates updates. Internal
subcomponents handle each representation:

- **GeometricBoard** (`src/components/GeometricBoard.tsx`)
  - JSXGraph circle, draggable point P, angle mark, projections
  - Synchronizes back to React via `board.on('update', …)`
  - Exposes `moveTo(angle)` method for slider and table interaction
  - Board config: bounding box `[-1.5, 1.5, 1.5, -1.5]`, fixed ticks at 0.5, pan/zoom disabled

- **ObservationTable** (`src/components/ObservationTable.tsx`)
  - Canonical angles (0°, 30°, 45°, … 330°) with cos/sin to three decimals
  - Compact angle display: degrees, exact radians (π fractions) and decimal radians
  - A 7-row window slides around the current angle; the current row is highlighted
  - Clicking / Enter on a row jumps to that angle

- **FunctionGraphs** (`src/components/FunctionGraphs.tsx`)
  - Two Cartesian plots (cos α and sin α) stacked vertically
  - Shared α-axis (0–360° on x-axis, −1 to +1 on y-axis)
  - Light reference curves of the complete functions, current point highlighted
  - Vertical guide at current α crosses both plots

- **ControlPanel** (`src/components/ControlPanel.tsx`)
  - Angle slider (0–360°) with live numeric display
  - Reset button to return to 40°
  - Compact, secondary to the geometric view

(`src/components/SymbolicBox.tsx` is a leftover from an earlier layout and is currently
not mounted by `index.tsx`.)

### State Management

```typescript
angleDeg                  // single source of truth (0–360)
cosVal, sinVal            // derived per render from angleDeg
```

All views are pure functions of `angleDeg`; the only writers are the board's update
event (dragging P), the slider and the table rows, all funnelled through
`handleAngleChange`.

### Responsive Layout

- **Desktop (>1000px):** board + table in a two-column grid, graphs full width below,
  controls at the bottom
- **Tablet/Mobile (≤1000px):** full-width stacked layout
- All elements readable without horizontal scroll

### Colors and Styling

- Circle: `#1f5fbf` (blue)
- Point P: `#e0a100` (gold)
- cos (projections, table values, graph): `#d1495b` (red) — consistent with `trigonometric-functions`
- sin (projections, table values, graph): `#2a9d8f` (teal) — consistent with `trigonometric-functions`
- Muted elements: `#7a7a7a`
- The component paints its own light surface (`.unit-circle-explorer` has
  `background`, `color` and `color-scheme: light`): it stays legible when the host page
  follows a dark theme.

### Localization

Strings in `locales/it.yml` and `locales/en.yml`. Main component accepts `locale` prop from
runtime. All learner-facing strings resolved through `MESSAGES` lookup, with fallback to Italian.

## Key Implementation Decisions

1. **No background reference curves initially** — curves emerge through discovery. Faint curves
   added after enough exploration to guide without spoiling.

2. **Sampling distinction:** Graph points traced frequently (~5° intervals) to show smooth curve
   emergence. Table observations sampled only at pedagogically meaningful moments (notable angles,
   deliberate recording).

3. **Synchronization through refs:** Slider and table interaction use `geometricBoardRef.moveTo()`
   to update P on the board, which then fires `board.on('update')` to sync state back to React.

4. **No caller-facing configuration:** All representations visible simultaneously. Learner's
   interaction (drag P) drives exploration; no toggles, no modes.

5. **Accessibility:** Slider has aria-label, table rows are keyboard-navigable, all text
   localized, sufficient color contrast maintained.

## Testing and Iteration Notes

The implementation prioritizes clarity of pedagogical flow. Improvements to consider:

- Fine-tune sampling thresholds based on classroom observation
- Refine the visual hierarchy if one representation dominates inappropriately
- Gather feedback on whether faint reference curves help or confuse
- Test on a projector to ensure readability at classroom distance
