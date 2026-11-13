/**
 * The diagram: the Cartesian plane, v⃗ from the origin, its reference angle and, as layers, the
 * right triangle (lengths), the projections on the axes (signed components) and the vector
 * components. One handle, the tip:
 *
 *   'polar'      the drag snaps the modulus to 0.5 and the angle to whole degrees
 *                (0.1 and 0.1° with Shift or Alt): the data of this mode stay round;
 *   'cartesian'  the drag snaps the tip to the unit grid (tenths with Shift or Alt).
 *
 * The arrow keys move the tip by one unit (a tenth with Shift); in 'polar' ↑ ↓ turn the angle
 * and ← → change the modulus. The scale never follows the drag; the tip stays on stage.
 *
 * Drawing order, bottom to top: plane, quadrant, triangle, projections, components, angle, v⃗,
 * handle. Labels are HTML over the SVG, placed by labels.ts around everything drawn.
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent, ReactNode } from 'react';
import {
  analyse,
  ANGLE_MAX,
  ANGLE_MIN,
  normalisePolar,
  polarFromPointer,
  polarOf,
  quadrantOf,
  ROMAN,
  tipOf,
} from '../model/direction.ts';
import type { Quadrant } from '../model/direction.ts';
import { clamp, snap, vec } from '../model/vec.ts';
import type { Vec } from '../model/vec.ts';
import Arrow from './Arrow.tsx';
import { arrowShape, stackTracks } from './arrow.ts';
import { MASK, tex } from './format.ts';
import { DEG, LEN } from './formulas.ts';
import type { Key, Mode } from './formulas.ts';
import Label from './Label.tsx';
import { aroundPoint, besideSegment, occupied, placeLabels, support } from './labels.ts';
import type { LabelRequest, Obstacle, Rect } from './labels.ts';
import { angleArc, arcPoints, bisector, rightAngle } from './marks.ts';
import Plane from './Plane.tsx';
import { planeData } from './plane.ts';
import { useSize } from './useSize.ts';
import { centeredView, fitView, toMath, toPx, visibleBox } from './view.ts';
import type { View } from './view.ts';

export interface Layers {
  triangle: boolean;
  projections: boolean;
  components: boolean;
}

/** Font size of each kind of label relative to --label (keep in step with styles.css). */
const LABEL_SCALE: Record<string, number> = {
  'lab-v': 1.12,
  'lab-axis': 0.82,
  'lab-angle': 0.9,
  'lab-len': 0.82,
  'lab-signed': 0.82,
};

/** The visible plane less a margin: where the tip may go. */
function limits(view: View) {
  const box = visibleBox(view);
  const m = 0.4;
  return { xmin: box.xmin + m, xmax: box.xmax - m, ymin: box.ymin + m, ymax: box.ymax - m };
}

/** The largest modulus that keeps the tip on stage in every direction allowed. */
export function maxModulus(view: View, first: boolean): number {
  const l = limits(view);
  const r = first ? Math.min(l.xmax, l.ymax) : Math.min(l.xmax, l.ymax, -l.xmin, -l.ymin);
  return Math.max(0.5, Math.floor(r * 10) / 10);
}

/** The view: centred on the origin for four quadrants, the first quadrant only otherwise. */
export function makeView(width: number, height: number, half: number, first: boolean, top: number): View {
  if (!first) return centeredView(width, height, half, 14);
  // The square [−0.17 s, s]² fits the stage below the tools; any extra room goes to positive x
  // and y, so the origin stays near the bottom-left corner.
  const s = half * 1.6;
  const m = 0.17 * s;
  const v = fitView(width, Math.max(0, height - top), { xmin: -m, xmax: s, ymin: -m, ymax: s }, 8);
  return { ...v, height, ox: 8 + m * v.scale, oy: height - 8 - m * v.scale };
}

