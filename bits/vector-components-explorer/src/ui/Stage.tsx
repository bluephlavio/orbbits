/**
 * The diagram: the plane, the arrow and the optional layers, with direct manipulation.
 *
 *   tail handle → moves A only        tip handle → moves B only
 *   body        → translates the arrow (v⃗ unchanged)
 *
 * Pointer positions snap to the unit grid (to tenths with Shift or Alt); the arrow keys move a
 * focused handle by 1 (by 0.1 with Shift). The scale never follows the drag: points are kept
 * inside the visible part of the plane instead.
 *
 * Drawing order, bottom to top: plane, projections, versors, components, v⃗, handles. Labels
 * are HTML over the SVG, placed by labels.ts around everything drawn.
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent, ReactNode } from 'react';
import { componentSegments, componentsOf, projections, translateTo } from '../model/arrow.ts';
import type { ArrowState, Construction } from '../model/arrow.ts';
import { clamp, isZero, snap, sub, vec } from '../model/vec.ts';
import type { Vec } from '../model/vec.ts';
import Arrow from './Arrow.tsx';
import { arrowShape, stackTracks } from './arrow.ts';
import { MASK, tex } from './format.ts';
import { SYM } from './formulas.ts';
import type { Key } from './formulas.ts';
import Label from './Label.tsx';
import { aroundPoint, besideSegment, occupied, placeLabels } from './labels.ts';
import type { LabelRequest, Obstacle, Rect } from './labels.ts';
import Plane from './Plane.tsx';
import { planeData } from './plane.ts';
import { rulers, rulerSizes } from './rulers.ts';
import { useSize } from './useSize.ts';
import { centeredView, toMath, toPx, visibleBox } from './view.ts';
import type { View } from './view.ts';

export interface Layers {
  versors: boolean;
  components: boolean;
  scalars: boolean;
  projections: boolean;
  coordinates: boolean;
}

type Handle = 'A' | 'B' | 'body';

/** Font size of each kind of label relative to --label (keep in step with styles.css). */
const LABEL_SCALE: Record<string, number> = {
  'lab-v': 1.12,
  'lab-point': 0.82,
  'lab-foot': 0.78,
  'lab-axis': 0.82,
};

interface Drag {
  handle: Handle;
  start: Vec;
  from: ArrowState;
}

const HANDLE_NAMES: Record<Handle, string> = {
  A: 'Coda A del vettore',
  B: 'Punta B del vettore',
  body: 'Vettore: trascina per traslarlo',
};

/** Limits for points: the visible plane, less a margin, on the grid of `step`. */
function limits(view: View, step: number) {
  const box = visibleBox(view);
  const m = 0.3;
  return {
    xmin: Math.ceil((box.xmin + m) / step) * step,
    xmax: Math.floor((box.xmax - m) / step) * step,
    ymin: Math.ceil((box.ymin + m) / step) * step,
    ymax: Math.floor((box.ymax - m) / step) * step,
  };
}

const keep = (p: Vec, lim: ReturnType<typeof limits>) =>
  vec(clamp(p.x, lim.xmin, lim.xmax), clamp(p.y, lim.ymin, lim.ymax));

/** Where a drag (or a key press) takes the arrow. */
function moved(handle: Handle, from: ArrowState, delta: Vec, step: number, view: View): ArrowState {
  const lim = limits(view, step);
  const at = (p: Vec) => keep(vec(snap(p.x + delta.x, step), snap(p.y + delta.y, step)), lim);
  if (handle === 'A') return { A: at(from.A), B: from.B };
  if (handle === 'B') return { A: from.A, B: at(from.B) };
  // Translation: the whole arrow stays visible, so the shift is limited by both ends.
  const v = componentsOf(from);
  const tail = vec(snap(from.A.x + delta.x, step), snap(from.A.y + delta.y, step));
  const A = vec(
    clamp(tail.x, Math.max(lim.xmin, lim.xmin - v.x), Math.min(lim.xmax, lim.xmax - v.x)),
    clamp(tail.y, Math.max(lim.ymin, lim.ymin - v.y), Math.min(lim.ymax, lim.ymax - v.y)),
  );
  return translateTo(from, A);
}

