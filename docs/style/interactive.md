# Interactive style

Conventions for `kind: interactive` Bits (React, JSXGraph, p5, Mafs, three.js…).
Reference implementation: `bits/unit-circle-explorer`.

## Component boundary

- `src/index.tsx` default-exports one component with no required props.
- The component is the whole Bit: stage + controls + readouts. It never reaches outside
  itself (no page selectors, no globals, no assumptions about a header, a route or the
  site's base path: the same component is served at `/bits/<id>/`, under a prefix such as
  `/orbbits/`, and as a standalone export).
- Third-party libraries own their canvas (JSXGraph board, p5 sketch, three renderer);
  React owns the controls and readouts. Create the library object in `useEffect`, dispose it
  in the cleanup, keep a `ref` to it, and bump a `key`/generation counter to rebuild on reset.

## Internal component structure

The default-exported component can internally decompose into any number of subcomponents, hooks,
and utilities. Organize however makes sense: separate concerns, share state through React
patterns (props, context, custom hooks), reuse internal components freely. Examples:

- Multiple synchronized views (e.g., a geometry board, coordinates, a table, and a plot
  sharing the same mathematical state)
- Layered complexity (e.g., a basic mode and an advanced mode, toggled by the learner)
- Separated concerns (e.g., stage rendering in one module, control logic in another)

This is all implementation detail. The caller (runtime, Orbit, export) does not configure
which views are visible or how they are organized; they receive the whole Bit. The brief.md
specifies what the learner *should see* (essential relations, required elements); the
component tree is how you make that happen. For Bits where the internal structure is important
for understanding the pedagogical intent, describe it in `README.md` so the next author or agent
can grasp the design without decoding the React.

## Layout and responsiveness

- Fill the container width (`width: 100%`), keep an aspect ratio (`aspect-ratio`), cap with a
  `max-width` that suits the content (≈ 34–48 rem). Never fix pixel sizes.
- Everything must work on a projector (large), a laptop and a phone (stacked controls).
- Styles are scoped under a class named after the Bit id (`.unit-circle-explorer …`).
  Use plain CSS in `src/styles.css`; no global resets.

## Interaction

- Pointer *and* touch (`touch-action: none` on the stage; libraries generally handle both).
- Controls are real form elements with labels: `<label>` + `<input type="range">`, `<button>`,
  `<select>`; `<output>` for the value next to a slider; `aria-label` where the label is a symbol.
- Always a **Reset** to the initial state.
- Disable pan/zoom on dynamic-geometry boards unless they are the point.
- Keep a readout of the quantities the lesson is about, with tabular numerals, sensible
  decimals, and units.

## Visual validation and browser-driven iteration

For interactive Bits, automated tests validate functionality, but visual/pedagogical correctness requires
actual browser inspection and user interaction. These principles emerged from developing multi-representation
learning tools like `unit-circle-explorer`:

### Browser rendering is the acceptance criterion

Do not claim that text is readable, elements are aligned, or behavior is responsive based solely on
source code, CSS specifications, or build success. Visible correctness requires:

```
implement → build → open in browser → interact → screenshot → refine
```

This is not decoration; the actual rendered artifact is what learners see.

### Verify the complete runtime path before debugging

When visual discrepancies appear, confirm the chain:

```
source → dev-server compilation → built artifact → browser route
```

Stale cache, mismatched branches, or broken compilation can make the source code invisible to actual
rendered output. Check:

- dev-server is serving the current working directory
- no stale/cached artifacts
- actual browser URL matches expected route
- locale files are being compiled/served

### Mathematical coordinates differ from SVG/CSS coordinates

Custom plots need explicit coordinate transformations. Define the mathematical plot region and scale
functions **from mathematical values** (e.g., x = 0, y = 0), not inferred from SVG/container boundaries:

```javascript
const scaleX = (mathValue) => margin.left + (mathValue / domainMax) * plotWidth;
const scaleY = (mathValue) => margin.top + plotHeight - ((mathValue + 1) / 2) * plotHeight;
```

Position axes at their mathematical locations (e.g., y-axis at x = 0, x-axis at y = 0), not at edges.
This ensures the coordinate system is visually unmistakable.

### Simultaneous representation visibility may be a functional requirement

When pedagogical purpose is to compare multiple views of one state, simultaneous viewport visibility
is not merely nice-to-have; it is part of the learning design. If learners must scroll between a
circle and a graph to see synchronization, the pedagogical intent is lost. Optimize layout to fit
all essential representations without scrolling at typical desktop/laptop viewports.

### Design for coherent workspaces, not widget dashboards

Multiple mathematical representations should form one interactive *space* with clear hierarchy and
alignment, not a collection of isolated components. Use:

- Alignment (circle + table on one axis, graphs below)
- Whitespace (reduce gaps; remove redundant headings/labels)
- Visual hierarchy (primary mathematical elements vs. secondary guides)

Each additional card, heading, or container adds cognitive load.

### Localization must be validated in the rendered UI

Do not assume that locale YAML files guarantee visible localization. Search the source code for
hard-coded learner-facing strings (labels, headings, messages) and visually inspect them in the
actual browser at each locale. String extraction during build does not guarantee correct replacement
at runtime.

### Dynamic values should not destabilize the layout

When numerical values change during interaction (e.g., a radian value with variable numerator/denominator
width), reserved space and tabular numerals prevent the interface from jumping. This is especially
important for sections that update at interaction speed (e.g., current-angle displays, value tables).

### Sampling strategies depend on pedagogical purpose

A continuous graph and a numerical table may represent the same mathematical function but serve
different pedagogical roles:

- **Graph**: continuous mathematical object; current point highlighted; shows overall shape.
- **Table**: sparse, curated sampling of significant values; current value highlighted for reference.

Choose which values appear in each representation according to learning goals, not convenience.

### Contrast and label placement are not afterthoughts

Graph axes, tick marks, and labels are part of the mathematical language. Ensure:

- Axes are visually stronger than grid lines and curves
- Labels are positioned at mathematical locations (axis labels near the axis, tick labels related to ticks)
- Contrast is sufficient for the display context
- Collision-free placement at domain boundaries and singularities (e.g., 0°, 180°, 360° on a circle)

## Mathematical notation

Unicode for simple symbols (θ, π, ≤); for real typesetting add KaTeX at the root
(`pnpm add katex`) and render into the component — not yet a repository convention.

## Performance

- One lazily loaded chunk per Bit is automatic; keep dependencies light.
- Throttle expensive redraws (JSXGraph `resize.throttle`, `requestAnimationFrame` for p5).
- No network requests at runtime; data ships in `src/`.

## Language

Everything the learner reads on screen — labels, buttons, readouts, hints — is in the Bit's
`default_locale` (Italian unless the Bit says otherwise); identifiers and comments are
English. A Bit meant to exist in several languages keeps those strings in
`locales/<tag>.yml`, accepts an optional `locale` prop and resolves the strings itself
(docs/localization.md; reference `bits/unit-circle-explorer`). A single-language Bit may keep
them inline.

## Preview, export, publication

```bash
just dev <id>       # http://localhost:4321/bits/<id>/
just export <id>    # bits/<id>/dist/web/ — standalone static site
```

The public page `/bits/<id>/` (status usable/curated), the export and, later, Orbits all
mount the component through the same `BitHost`. If it works standalone without touching
the page, it will embed.
