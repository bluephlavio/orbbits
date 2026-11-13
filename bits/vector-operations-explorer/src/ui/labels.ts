/**
 * Label placement in pixels. Each label offers candidate positions in order of preference;
 * labels are placed greedily by priority, each taking the candidate that collides least with
 * the stage edges, the labels already placed and the drawing (arrows, points, axes). An optional
 * label that cannot find a clean spot is hidden rather than drawn over something.
 *
 * Deterministic and continuous in practice: the same scene gives the same layout, and a label
 * only jumps when its preferred spot becomes occupied. Pure, tested in tests/labels.test.ts.
 */
import type { Vec } from '../model/vec.ts';

/** Axis-aligned rectangle given by its centre and size. */
export interface Rect {
  cx: number;
  cy: number;
  w: number;
  h: number;
}

export type Obstacle =
  | { kind: 'segment'; a: Vec; b: Vec; r: number; weight: number }
  | { kind: 'point'; p: Vec; r: number; weight: number }
  | { kind: 'rect'; rect: Rect; weight: number };

export interface LabelRequest {
  id: string;
  w: number;
  h: number;
  /** Candidate centres, best first. */
  candidates: readonly Vec[];
  /** Lower is placed first. */
  priority: number;
  /** May be hidden when every candidate collides. */
  optional?: boolean;
}

export interface Placement {
  cx: number;
  cy: number;
  hidden: boolean;
}

export interface Bounds {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** How far a box reaches along a unit direction from its centre. */
export const support = (w: number, h: number, d: Vec): number =>
  (w / 2) * Math.abs(d.x) + (h / 2) * Math.abs(d.y);

/** Candidate centres beside a segment, at fractions `ts`, on the preferred side first. */
export function besideSegment(
  a: Vec,
  b: Vec,
  w: number,
  h: number,
  gap: number,
  { ts = [0.5, 0.36, 0.64, 0.22, 0.78], side = 1 }: { ts?: readonly number[]; side?: 1 | -1 } = {},
): Vec[] {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  if (len < 1e-6) return aroundPoint(a, w, h, gap);
  const n = { x: (b.y - a.y) / len, y: -(b.x - a.x) / len };
  const out: Vec[] = [];
  for (const s of [side, -side]) {
    const d = { x: n.x * s, y: n.y * s };
    const reach = support(w, h, d) + gap;
    for (const t of ts) {
      out.push({
        x: a.x + (b.x - a.x) * t + d.x * reach,
        y: a.y + (b.y - a.y) * t + d.y * reach,
      });
    }
  }
  // Interleave sides so that the second choice is the same spot across the line, not a
  // different spot on a side already known to be busy.
  const half = ts.length;
  const mixed: Vec[] = [];
  for (let i = 0; i < half; i += 1) mixed.push(out[i], out[i + half]);
  return mixed;
}

const COMPASS: readonly Vec[] = [
  { x: 1, y: 0 },
  { x: 0.7071, y: -0.7071 },
  { x: 0, y: -1 },
  { x: -0.7071, y: -0.7071 },
  { x: -1, y: 0 },
  { x: -0.7071, y: 0.7071 },
  { x: 0, y: 1 },
  { x: 0.7071, y: 0.7071 },
];

/** Candidate centres around a point, starting from `prefer` (a direction) and turning away. */
export function aroundPoint(p: Vec, w: number, h: number, gap: number, prefer?: Vec): Vec[] {
  const dirs = [...COMPASS];
  if (prefer && (prefer.x !== 0 || prefer.y !== 0)) {
    const len = Math.hypot(prefer.x, prefer.y);
    const q = { x: prefer.x / len, y: prefer.y / len };
    dirs.sort((d1, d2) => d2.x * q.x + d2.y * q.y - (d1.x * q.x + d1.y * q.y));
    dirs.unshift(q);
  }
  return dirs.map((d) => {
    const reach = support(w, h, d) + gap;
    return { x: p.x + d.x * reach, y: p.y + d.y * reach };
  });
}

const rectOf = (c: Vec, w: number, h: number): Rect => ({ cx: c.x, cy: c.y, w, h });

/** Overlap area of two rectangles. */
export function rectOverlap(a: Rect, b: Rect): number {
  const ox = Math.min(a.cx + a.w / 2, b.cx + b.w / 2) - Math.max(a.cx - a.w / 2, b.cx - b.w / 2);
  const oy = Math.min(a.cy + a.h / 2, b.cy + b.h / 2) - Math.max(a.cy - a.h / 2, b.cy - b.h / 2);
  return ox > 0 && oy > 0 ? ox * oy : 0;
}

/** Distance from a point to a rectangle (0 inside). */
function pointRectDistance(p: Vec, r: Rect): number {
  const dx = Math.max(Math.abs(p.x - r.cx) - r.w / 2, 0);
  const dy = Math.max(Math.abs(p.y - r.cy) - r.h / 2, 0);
  return Math.hypot(dx, dy);
}

function segmentsCross(p1: Vec, p2: Vec, q1: Vec, q2: Vec): boolean {
  const d = (a: Vec, b: Vec, c: Vec) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const d1 = d(q1, q2, p1);
  const d2 = d(q1, q2, p2);
  const d3 = d(p1, p2, q1);
  const d4 = d(p1, p2, q2);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

function pointSegmentDistance(p: Vec, a: Vec, b: Vec): number {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const len2 = vx * vx + vy * vy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / len2));
  return Math.hypot(p.x - (a.x + t * vx), p.y - (a.y + t * vy));
}