export default function Stage({
  state,
  onChange,
  layers,
  construction,
  focus,
  onHover,
  half,
  masked,
  children,
}: {
  state: ArrowState;
  onChange: (next: ArrowState) => void;
  layers: Layers;
  construction: Construction;
  focus: ReadonlySet<Key>;
  onHover: (keys: Key[] | null) => void;
  /** Units from the origin to the nearer edge: the zoom. */
  half: number;
  /** Computed values are hidden (the rulers' numbers). */
  masked: boolean;
  children?: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const outer = useSize(box);
  const fontPx = clamp(Math.min(outer.width, outer.height) * 0.04, 16, 30);
  // With the scalar rulers on, the plane gives up a strip below and one at the right.
  const margin = layers.scalars ? rulerSizes(fontPx) : { below: 0, beside: 0 };
  const width = Math.max(0, outer.width - margin.beside);
  const height = Math.max(0, outer.height - margin.below);
  const view = useMemo(() => centeredView(width, height, half, 14), [width, height, half]);
  const drag = useRef<Drag | null>(null);
  const [active, setActive] = useState<Handle | null>(null);

  // Controls floating over the stage (children marked data-reserve) are kept free of labels.
  const [reserved, setReserved] = useState<Rect[]>([]);
  useLayoutEffect(() => {
    const element = box.current;
    if (!element) return;
    const base = element.getBoundingClientRect();
    const rects = [...element.querySelectorAll('[data-reserve]')].map((n) => {
      const r = n.getBoundingClientRect();
      return {
        cx: Math.round(r.left - base.left + r.width / 2),
        cy: Math.round(r.top - base.top + r.height / 2),
        w: Math.round(r.width + 10),
        h: Math.round(r.height + 10),
      };
    });
    setReserved((prev) => (JSON.stringify(prev) === JSON.stringify(rects) ? prev : rects));
  });

  const pointer = (e: PointerEvent): Vec => {
    const r = svg.current!.getBoundingClientRect();
    return toMath(view, { x: e.clientX - r.left, y: e.clientY - r.top });
  };

  const down = (handle: Handle) => (e: PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag.current = { handle, start: pointer(e), from: state };
    setActive(handle);
  };
  const move = (e: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const step = e.shiftKey || e.altKey ? 0.1 : 1;
    const delta = sub(pointer(e), d.start);
    const next = moved(d.handle, d.from, delta, step, view);
    if (next.A.x !== state.A.x || next.A.y !== state.A.y || next.B.x !== state.B.x || next.B.y !== state.B.y) {
      onChange(next);
    }
  };
  const up = () => {
    drag.current = null;
    setActive(null);
  };
  const key = (handle: Handle) => (e: KeyboardEvent) => {
    const step = e.shiftKey ? 0.1 : 1;
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[
      e.key
    ];
    if (!d) return;
    e.preventDefault();
    onChange(moved(handle, state, vec(d[0] * step, d[1] * step), Math.min(step, 1), view));
  };

  const scene = useMemo(() => {
    if (width === 0) return null;
    const P = (p: Vec) => toPx(view, p);
    const v = componentsOf(state);
    const em = fontPx;
    const base = clamp(em * 0.14, 2.4, 4);
    const w = { v: base * 1.25, c: base, h: base * 1.1 };
    const shown = {
      versors: layers.versors || focus.has('xh') || focus.has('yh'),
      components: layers.components || focus.has('vx') || focus.has('vy'),
      projections: layers.projections || focus.has('px') || focus.has('py'),
    };
    const preview = {
      versors: !layers.versors,
      components: !layers.components,
      projections: !layers.projections,
    };
    const a = P(state.A);
    const b = P(state.B);
    const o = P({ x: 0, y: 0 });
    const comp = componentSegments(state, construction);
    const tracks = stackTracks([
      { key: 'v', seg: [a, b], width: w.v },
      ...(shown.versors
        ? [
            { key: 'xh', seg: [o, P({ x: 1, y: 0 })] as const, width: w.h },
            { key: 'yh', seg: [o, P({ x: 0, y: 1 })] as const, width: w.h },
          ]
        : []),
      ...(shown.components
        ? [
            { key: 'vx', seg: [P(comp.x[0]), P(comp.x[1])] as const, width: w.c },
            { key: 'vy', seg: [P(comp.y[0]), P(comp.y[1])] as const, width: w.c },
          ]
        : []),
    ]);
    const proj = projections(state);
    const plane = planeData(view, em * 0.66);

    // Obstacles: what labels must not cover.
    const obstacles: Obstacle[] = [];
    for (const [k, seg] of tracks) {
      const width = k === 'v' ? w.v : k === 'vx' || k === 'vy' ? w.c : w.h;
      const shape = arrowShape(seg[0], seg[1], width);
      if (shape.point) continue;
      obstacles.push({ kind: 'segment', a: seg[0], b: seg[1], r: width / 2 + 3, weight: 3 });
      obstacles.push({ kind: 'point', p: seg[1], r: width * 2.2 + 4, weight: 3 });
    }
    obstacles.push({ kind: 'point', p: a, r: 8, weight: 3 }, { kind: 'point', p: b, r: 8, weight: 3 });
    obstacles.push(
      { kind: 'segment', a: { x: 0, y: o.y }, b: { x: width, y: o.y }, r: 2, weight: 0.3 },
      { kind: 'segment', a: { x: o.x, y: 0 }, b: { x: o.x, y: height }, r: 2, weight: 0.3 },
    );
    if (shown.projections) {
      for (const [p, q] of [
        [a, P(proj.x[0])],
        [b, P(proj.x[1])],
        [a, P(proj.y[0])],
        [b, P(proj.y[1])],
      ]) {
        obstacles.push({ kind: 'segment', a: p, b: q, r: 2, weight: 0.35 });
      }
    }
    for (const t of plane.ticks) obstacles.push({ kind: 'rect', rect: t.rect, weight: 0.15 });
    for (const rect of reserved) obstacles.push({ kind: 'rect', rect, weight: 50 });

    const requests: LabelRequest[] = [];
    const labels: Record<string, { tex: string; className: string; key?: Key; layer?: keyof typeof preview }> = {};
    const gap = em * 0.3;
    /** Registers a label: size in em, candidate centres from its pixel size. */
    const label = (
      id: string,
      t: string,
      opt: {
        className: string;
        size: [number, number];
        at: (w: number, h: number) => Vec[];
        priority: number;
        key?: Key;
        layer?: keyof typeof preview;
        optional?: boolean;
      },
    ) => {
      const k = LABEL_SCALE[opt.className] ?? 1;
      const lw = opt.size[0] * em * k;
      const lh = opt.size[1] * em * k;
      requests.push({ id, w: lw, h: lh, candidates: opt.at(lw, lh), priority: opt.priority, optional: opt.optional });
      labels[id] = { tex: t, className: opt.className, key: opt.key, layer: opt.layer };
    };

    // Axis names, anchored to the ends of the axes.
    label('ax', 'x', {
      className: 'lab-axis',
      size: [0.9, 1.2],
      priority: -3,
      at: (lw, lh) => [
        { x: width - lw / 2 - 4, y: o.y - lh / 2 - 8 },
        { x: width - lw / 2 - 4, y: o.y + lh / 2 + 8 },
      ],
    });
    label('ay', 'y', {
      className: 'lab-axis',
      size: [0.9, 1.2],
      priority: -3,
      // Beside the top of the y-axis; lower down when the floating tools are there.
      at: (lw, lh) =>
        [lh / 2 + 2, lh * 1.8, lh * 3, lh * 4.2].flatMap((y) => [
          { x: o.x + lw / 2 + 10, y },
          { x: o.x - lw / 2 - 10, y },
        ]),
    });

    const zero = isZero(v);
    const u = zero ? { x: 1, y: 0 } : { x: b.x - a.x, y: b.y - a.y };
    const vTrack = tracks.get('v')!;
    label('v', '\\vec v', {
      className: 'lab-v',
      size: [1.05, 1.45],
      priority: 0,
      key: 'v',
      at: (lw, lh) =>
        zero
          ? aroundPoint(a, lw, lh, gap * 2.5, { x: 1, y: -1 })
          : [
              ...besideSegment(vTrack[0], vTrack[1], lw, lh, gap),
              ...aroundPoint(b, lw, lh, gap * 2, u),
            ],
    });

    const digits = (n: number) => tex(n).replace(/[{}]/g, '').length;
    const point = (name: 'A' | 'B', prefer: Vec, priority: number) => {
      const p = state[name];
      const coords = layers.coordinates;
      label(name, coords ? `${name}(${tex(p.x)};\\,${tex(p.y)})` : name, {
        className: 'lab-point',
        size: [coords ? 1.7 + 0.52 * (digits(p.x) + digits(p.y)) : 0.95, 1.3],
        priority,
        key: name,
        at: (lw, lh) => aroundPoint(name === 'A' ? a : b, lw, lh, gap * 1.6, prefer),
      });
    };
    point('B', zero ? { x: 1, y: -1 } : u, 1);
    point('A', zero ? { x: -1, y: 1 } : { x: -u.x, y: -u.y }, 2);

    // Component labels go on the outer side of the triangle (or of the rectangle).
    const awayFrom = (seg: readonly [Vec, Vec], other: Vec): 1 | -1 => {
      const n = { x: seg[1].y - seg[0].y, y: -(seg[1].x - seg[0].x) };
      return n.x * (other.x - seg[0].x) + n.y * (other.y - seg[0].y) > 0 ? -1 : 1;
    };
    if (shown.components) {
      const sx = tracks.get('vx')!;
      const sy = tracks.get('vy')!;
      const others = {
        vx: construction === 'tip-to-tail' ? b : sy[1],
        vy: construction === 'tip-to-tail' ? a : sx[1],
      };
      (['vx', 'vy'] as const).forEach((k, i) => {
        const seg = k === 'vx' ? sx : sy;
        if (Math.abs(k === 'vx' ? v.x : v.y) < 1e-9) return;
        label(k, k === 'vx' ? '\\vec v_x' : '\\vec v_y', {
          className: k === 'vx' ? 'lab-x' : 'lab-y',
          size: [1.45, 1.5],
          priority: 3 + i,
          key: k,
          layer: 'components',
          at: (lw, lh) => [
            ...besideSegment(seg[0], seg[1], lw, lh, gap, { side: awayFrom(seg, others[k]) }),
            ...aroundPoint(seg[1], lw, lh, gap * 2),
          ],
        });
      });
    }
    if (shown.versors) {
      (['xh', 'yh'] as const).forEach((k, i) => {
        const seg = tracks.get(k)!;
        label(k, k === 'xh' ? '\\hat x' : '\\hat y', {
          className: `lab-${k}`,
          size: [0.85, 1.35],
          priority: 5 + i,
          key: k,
          layer: 'versors',
          // Below the x-axis, left of the y-axis: the side away from the first quadrant.
          at: (lw, lh) => [
            ...besideSegment(seg[0], seg[1], lw, lh, gap, { ts: [0.5, 0.35, 0.65], side: k === 'xh' ? -1 : 1 }),
            ...aroundPoint(seg[1], lw, lh, gap * 1.5, { x: seg[1].x - seg[0].x, y: seg[1].y - seg[0].y }),
            ...aroundPoint(seg[0], lw, lh, gap * 1.5, { x: -1, y: 1 }),
          ],
        });
      });
    }
    if (shown.projections) {
      (['x', 'y'] as const).forEach((axis, ai) => {
        const [fa, fb] = proj[axis];
        const same = Math.abs(axis === 'x' ? fa.x - fb.x : fa.y - fb.y) < 1e-9;
        const items: [string, Vec][] = same
          ? [[`${axis}_A = ${axis}_B`, fa]]
          : [
              [`${axis}_A`, fa],
              [`${axis}_B`, fb],
            ];
        items.forEach(([t, f], i) => {
          const p = P(f);
          label(`foot-${axis}${i}`, t, {
            className: 'lab-foot',
            size: [same ? 3.4 : 1.3, 1.3],
            priority: 7 + ai + i * 0.1,
            key: axis === 'x' ? 'px' : 'py',
            layer: 'projections',
            optional: true,
            at: (lw, lh) => {
              if (axis === 'x') {
                const below = p.y + 6 + lh / 2;
                const above = p.y - 6 - lh / 2;
                return [below, above].flatMap((y) => [0, 0.6, -0.6].map((s) => ({ x: p.x + s * lw, y })));
              }
              const left = p.x - 7 - lw / 2;
              const right = p.x + 7 + lw / 2;
              return [left, right].flatMap((x) => [0, -0.65, 0.65].map((s) => ({ x, y: p.y + s * lh })));
            },
          });
        });
      });
    }
    label('O', 'O', {
      className: 'lab-axis',
      size: [0.95, 1.2],
      priority: 9,
      optional: true,
      at: (lw, lh) =>
        [
          [-1, 1],
          [1, 1],
          [-1, -1],
          [1, -1],
        ].map(([sx, sy]) => ({ x: o.x + sx * (lw / 2 + 5), y: o.y + sy * (lh / 2 + 4) })),
    });

    const placement = placeLabels(requests, obstacles, {
      x0: 2,
      y0: 2,
      x1: width - 2,
      y1: height - 2,
    });
    // Scalar rulers: geometry from rulers.ts, labels at fixed places.
    const valueTex = (n: number) => (masked ? MASK : tex(n));
    const valueWidth = (n: number) => em * 0.8 * (masked ? 1.6 : 0.6 + 0.55 * tex(n).replace(/[{}]/g, '').length);
    const scalarRulers = layers.scalars
      ? rulers(view, state.A, state.B, em, { x: valueWidth(v.x), y: valueWidth(v.y) })
      : null;
    const rulerLabels = scalarRulers
      ? scalarRulers.flatMap((r) =>
          r.labels.map((l) => {
            const axis = r.axis;
            const key: Key = l.role === 'versor' ? (axis === 'x' ? 'xh' : 'yh') : axis === 'x' ? 'sx' : 'sy';
            const t =
              l.role === 'name'
                ? axis === 'x' ? SYM.sx : SYM.sy
                : l.role === 'value'
                  ? valueTex(axis === 'x' ? v.x : v.y)
                  : l.role === 'zero'
                    ? '0'
                    : axis === 'x' ? SYM.xh : SYM.yh;
            return { ...l, tex: t, key, className: `lab-ruler lab-ruler-${l.role} lab-ruler-${axis}` };
          }),
        )
      : [];
    return { P, v, w, a, b, o, tracks, shown, preview, proj, plane, labels, placement, covered: occupied(requests, placement), scalarRulers, rulerLabels };
  }, [width, height, view, state, layers, construction, focus, fontPx, reserved, masked]);

  const dim = (k: Key) => (focus.size > 0 && !focus.has(k) ? ' is-dim' : focus.has(k) ? ' is-focus' : '');
  const hover = (keys: Key[]) => ({
    onPointerEnter: () => !drag.current && onHover(keys),
    onPointerLeave: () => !drag.current && onHover(null),
  });

  return (
    <div
      className="stage"
      ref={box}
      style={{
        ['--label' as string]: `${fontPx}px`,
        ['--ruler-below' as string]: `${margin.below}px`,
        ['--ruler-beside' as string]: `${margin.beside}px`,
      }}
    >
      {scene && (
        <>
          <svg
            ref={svg}
            className="board"
            width={outer.width}
            height={outer.height}
            viewBox={`0 0 ${outer.width} ${outer.height}`}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            data-dragging={active ?? undefined}
          >
            <Plane view={view} data={scene.plane} covered={scene.covered} />

            {scene.shown.projections && (
              <g className={`layer-projections${scene.preview.projections ? ' is-preview' : ''}`}>
                {(['x', 'y'] as const).map((axis) => {
                  const [fa, fb] = scene.proj[axis];
                  const pa = scene.P(fa);
                  const pb = scene.P(fb);
                  const k: Key = axis === 'x' ? 'px' : 'py';
                  return (
                    <g key={axis} className={`proj proj-${axis}${dim(k)}`} {...hover([k])}>
                      <line className="proj-line" x1={scene.a.x} y1={scene.a.y} x2={pa.x} y2={pa.y} />
                      <line className="proj-line" x1={scene.b.x} y1={scene.b.y} x2={pb.x} y2={pb.y} />
                      <line className="proj-band" x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} />
                      <circle className="proj-foot" cx={pa.x} cy={pa.y} r={3} />
                      <circle className="proj-foot" cx={pb.x} cy={pb.y} r={3} />
                    </g>
                  );
                })}
              </g>
            )}

            {scene.shown.versors && (
              <g className={`layer-versors${scene.preview.versors ? ' is-preview' : ''}`}>
                {(['xh', 'yh'] as const).map((k) => {
                  const [t0, t1] = scene.tracks.get(k)!;
                  return (
                    <g key={k} className={`hit-group${dim(k)}`} {...hover([k])}>
                      <line className="hit" x1={t0.x} y1={t0.y} x2={t1.x} y2={t1.y} />
                      <Arrow tail={t0} tip={t1} width={scene.w.h} className={`vec-${k}`} />
                    </g>
                  );
                })}
              </g>
            )}

            {scene.shown.components && (
              <g className={`layer-components${scene.preview.components ? ' is-preview' : ''}`}>
                {(['vx', 'vy'] as const).map((k) => {
                  const [t0, t1] = scene.tracks.get(k)!;
                  if (Math.hypot(t1.x - t0.x, t1.y - t0.y) < 0.75) return null;
                  return (
                    <g key={k} className={`hit-group${dim(k)}`} {...hover([k])}>
                      <line className="hit" x1={t0.x} y1={t0.y} x2={t1.x} y2={t1.y} />
                      <Arrow tail={t0} tip={t1} width={scene.w.c} className={`vec-${k}`} />
                    </g>
                  );
                })}
              </g>
            )}

            <g className={`main${dim('v')}`}>
              <Arrow
                tail={scene.tracks.get('v')![0]}
                tip={scene.tracks.get('v')![1]}
                width={scene.w.v}
                className="vec-v"
              />
              <circle className="tail-dot" cx={scene.a.x} cy={scene.a.y} r={scene.w.v * 1.15} />
            </g>

            {scene.scalarRulers?.map((r) => {
              const sk: Key = r.axis === 'x' ? 'sx' : 'sy';
              const hk: Key = r.axis === 'x' ? 'xh' : 'yh';
              return (
                <g key={r.axis} className={`ruler ruler-${r.axis}`}>
                  <rect className="ruler-bg" x={r.area.x} y={r.area.y} width={r.area.w} height={r.area.h} />
                  <line
                    className="ruler-edge"
                    x1={r.area.x}
                    y1={r.area.y}
                    x2={r.axis === 'x' ? r.area.x + r.area.w : r.area.x}
                    y2={r.axis === 'x' ? r.area.y : r.area.y + r.area.h}
                  />
                  <g className={`ruler-scale${dim(sk)}`} {...hover([sk])}>
                    <line className="hit" x1={r.line[0].x} y1={r.line[0].y} x2={r.line[1].x} y2={r.line[1].y} />
                    <line className="ruler-line" x1={r.line[0].x} y1={r.line[0].y} x2={r.line[1].x} y2={r.line[1].y} />
                    <path className="ruler-head" d={r.head} />
                    {r.ticks.map((t) => {
                      const h = t.zero ? 6 : 3.5;
                      return r.axis === 'x' ? (
                        <line key={t.at.x} className="ruler-tick" x1={t.at.x} x2={t.at.x} y1={t.at.y - h} y2={t.at.y + h} />
                      ) : (
                        <line key={t.at.y} className="ruler-tick" y1={t.at.y} y2={t.at.y} x1={t.at.x - h} x2={t.at.x + h} />
                      );
                    })}
                    <line className="ruler-band" x1={r.zero.x} y1={r.zero.y} x2={r.point.x} y2={r.point.y} />
                    <circle className="ruler-point" cx={r.point.x} cy={r.point.y} r={5} />
                  </g>
                  <g className={`hit-group${dim(hk)}`} {...hover([hk])}>
                    <line className="hit" x1={r.versor[0].x} y1={r.versor[0].y} x2={r.versor[1].x} y2={r.versor[1].y} />
                    <Arrow tail={r.versor[0]} tip={r.versor[1]} width={scene.w.h * 0.85} className={`vec-${hk}`} />
                  </g>
                </g>
              );
            })}

            {/* Handles: generous, invisible until hovered or focused. */}
            <g className="handles">
              {!isZero(scene.v) && (
                <line
                  className="handle-body"
                  x1={scene.a.x}
                  y1={scene.a.y}
                  x2={scene.b.x}
                  y2={scene.b.y}
                  tabIndex={0}
                  role="button"
                  aria-label={HANDLE_NAMES.body}
                  data-active={active === 'body' || undefined}
                  onPointerDown={down('body')}
                  onKeyDown={key('body')}
                  {...hover(['v'])}
                />
              )}
              {(['A', 'B'] as const).map((h) => {
                const p = h === 'A' ? scene.a : scene.b;
                return (
                  <g
                    key={h}
                    className="handle"
                    tabIndex={0}
                    role="button"
                    aria-label={`${HANDLE_NAMES[h]}: (${tex(state[h].x)}; ${tex(state[h].y)})`.replace(/[{}]/g, '')}
                    data-active={active === h || undefined}
                    onPointerDown={down(h)}
                    onKeyDown={key(h)}
                    {...hover([h, 'v'])}
                  >
                    <circle className="handle-hit" cx={p.x} cy={p.y} r={24} />
                    <circle className="handle-ring" cx={p.x} cy={p.y} r={11} />
                  </g>
                );
              })}
            </g>
          </svg>

          <div className="labels" aria-hidden="true">
            {Object.entries(scene.labels).map(([id, l]) => {
              const p = scene.placement.get(id);
              if (!p || p.hidden) return null;
              const preview = l.layer ? scene.preview[l.layer] : false;
              return (
                <Label
                  key={id}
                  tex={l.tex}
                  x={p.cx}
                  y={p.cy}
                  className={`${l.className}${l.key ? dim(l.key) : focus.size ? ' is-dim' : ''}${preview ? ' is-preview' : ''}`}
                />
              );
            })}
          </div>
          <div className="labels labels-rulers" aria-hidden="true">
            {scene.rulerLabels.map((l) => (
              <Label key={l.id} tex={l.tex} x={l.x} y={l.y} className={`${l.className}${dim(l.key)}`} />
            ))}
          </div>
          {children}
        </>
      )}
    </div>
  );
}

