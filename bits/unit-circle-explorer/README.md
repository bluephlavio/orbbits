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

- **SymbolicBox** (`src/components/SymbolicBox.tsx`)
  - Displays P = (x_P, y_P) with current values (primary)
  - Shows symbolic naming: x_P = cos α, y_P = sin α (secondary)
  - Angle in degrees and π notation

- **ObservationTable** (`src/components/ObservationTable.tsx`)
  - Accumulates observations of (α, x_P, y_P) pairs
  - Notable angles (0°, 30°, 45°, 60°, 90°, etc.) recorded automatically
  - Manual "Record" button for deliberate observations
  - Latest row highlighted; clicking a row jumps to that angle
  - Max 10 visible rows; older ones scroll away

- **FunctionGraphs** (`src/components/FunctionGraphs.tsx`)
  - Two Cartesian plots (sin α and cos α) stacked vertically
  - Shared α-axis (0–360° on x-axis, −1 to +1 on y-axis)
  - Points traced progressively as learner moves P
  - Current point highlighted on both graphs
  - Faint reference curves show the complete functions
  - Vertical guide at current α crosses both plots

- **ControlPanel** (`src/components/ControlPanel.tsx`)
  - Angle slider (0–360°) with live numeric display
  - Reset button to return to 40°
  - Compact, secondary to the geometric view

### State Management

```typescript
angleDeg                  // single source of truth (0–360)
observations             // array of {angle, xP, yP, isNotable}
graphPoints              // {sin: [[α, sin α], ...], cos: [[α, cos α], ...]}
lastGraphAngle           // track when to add new graph points (5° threshold)
```

Graph points update frequently to trace curves smoothly. Table observations are sampled more
sparsely:
- Always record notable angles
- Record when learner pauses (implicit) or clicks "Record" (explicit)
- Up to 10 observations visible

### Responsive Layout

- **Desktop (≥900px):** Three-column grid: circle (left) | symbolic + table (center) | graphs (right)
- **Tablet/Mobile (<900px):** Full-width stacked layout
- All elements readable without horizontal scroll

### Colors and Styling

- Circle: `#1f5fbf` (blue)
- Point P: `#e0a100` (gold)
- cos (projections, table values, graph): `#d1495b` (red) — consistent with `angle-as-rotation`
- sin (projections, table values, graph): `#2a9d8f` (teal) — consistent with `angle-as-rotation`
- Muted elements: `#7a7a7a`

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
