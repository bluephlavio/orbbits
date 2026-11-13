/**
 * The diagram: the plane and the pieces of the current construction (model/operations.ts).
 *
 *   tip of a⃗, tip of b⃗ → change the vector      common tail → translates the construction
 *   tip of k a⃗ (scalar) → sets k along the line of a⃗
 *
 * Pointer positions snap to the unit grid (tenths with Shift or Alt; k to tenths). Copies are
 * the same colour and name as their original, lighter and dashed. Coincident arrows stack on
 * parallel tracks; k a⃗ always runs on its own track beside a⃗, so both can be read at once.
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent, ReactNode } from 'react';
import { auxiliary, K_MAX, K_MIN, parallelogram, pieces, resultOf } from '../model/operations.ts';
import type { Key, Motion, Operation, Piece, SumOrder, Vectors } from '../model/operations.ts';
import { add, clamp, dot, isZero, length, snap, sub, vec } from '../model/vec.ts';
import type { Vec } from '../model/vec.ts';
import Arrow from './Arrow.tsx';
import { arrowShape, stackTracks, trackNormal } from './arrow.ts';
import Label from './Label.tsx';
import { aroundPoint, besideSegment, occupied, placeLabels } from './labels.ts';
import type { LabelRequest, Obstacle, Rect } from './labels.ts';
import Plane from './Plane.tsx';
import { planeData } from './plane.ts';
import { useSize } from './useSize.ts';
import { centeredView, toMath, toPx, visibleBox } from './view.ts';
import type { View } from './view.ts';

type Handle = 'P' | 'a' | 'b' | 'k';

interface Drag {
  handle: Handle;
  start: Vec;
  from: Vectors;
}

const HANDLE_NAMES: Record<Handle, string> = {
  P: 'Coda comune: trascina per traslare',
  a: 'Punta di a',
  b: 'Punta di b',
  k: 'Punta di k per a: trascina per cambiare k',
};

const LABEL_SCALE: Record<string, number> = { 'lab-ghost': 0.92, 'lab-axis': 0.82 };

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

/** Where a drag (or a key press) takes the vectors. Points stay inside the visible plane. */
function moved(handle: Handle, from: Vectors, delta: Vec, step: number, view: View, pointer?: Vec): Vectors {
  const lim = limits(view, step);
  const keep = (p: Vec) => vec(clamp(snap(p.x, step), lim.xmin, lim.xmax), clamp(snap(p.y, step), lim.ymin, lim.ymax));
  if (handle === 'a' || handle === 'b') {
    const tip = keep(add(add(from.P, from[handle]), delta));
    return { ...from, [handle]: sub(tip, from.P) };
  }
  if (handle === 'k') {
    // k is the signed position of the pointer along the line of a⃗, in units of a⃗.
    const target = pointer ?? add(add(from.P, vec(from.a.x * from.k, from.a.y * from.k)), delta);
    const aa = dot(from.a, from.a);
    if (aa < 1e-9) return from;
    const raw = dot(sub(target, from.P), from.a) / aa;
    return { ...from, k: clamp(snap(raw, 0.1), K_MIN, K_MAX) };
  }
  // The common tail: both tips must stay visible.
  const tips = [from.a, from.b];
  const P = vec(snap(from.P.x + delta.x, step), snap(from.P.y + delta.y, step));
  const lo = (min: number, c: 'x' | 'y') => Math.max(min, ...tips.map((t) => min - t[c]));
  const hi = (max: number, c: 'x' | 'y') => Math.min(max, ...tips.map((t) => max - t[c]));
  return {
    ...from,
    P: vec(clamp(P.x, lo(lim.xmin, 'x'), hi(lim.xmax, 'x')), clamp(P.y, lo(lim.ymin, 'y'), hi(lim.ymax, 'y'))),
  };
}