/** Distance from a segment to a rectangle (0 when they touch). */
export function segmentRectDistance(a: Vec, b: Vec, r: Rect): number {
  if (pointRectDistance(a, r) === 0 || pointRectDistance(b, r) === 0) return 0;
  const x0 = r.cx - r.w / 2;
  const x1 = r.cx + r.w / 2;
  const y0 = r.cy - r.h / 2;
  const y1 = r.cy + r.h / 2;
  const corners = [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ];
  for (let i = 0; i < 4; i += 1) {
    if (segmentsCross(a, b, corners[i], corners[(i + 1) % 4])) return 0;
  }
  return Math.min(
    pointRectDistance(a, r),
    pointRectDistance(b, r),
    ...corners.map((c) => pointSegmentDistance(c, a, b)),
  );
}

/** How badly a rectangle collides with an obstacle: 0 when clear, growing with depth. */
export function obstacleCost(rect: Rect, o: Obstacle): number {
  if (o.kind === 'rect') {
    const area = rectOverlap(rect, o.rect);
    return area > 0 ? o.weight * (1 + area / (rect.w * rect.h)) : 0;
  }
  const dist =
    o.kind === 'segment' ? segmentRectDistance(o.a, o.b, rect) : pointRectDistance(o.p, rect);
  return dist < o.r ? o.weight * (1 + (o.r - dist) / o.r) : 0;
}

function outside(rect: Rect, b: Bounds): number {
  const over =
    Math.max(0, b.x0 - (rect.cx - rect.w / 2)) +
    Math.max(0, rect.cx + rect.w / 2 - b.x1) +
    Math.max(0, b.y0 - (rect.cy - rect.h / 2)) +
    Math.max(0, rect.cy + rect.h / 2 - b.y1);
  return over > 0 ? 1 + over : 0;
}

/** Costs: preference rank is cheap, drawing collisions dear, label collisions and edges dearer. */
const RANK = 0.08;
const LABEL = 40;
const EDGE = 60;
/** An optional label whose best spot costs more than this is hidden. */
const HIDE = 2.5;

export function placeLabels(
  requests: readonly LabelRequest[],
  obstacles: readonly Obstacle[],
  bounds: Bounds,
): Map<string, Placement> {
  const placed: Rect[] = [];
  const result = new Map<string, Placement>();
  const order = [...requests].sort((a, b) => a.priority - b.priority);
  for (const req of order) {
    let best: { c: Vec; cost: number } | null = null;
    req.candidates.forEach((c, i) => {
      const rect = rectOf(c, req.w, req.h);
      let cost = i * RANK + outside(rect, bounds) * EDGE;
      for (const p of placed) {
        const area = rectOverlap(rect, p);
        if (area > 0) cost += LABEL * (1 + area / (req.w * req.h));
      }
      for (const o of obstacles) cost += obstacleCost(rect, o);
      if (!best || cost < best.cost - 1e-9) best = { c, cost };
    });
    if (!best) continue;
    const { c, cost } = best as { c: Vec; cost: number };
    const hidden = Boolean(req.optional) && cost > HIDE;
    result.set(req.id, { cx: c.x, cy: c.y, hidden });
    if (!hidden) placed.push(rectOf(c, req.w, req.h));
  }
  return result;
}

/** The rectangles actually occupied, for hiding tick labels underneath them. */
export function occupied(requests: readonly LabelRequest[], result: Map<string, Placement>): Rect[] {
  const out: Rect[] = [];
  for (const r of requests) {
    const p = result.get(r.id);
    if (p && !p.hidden) out.push({ cx: p.cx, cy: p.cy, w: r.w, h: r.h });
  }
  return out;
}