export default function Stage({
  tip,
  onChange,
  mode,
  first,
  layers,
  focus,
  onHover,
  half,
  masked,
  children,
}: {
  tip: Vec;
  onChange: (next: Vec) => void;
  mode: Mode;
  first: boolean;
  layers: Layers;
  focus: ReadonlySet<Key>;
  onHover: (keys: Key[] | null) => void;
  /** Units from the origin to the nearer edge: the zoom. */
  half: number;
  masked: boolean;
  children?: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const { width, height } = useSize(box);
  const fontPx = clamp(Math.min(width, height) * 0.04, 16, 30);
  const view = useMemo(() => makeView(width, height, half, first, 52), [width, height, half, first]);
  const dragging = useRef(false);
  const [active, setActive] = useState(false);

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

  const lim = limits(view);
  const maxMod = maxModulus(view, first);
  const keepCartesian = (p: Vec, step: number): Vec => {
    const lo = (bound: number) => Math.ceil(bound / step - 1e-9) * step;
    const hi = (bound: number) => Math.floor(bound / step + 1e-9) * step;
    const x = clamp(snap(p.x, step), first ? 0 : lo(lim.xmin), hi(lim.xmax));
    const y = clamp(snap(p.y, step), first ? 0 : lo(lim.ymin), hi(lim.ymax));
    return vec(x, y);
  };
  const place = (p: Vec, fine: boolean): Vec => {
    if (mode === 'cartesian') return keepCartesian(p, fine ? 0.1 : 1);
    return tipOf(polarFromPointer(p, { angleStep: fine ? 0.1 : 1, modStep: fine ? 0.1 : 0.5, first, maxMod }));
  };

  const pointer = (e: PointerEvent): Vec => {
    const r = svg.current!.getBoundingClientRect();
    return toMath(view, { x: e.clientX - r.left, y: e.clientY - r.top });
  };
  const down = (e: PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    dragging.current = true;
    setActive(true);
  };
  const move = (e: PointerEvent) => {
    if (!dragging.current) return;
    const next = place(pointer(e), e.shiftKey || e.altKey);
    if (next.x !== tip.x || next.y !== tip.y) onChange(next);
  };
  const up = () => {
    dragging.current = false;
    setActive(false);
  };
  const key = (e: KeyboardEvent) => {
    const fine = e.shiftKey;
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
    if (!d) return;
    e.preventDefault();
    if (mode === 'cartesian') {
      const step = fine ? 0.1 : 1;
      onChange(keepCartesian({ x: tip.x + d[0] * step, y: tip.y + d[1] * step }, step));
      return;
    }
    const p = polarOf(tip);
    if (!p) return;
    const next = d[1] !== 0
      ? { ...p, angle: clamp(p.angle + d[1] * (fine ? 0.1 : 1), ANGLE_MIN, ANGLE_MAX) }
      : { ...p, mod: p.mod + d[0] * (fine ? 0.1 : 0.5) };
    onChange(tipOf(normalisePolar(next, maxMod)));
  };

  const scene = useMemo(() => {
    if (width === 0) return null;
    const em = fontPx;
    const P = (p: Vec) => toPx(view, p);
    const info = analyse(tip);
    const q: Quadrant | null = quadrantOf(tip);
    const base = clamp(em * 0.14, 2.4, 4);
    const w = { v: base * 1.25, c: base, leg: base * 0.95 };
    const O = P({ x: 0, y: 0 });
    const T = P(tip);
    const H = P({ x: tip.x, y: 0 });
    const K = P({ x: 0, y: tip.y });
    const box = visibleBox(view);
    const triangle = layers.triangle || focus.has('lx') || focus.has('ly');
    const projections = layers.projections || focus.has('sx') || focus.has('sy');
    const components = layers.components || focus.has('vx') || focus.has('vy');
    const preview = { triangle: !layers.triangle, projections: !layers.projections, components: !layers.components };
    const hasTriangle = info.kind === 'quadrant';

    const tracks = stackTracks([
      { key: 'v', seg: [O, T], width: w.v },
      ...(components
        ? [
            { key: 'vx', seg: [O, H] as const, width: w.c },
            { key: 'vy', seg: [H, T] as const, width: w.c },
          ]
        : []),
    ]);

    // The reference angle at O, from the nearer half of the x-axis to v⃗.
    const ref = { x: tip.x < 0 ? -1 : 1, y: 0 };
    const dirV = { x: T.x - O.x, y: T.y - O.y };
    const lenPx = Math.hypot(dirV.x, dirV.y);
    const r = clamp(Math.min(lenPx * 0.3, Math.abs(H.x - O.x) * 0.8 || lenPx * 0.3), 18, em * 2.4);
    const arc = hasTriangle ? angleArc(O, ref, dirV, r) : null;
    const vertical = info.kind === 'axis' && info.axis === 'y';
    const rightAtO = vertical ? rightAngle(O, { x: 1, y: 0 }, dirV, clamp(lenPx * 0.18, 8, em * 0.8)) : null;
    const legPx = Math.min(Math.abs(H.x - O.x), Math.abs(T.y - H.y));
    const rightAtH = hasTriangle ? rightAngle(H, { x: O.x - H.x, y: 0 }, { x: 0, y: T.y - H.y }, clamp(legPx * 0.22, 6, em * 0.75)) : null;

    const plane = planeData(view, em * 0.66);

    // Quadrant numerals at the far corners, the current quadrant tinted.
    // While the results are hidden in the inverse problem, the plane does not tell the quadrant.
    const showQuadrant = !(masked && mode === 'cartesian');
    const numerals = first
      ? []
      : ([1, 2, 3, 4] as Quadrant[]).map((n) => {
          const sx = n === 1 || n === 4 ? 1 : -1;
          const sy = n === 1 || n === 2 ? 1 : -1;
          const at = P({ x: sx * (sx > 0 ? box.xmax : -box.xmin) * 0.86, y: sy * (sy > 0 ? box.ymax : -box.ymin) * 0.86 });
          return { n, at, current: showQuadrant && n === q };
        });
    const tint =
      !first && q && showQuadrant
        ? {
            x: q === 1 || q === 4 ? O.x : 0,
            y: q === 1 || q === 2 ? 0 : O.y,
            w: q === 1 || q === 4 ? width - O.x : O.x,
            h: q === 1 || q === 2 ? O.y : height - O.y,
          }
        : null;

    // Obstacles: what labels must not cover.
    const obstacles: Obstacle[] = [];
    for (const [k, seg] of tracks) {
      const width = k === 'v' ? w.v : w.c;
      const shape = arrowShape(seg[0], seg[1], width);
      if (shape.point) continue;
      obstacles.push({ kind: 'segment', a: seg[0], b: seg[1], r: width / 2 + 3, weight: 3 });
      obstacles.push({ kind: 'point', p: seg[1], r: width * 2.2 + 4, weight: 3 });
    }
    obstacles.push({ kind: 'point', p: T, r: 9, weight: 3 });
    obstacles.push(
      { kind: 'segment', a: { x: 0, y: O.y }, b: { x: width, y: O.y }, r: 2, weight: 0.3 },
      { kind: 'segment', a: { x: O.x, y: 0 }, b: { x: O.x, y: height }, r: 2, weight: 0.3 },
    );
    if (hasTriangle && triangle) obstacles.push({ kind: 'segment', a: H, b: T, r: w.leg / 2 + 3, weight: 2.5 });
    if (projections) {
      obstacles.push({ kind: 'segment', a: T, b: H, r: 2, weight: 0.5 }, { kind: 'segment', a: T, b: K, r: 2, weight: 0.5 });
    }
    if (arc) for (const p of arcPoints(O, ref, dirV, r)) obstacles.push({ kind: 'point', p, r: 3, weight: 1.5 });
    for (const t of plane.ticks) obstacles.push({ kind: 'rect', rect: t.rect, weight: 0.15 });
    for (const n of numerals) obstacles.push({ kind: 'rect', rect: { cx: n.at.x, cy: n.at.y, w: em * 1.6, h: em * 1.2 }, weight: 0.6 });
    for (const rect of reserved) obstacles.push({ kind: 'rect', rect, weight: 50 });

    const requests: LabelRequest[] = [];
    const labels: Record<string, { tex: string; className: string; key?: Key; layer?: keyof typeof preview }> = {};
    const gap = em * 0.3;
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
      const k = LABEL_SCALE[opt.className.split(' ')[0]] ?? 1;
      // A little air around each label, so that neighbours never read as one line.
      const lw = opt.size[0] * em * k + em * 0.45;
      const lh = opt.size[1] * em * k + em * 0.12;
      requests.push({ id, w: lw, h: lh, candidates: opt.at(lw, lh), priority: opt.priority, optional: opt.optional });
      labels[id] = { tex: t, className: opt.className, key: opt.key, layer: opt.layer };
    };
    const chars = (s: string) => s.replace(/\\[a-z]+|[{}^\\]/g, '').length;

    label('ax', 'x', {
      className: 'lab-axis',
      size: [0.9, 1.2],
      priority: -3,
      at: (lw, lh) => [
        { x: width - lw / 2 - 4, y: O.y - lh / 2 - 8 },
        { x: width - lw / 2 - 4, y: O.y + lh / 2 + 8 },
      ],
    });
    label('ay', 'y', {
      className: 'lab-axis',
      size: [0.9, 1.2],
      priority: -3,
      at: (lw, lh) =>
        [lh / 2 + 2, lh * 1.8, lh * 3, lh * 4.2].flatMap((y) => [
          { x: O.x + lw / 2 + 10, y },
          { x: O.x - lw / 2 - 10, y },
        ]),
    });

    const zero = info.kind === 'zero';
    const vTrack = tracks.get('v')!;
    // v⃗ on the side away from the triangle.
    const awayFrom = (a: Vec, b: Vec, other: Vec): 1 | -1 => {
      const n = { x: b.y - a.y, y: -(b.x - a.x) };
      return n.x * (other.x - a.x) + n.y * (other.y - a.y) > 0 ? -1 : 1;
    };
    label('v', '\\vec v', {
      className: 'lab-v',
      size: [1.05, 1.45],
      priority: 0,
      key: 'v',
      at: (lw, lh) =>
        zero
          ? aroundPoint(O, lw, lh, gap * 2.5, { x: 1, y: -1 })
          : [
              ...besideSegment(vTrack[0], vTrack[1], lw, lh, gap, { side: hasTriangle ? awayFrom(O, T, H) : 1, ts: [0.55, 0.4, 0.7] }),
              ...aroundPoint(T, lw, lh, gap * 2, dirV),
            ],
    });

    // The angle: "α = 35°", "β ≈ 53,1°", or "β = ?" while the values are hidden.
    const symbol = first ? '\\alpha' : '\\beta';
    let angleText: string | null = null;
    if (hasTriangle) {
      const hide = masked && mode === 'cartesian';
      // In 'polar' the angle is a datum, a multiple of 0.1°: shown as given, with "=".
      const angle = mode === 'polar' ? snap(info.angle, 0.1) : info.angle;
      const exact = Math.abs(Number(angle.toFixed(DEG)) - angle) < 1e-9;
      angleText = hide ? `${symbol} = ${MASK}` : `${symbol} ${exact ? '=' : '\\approx'} ${tex(angle, DEG)}^\\circ`;
    } else if (info.kind === 'axis' && !(masked && mode === 'cartesian')) {
      angleText = `${symbol} = ${info.axis === 'x' ? 0 : 90}^\\circ`;
    }
    if (angleText) {
      const d = arc ? bisector(ref, dirV) : { x: 0.7071, y: -0.7071 };
      const reach = r + gap;
      label('ang', angleText, {
        className: 'lab-angle',
        size: [0.8 + 0.55 * chars(angleText), 1.35],
        priority: 1,
        key: 'ang',
        at: (lw, lh) => {
          const out = reach + support(lw, lh, d);
          return [
            ...[1, 1.3, 1.7].map((t) => ({ x: O.x + d.x * out * t, y: O.y + d.y * out * t })),
            ...aroundPoint(O, lw, lh, gap * 2, { x: ref.x, y: tip.y >= 0 ? 1 : -1 }),
          ];
        },
      });
    }

    // Lengths of the legs (triangle layer): on the outer side of each leg.
    const hideComputed = masked && mode === 'polar';
    const value = (n: number) => (hideComputed ? `= ${MASK}` : `${Math.abs(Number(n.toFixed(LEN)) - n) < 1e-9 ? '=' : '\\approx'} ${tex(n, LEN)}`);
    if (hasTriangle && triangle) {
      const lx = Math.abs(tip.x);
      const ly = Math.abs(tip.y);
      const tx = `|v_x| ${value(lx)}`;
      const ty = `|v_y| ${value(ly)}`;
      label('lx', tx, {
        className: 'lab-len lab-len-x',
        size: [0.7 + 0.5 * chars(tx), 1.35],
        priority: 3,
        key: 'lx',
        layer: 'triangle',
        at: (lw, lh) => [
          ...besideSegment(O, H, lw, lh, gap, { side: awayFrom(O, H, T), ts: [0.5, 0.36, 0.64, 0.25, 0.75] }),
          ...aroundPoint({ x: (O.x + H.x) / 2, y: O.y }, lw, lh, gap * 3, { x: 0, y: tip.y >= 0 ? 1 : -1 }),
        ],
      });
      label('ly', ty, {
        className: 'lab-len lab-len-y',
        size: [0.7 + 0.5 * chars(ty), 1.35],
        priority: 4,
        key: 'ly',
        layer: 'triangle',
        at: (lw, lh) => [
          ...besideSegment(H, T, lw, lh, gap, { side: awayFrom(H, T, O), ts: [0.5, 0.36, 0.64, 0.25, 0.75] }),
          // Crowded or near the edge: beyond the tip, or inside the triangle low down.
          ...aroundPoint(T, lw, lh, gap * 2, { x: tip.x >= 0 ? 1 : -1, y: 0 }),
          ...[0.2, 0.12].map((t) => ({ x: H.x - Math.sign(tip.x) * (lw / 2 + gap), y: H.y + (T.y - H.y) * t - Math.sign(T.y - H.y) * 0 })),
        ],
      });
    }

    // Signed components at the feet of the projections.
    if (projections && !zero) {
      const signed = (n: number) =>
        hideComputed ? `= ${MASK}` : `${Math.abs(Number(n.toFixed(LEN)) - n) < 1e-9 ? '=' : '\\approx'} ${tex(n, LEN)}`;
      if (Math.abs(tip.x) > 1e-9) {
        const t = `v_x ${signed(tip.x)}`;
        label('sx', t, {
          className: 'lab-signed lab-signed-x',
          size: [0.7 + 0.5 * chars(t), 1.35],
          priority: 5,
          key: 'sx',
          layer: 'projections',
          at: (lw, lh) => {
            // At the foot H, on the outer side of the axis, beyond the foot first (the middle of
            // the segment belongs to the length |v_x|).
            const out = tip.y >= 0 ? 1 : -1;
            const beyond = tip.x >= 0 ? 1 : -1;
            const ys = [H.y + out * (lh / 2 + 8), H.y - out * (lh / 2 + 8)];
            return ys.flatMap((y) => [0.5, 0.25, 0, 0.8, -0.3].map((s) => ({ x: H.x + beyond * s * lw, y })));
          },
        });
      }
      if (Math.abs(tip.y) > 1e-9) {
        const t = `v_y ${signed(tip.y)}`;
        label('sy', t, {
          className: 'lab-signed lab-signed-y',
          size: [0.7 + 0.5 * chars(t), 1.35],
          priority: 6,
          key: 'sy',
          layer: 'projections',
          at: (lw, lh) => {
            const left = tip.x >= 0;
            const x = K.x + (left ? -1 : 1) * (lw / 2 + 9);
            return [0, -0.8, 0.8, -1.6, 1.6].flatMap((s) => [{ x, y: K.y + s * lh }, { x: K.x - (left ? -1 : 1) * (lw / 2 + 9), y: K.y + s * lh }]);
          },
        });
      }
    }

    if (components) {
      (['vx', 'vy'] as const).forEach((k, i) => {
        const seg = tracks.get(k)!;
        if (Math.hypot(seg[1].x - seg[0].x, seg[1].y - seg[0].y) < 1) return;
        label(k, k === 'vx' ? '\\vec v_x' : '\\vec v_y', {
          className: k === 'vx' ? 'lab-x' : 'lab-y',
          size: [1.45, 1.5],
          priority: 7 + i,
          key: k,
          layer: 'components',
          at: (lw, lh) => [
            ...besideSegment(seg[0], seg[1], lw, lh, gap, { side: awayFrom(seg[0], seg[1], k === 'vx' ? T : O), ts: [0.3, 0.7, 0.5] }),
            ...aroundPoint(seg[1], lw, lh, gap * 2),
          ],
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
        ].map(([sx, sy]) => ({ x: O.x + sx * (lw / 2 + 5), y: O.y + sy * (lh / 2 + 4) })),
    });

    const placement = placeLabels(requests, obstacles, { x0: 2, y0: 2, x1: width - 2, y1: height - 2 });
    return {
      O, T, H, K, info, q, w, tracks, triangle, projections, components, preview, hasTriangle,
      arc, rightAtO, rightAtH, plane, numerals, tint, labels, placement, covered: occupied(requests, placement),
    };
  }, [width, height, view, tip, mode, first, layers, focus, fontPx, reserved, masked]);

  const dim = (k: Key) => (focus.size > 0 && !focus.has(k) ? ' is-dim' : focus.has(k) ? ' is-focus' : '');
  const hover = (keys: Key[]) => ({
    onPointerEnter: () => !dragging.current && onHover(keys),
    onPointerLeave: () => !dragging.current && onHover(null),
  });

  const handleName = () => {
    const p = polarOf(tip);
    const where = `(${tex(tip.x, LEN)}; ${tex(tip.y, LEN)})`.replace(/[{}]/g, '');
    if (mode === 'polar' && p) {
      return `Punta del vettore ${where}: trascina, oppure frecce su e giù per l’angolo, destra e sinistra per il modulo`;
    }
    return `Punta del vettore ${where}: trascina o usa le frecce`;
  };

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
            data-dragging={active || undefined}
          >
            {scene.tint && (
              <rect className={`quadrant-tint${dim('q')}`} x={scene.tint.x} y={scene.tint.y} width={scene.tint.w} height={scene.tint.h} />
            )}
            <Plane view={view} data={scene.plane} covered={scene.covered} />
            {scene.numerals.map((n) => (
              <text
                key={n.n}
                className={`quadrant-numeral${n.current ? ' is-current' : ''}${n.current ? dim('q') : ''}`}
                x={n.at.x}
                y={n.at.y}
                textAnchor="middle"
                dominantBaseline="central"
                aria-hidden="true"
              >
                {ROMAN[n.n]}
              </text>
            ))}

            {scene.hasTriangle && scene.triangle && (
              <g className={`layer-triangle${scene.preview.triangle ? ' is-preview' : ''}`}>
                <polygon className="triangle" points={[scene.O, scene.H, scene.T].map((p) => `${p.x},${p.y}`).join(' ')} />
                <g className={`leg leg-x${dim('lx')}`} {...hover(['lx'])}>
                  <line className="hit" x1={scene.O.x} y1={scene.O.y} x2={scene.H.x} y2={scene.H.y} />
                  <line className="leg-line" x1={scene.O.x} y1={scene.O.y} x2={scene.H.x} y2={scene.H.y} strokeWidth={scene.w.leg} />
                </g>
                <g className={`leg leg-y${dim('ly')}`} {...hover(['ly'])}>
                  <line className="hit" x1={scene.H.x} y1={scene.H.y} x2={scene.T.x} y2={scene.T.y} />
                  <line className="leg-line" x1={scene.H.x} y1={scene.H.y} x2={scene.T.x} y2={scene.T.y} strokeWidth={scene.w.leg} />
                </g>
                {scene.rightAtH && <path className="right-mark" d={scene.rightAtH} />}
              </g>
            )}

            {scene.projections && scene.info.kind !== 'zero' && (
              <g className={`layer-projections${scene.preview.projections ? ' is-preview' : ''}`}>
                {Math.abs(scene.T.x - scene.O.x) > 0.5 && (
                  <g className={`proj proj-x${dim('sx')}`} {...hover(['sx'])}>
                    <line className="hit" x1={scene.O.x} y1={scene.O.y} x2={scene.H.x} y2={scene.H.y} />
                    <line className="proj-band" x1={scene.O.x} y1={scene.O.y} x2={scene.H.x} y2={scene.H.y} />
                    <line className="proj-line" x1={scene.T.x} y1={scene.T.y} x2={scene.H.x} y2={scene.H.y} />
                    <circle className="proj-foot" cx={scene.H.x} cy={scene.H.y} r={3.4} />
                  </g>
                )}
                {Math.abs(scene.T.y - scene.O.y) > 0.5 && (
                  <g className={`proj proj-y${dim('sy')}`} {...hover(['sy'])}>
                    <line className="hit" x1={scene.O.x} y1={scene.O.y} x2={scene.K.x} y2={scene.K.y} />
                    <line className="proj-band" x1={scene.O.x} y1={scene.O.y} x2={scene.K.x} y2={scene.K.y} />
                    <line className="proj-line" x1={scene.T.x} y1={scene.T.y} x2={scene.K.x} y2={scene.K.y} />
                    <circle className="proj-foot" cx={scene.K.x} cy={scene.K.y} r={3.4} />
                  </g>
                )}
              </g>
            )}

            {scene.components && (
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

            {scene.arc && (
              <g className={`angle${dim('ang')}`} {...hover(['ang'])}>
                <path className="angle-sector" d={scene.arc.sector} />
                <path className="angle-arc" d={scene.arc.arc} />
              </g>
            )}
            {scene.rightAtO && <path className={`right-mark angle-right${dim('ang')}`} d={scene.rightAtO} />}

            <g className={`main${dim('v')}`} {...hover(['v'])}>
              <Arrow tail={scene.tracks.get('v')![0]} tip={scene.tracks.get('v')![1]} width={scene.w.v} className="vec-v" />
            </g>

            <g
              className="handle"
              tabIndex={0}
              role="button"
              aria-label={handleName()}
              data-active={active || undefined}
              onPointerDown={down}
              onKeyDown={key}
            >
              <circle className="handle-hit" cx={scene.T.x} cy={scene.T.y} r={26} />
              <circle className="handle-ring" cx={scene.T.x} cy={scene.T.y} r={12} />
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
          {children}
        </>
      )}
    </div>
  );
}