const ROLE_CLASS: Record<Piece['role'], string> = {
  original: '',
  copy: ' is-copy',
  opposite: ' is-opposite',
  result: '',
  secondary: ' is-secondary',
};

export default function Stage({
  state,
  onChange,
  op,
  order,
  motion,
  focus,
  onHover,
  half,
  children,
}: {
  state: Vectors;
  onChange: (next: Vectors) => void;
  op: Operation;
  /** Order of the tip-to-tail sum, for the Cartesian steps. */
  order: SumOrder;
  motion: Motion;
  focus: ReadonlySet<Key>;
  onHover: (keys: Key[] | null) => void;
  half: number;
  children?: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const { width, height } = useSize(box);
  const view = useMemo(() => centeredView(width, height, half, 14), [width, height, half]);
  const fontPx = clamp(Math.min(width, height) * 0.04, 16, 30);
  const drag = useRef<Drag | null>(null);
  const [active, setActive] = useState<Handle | null>(null);

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
    const p = pointer(e);
    // For k, the pointer's own position matters, not how far it moved.
    const grabOffset = d.handle === 'k' ? sub(p, d.start) : undefined;
    const kTarget = grabOffset
      ? add(add(d.from.P, vec(d.from.a.x * d.from.k, d.from.a.y * d.from.k)), grabOffset)
      : undefined;
    onChange(moved(d.handle, d.from, sub(p, d.start), step, view, kTarget));
  };
  const up = () => {
    drag.current = null;
    setActive(null);
  };
  const key = (handle: Handle) => (e: KeyboardEvent) => {
    const step = e.shiftKey ? 0.1 : 1;
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
    if (!d) return;
    e.preventDefault();
    if (handle === 'k') {
      const dk = (d[0] + d[1]) * (e.shiftKey ? 0.1 : 0.5);
      onChange({ ...state, k: clamp(snap(state.k + dk, 0.1), K_MIN, K_MAX) });
      return;
    }
    onChange(moved(handle, state, vec(d[0] * step, d[1] * step), Math.min(step, 1), view));
  };

  const scene = useMemo(() => {
    if (width === 0) return null;
    const P = (p: Vec) => toPx(view, p);
    const em = fontPx;
    const base = clamp(em * 0.14, 2.4, 4);
    const widthOf = (piece: Piece) =>
      piece.role === 'copy' ? base * 0.95 : piece.role === 'result' ? base * 1.25 : piece.role === 'secondary' ? base : base * 1.15;
    const all = pieces(state, op, motion);
    // Track priority: originals, then −b⃗, results, copies (drawn order is separate).
    const rank: Record<Piece['role'], number> = { original: 0, opposite: 1, result: 2, secondary: 2.5, copy: 3 };
    const ordered = [...all].sort((x, y) => rank[x.role] - rank[y.role]);
    const tracks = stackTracks(
      ordered.map((p) => ({ key: p.id, seg: [P(p.tail), P(p.tip)] as const, width: widthOf(p) })),
    );
    // k a⃗ always on its own track beside a⃗.
    if (op === 'scalar') {
      const ka = all.find((p) => p.id === 'ka')!;
      const aSeg = tracks.get('a')!;
      const n = trackNormal(aSeg[0], aSeg[1]);
      const d = base * 1.2 + 9;
      const t0 = P(ka.tail);
      const t1 = P(ka.tip);
      tracks.set('ka', [
        { x: t0.x + n.x * d, y: t0.y + n.y * d },
        { x: t1.x + n.x * d, y: t1.y + n.y * d },
      ]);
    }
    const plane = planeData(view, em * 0.66);
    const o = P({ x: 0, y: 0 });
    const tail = P(state.P);

    const obstacles: Obstacle[] = [];
    for (const piece of all) {
      const seg = tracks.get(piece.id)!;
      const w = widthOf(piece);
      if (arrowShape(seg[0], seg[1], w).point) {
        obstacles.push({ kind: 'point', p: seg[0], r: 9, weight: 3 });
        continue;
      }
      const weight = piece.role === 'copy' ? 2 : 3;
      obstacles.push({ kind: 'segment', a: seg[0], b: seg[1], r: w / 2 + 3, weight });
      obstacles.push({ kind: 'point', p: seg[1], r: w * 2.2 + 4, weight });
    }
    obstacles.push({ kind: 'point', p: tail, r: 9, weight: 3 });
    const aux = auxiliary(state, op, motion);
    for (const side of aux.sides) obstacles.push({ kind: 'segment', a: P(side.from), b: P(side.to), r: 2.5, weight: 0.8 });
    obstacles.push(
      { kind: 'segment', a: { x: 0, y: o.y }, b: { x: width, y: o.y }, r: 2, weight: 0.3 },
      { kind: 'segment', a: { x: o.x, y: 0 }, b: { x: o.x, y: height }, r: 2, weight: 0.3 },
    );
    for (const t of plane.ticks) obstacles.push({ kind: 'rect', rect: t.rect, weight: 0.15 });
    for (const rect of reserved) obstacles.push({ kind: 'rect', rect, weight: 50 });

    const requests: LabelRequest[] = [];
    const labels: Record<string, { tex: string; className: string; key?: Key }> = {};
    const gap = em * 0.3;
    const label = (
      id: string,
      t: string,
      opt: { className: string; size: [number, number]; at: (w: number, h: number) => Vec[]; priority: number; key?: Key; optional?: boolean },
    ) => {
      const k = LABEL_SCALE[opt.className] ?? 1;
      const lw = opt.size[0] * em * k;
      const lh = opt.size[1] * em * k;
      requests.push({ id, w: lw, h: lh, candidates: opt.at(lw, lh), priority: opt.priority, optional: opt.optional });
      labels[id] = { tex: t, className: opt.className, key: opt.key };
    };
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

    // Rough widths of the names, in em of the label font.
    const sizeOf = (t: string): [number, number] =>
      t.includes('+') || t.includes('- \\vec') ? [3.3, 1.5] : t.startsWith('-') ? [1.55, 1.5] : t.startsWith('k') ? [1.55, 1.5] : [1.05, 1.5];
    const prio: Record<Piece['role'], number> = { result: 0, original: 1, opposite: 2, secondary: 3, copy: 4 };
    all.forEach((piece, i) => {
      const seg = tracks.get(piece.id)!;
      const zero = Math.hypot(seg[1].x - seg[0].x, seg[1].y - seg[0].y) < 1;
      const copy = piece.role === 'copy';
      label(piece.id, piece.role === 'result' && piece.id === 'ka' ? 'k\\,\\vec a' : piece.tex, {
        className: `lab-${piece.key}${copy ? ' lab-ghost' : ''}`,
        size: sizeOf(piece.tex),
        priority: prio[piece.role] + i * 0.01,
        key: piece.key,
        optional: copy || piece.role === 'secondary',
        at: (lw, lh) =>
          zero
            ? aroundPoint(seg[0], lw, lh, gap * 3, { x: 1, y: -1 })
            : [
                ...besideSegment(seg[0], seg[1], lw, lh, gap, {
                  side: piece.id === 'ka' || piece.id === 'nb' ? -1 : 1,
                }),
                ...aroundPoint(seg[1], lw, lh, gap * 2, sub(seg[1], seg[0])),
              ],
      });
    });
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
    const placement = placeLabels(requests, obstacles, { x0: 2, y0: 2, x1: width - 2, y1: height - 2 });

    // Scalar: the line of a⃗ and the multiples of a⃗ along k a⃗.
    let line: [Vec, Vec] | null = null;
    const marks: [Vec, Vec][] = [];
    if (op === 'scalar' && !isZero(state.a)) {
      const u = { x: state.a.x / length(state.a), y: state.a.y / length(state.a) };
      const far = 4 * Math.hypot(width, height) / view.scale;
      line = [P(add(state.P, vec(-u.x * far, -u.y * far))), P(add(state.P, vec(u.x * far, u.y * far)))];
      const ka = tracks.get('ka')!;
      const n = trackNormal(tracks.get('a')![0], tracks.get('a')![1]);
      const whole = Math.floor(Math.abs(state.k) + 1e-9);
      const s = Math.sign(state.k);
      for (let j = 1; j <= whole && j < Math.abs(state.k) - 1e-9; j += 1) {
        const p = P(add(state.P, vec(state.a.x * s * j, state.a.y * s * j)));
        const q = { x: p.x + (ka[0].x - tail.x), y: p.y + (ka[0].y - tail.y) };
        marks.push([
          { x: q.x - n.x * 5, y: q.y - n.y * 5 },
          { x: q.x + n.x * 5, y: q.y + n.y * 5 },
        ]);
      }
    }
    const fill = aux.fill > 0 ? parallelogram(state).map(P).map((p) => `${p.x},${p.y}`).join(' ') : null;
    const sides = aux.sides.map((side) => ({ a: P(side.from), b: P(side.to), opacity: side.opacity }));

    // The Cartesian reading, while an x or y column of the algebra is pointed at: the steps
    // of the construction along that direction, end to end from P, and the result's own step.
    const legs: { key: Key; a: Vec; b: Vec; result?: boolean }[] = [];
    const drops: [Vec, Vec][] = [];
    for (const axis of ['x', 'y'] as const) {
      if (!focus.has(axis)) continue;
      const path =
        op === 'scalar'
          ? [{ key: 'a' as Key, v: state.a }]
          : op === 'difference'
            ? [
                { key: 'a' as Key, v: state.a },
                { key: 'nb' as Key, v: vec(-state.b.x, -state.b.y) },
              ]
            : order === 'ab'
              ? [
                  { key: 'a' as Key, v: state.a },
                  { key: 'b' as Key, v: state.b },
                ]
              : [
                  { key: 'b' as Key, v: state.b },
                  { key: 'a' as Key, v: state.a },
                ];
      const onLine = (p: Vec) => (axis === 'x' ? vec(p.x, state.P.y) : vec(state.P.x, p.y));
      // The result runs on a parallel track: below the line for x, left of it for y.
      const shift = axis === 'x' ? { x: 0, y: 9 } : { x: -9, y: 0 };
      let at = state.P;
      for (const step of path) {
        const next = add(at, step.v);
        legs.push({ key: step.key, a: P(onLine(at)), b: P(onLine(next)) });
        drops.push([P(next), P(onLine(next))]);
        at = next;
      }
      const r = add(state.P, resultOf(state, op));
      const r0 = P(onLine(state.P));
      const r1 = P(onLine(r));
      legs.push({ key: 'r', a: { x: r0.x + shift.x, y: r0.y + shift.y }, b: { x: r1.x + shift.x, y: r1.y + shift.y }, result: true });
      drops.push([P(r), r1]);
    }
    return { all, tracks, widthOf, tail, plane, labels, placement, covered: occupied(requests, placement), line, marks, fill, sides, legs, drops, P };
  }, [width, height, view, state, op, order, motion, fontPx, reserved, focus]);

  // Pointing at a direction (x or y) only fades the arrows: the steps are read against them.
  const axisOnly = focus.size > 0 && [...focus].every((k) => k === 'x' || k === 'y');
  const dim = (k: Key) => (focus.size > 0 && !focus.has(k) ? (axisOnly ? ' is-faint' : ' is-dim') : '');
  const hover = (keys: Key[]) => ({
    onPointerEnter: () => !drag.current && onHover(keys),
    onPointerLeave: () => !drag.current && onHover(null),
  });
  const handles: { h: Handle; at: Vec; keys: Key[] }[] = scene
    ? [
        { h: 'P', at: scene.tail, keys: ['a', 'b'] },
        ...(op === 'scalar'
          ? [
              { h: 'a' as const, at: scene.P(add(state.P, state.a)), keys: ['a'] as Key[] },
              { h: 'k' as const, at: scene.tracks.get('ka')![1], keys: ['r'] as Key[] },
            ]
          : [
              { h: 'a' as const, at: scene.P(add(state.P, state.a)), keys: ['a'] as Key[] },
              { h: 'b' as const, at: scene.P(add(state.P, state.b)), keys: ['b'] as Key[] },
            ]),
      ]
    : [];

  return (
    <div className="stage" ref={box} style={{ ['--label' as string]: `${fontPx}px` }}>
      {scene && (
        <>
          <svg
            ref={svg}
            className="board"
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            data-dragging={active ?? undefined}
          >
            <Plane view={view} data={scene.plane} covered={scene.covered} />
            {scene.line && (
              <line className="action-line" x1={scene.line[0].x} y1={scene.line[0].y} x2={scene.line[1].x} y2={scene.line[1].y} />
            )}
            {scene.fill && <polygon className="para-fill" points={scene.fill} style={{ opacity: motion.fill }} />}
            {scene.sides.map((side, i) => (
              <line key={i} className="para-side" x1={side.a.x} y1={side.a.y} x2={side.b.x} y2={side.b.y} style={{ opacity: side.opacity }} />
            ))}
            {scene.drops.map(([p, q], i) => (
              <line key={`d${i}`} className="leg-drop" x1={p.x} y1={p.y} x2={q.x} y2={q.y} />
            ))}
            {scene.legs.map((leg, i) => (
              <line
                key={`l${i}`}
                className={`leg leg-${leg.key}${leg.result ? ' leg-result' : ''}`}
                x1={leg.a.x}
                y1={leg.a.y}
                x2={leg.b.x}
                y2={leg.b.y}
              />
            ))}
            {scene.all.map((piece) => {
              const [t0, t1] = scene.tracks.get(piece.id)!;
              return (
                <g
                  key={piece.id}
                  className={`piece${ROLE_CLASS[piece.role]}${dim(piece.key)}`}
                  style={piece.fade !== undefined ? { opacity: piece.fade } : undefined}
                  {...hover([piece.key])}
                >
                  <line className="hit" x1={t0.x} y1={t0.y} x2={t1.x} y2={t1.y} />
                  <Arrow
                    tail={t0}
                    tip={t1}
                    width={scene.widthOf(piece)}
                    className={`vec-${piece.key}`}
                    dashed={piece.role === 'copy'}
                  />
                </g>
              );
            })}
            {scene.marks.map(([p, q], i) => (
              <line key={i} className="multiple" x1={p.x} y1={p.y} x2={q.x} y2={q.y} />
            ))}
            <circle className="tail-dot" cx={scene.tail.x} cy={scene.tail.y} r={4.5} />
            <g className="handles">
              {handles.map(({ h, at, keys }) => (
                <g
                  key={h}
                  className={`handle handle-${h}`}
                  tabIndex={0}
                  role="button"
                  aria-label={HANDLE_NAMES[h]}
                  data-active={active === h || undefined}
                  onPointerDown={down(h)}
                  onKeyDown={key(h)}
                  {...hover(keys)}
                >
                  <circle className="handle-hit" cx={at.x} cy={at.y} r={24} />
                  <circle className="handle-ring" cx={at.x} cy={at.y} r={11} />
                </g>
              ))}
            </g>
          </svg>
          <div className="labels" aria-hidden="true">
            {Object.entries(scene.labels).map(([id, l]) => {
              const p = scene.placement.get(id);
              if (!p || p.hidden) return null;
              return <Label key={id} tex={l.tex} x={p.cx} y={p.cy} className={`${l.className}${l.key ? dim(l.key) : ''}`} />;
            })}
          </div>
          {children}
        </>
      )}
    </div>
  );
}

