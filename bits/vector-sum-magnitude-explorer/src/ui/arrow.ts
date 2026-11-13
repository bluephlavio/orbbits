/**
 * Arrow geometry in pixels. The apex of the head is exactly the tip, and the shaft stops inside
 * the head, so a thick stroke never pokes past the point the vector ends at. Short arrows get a
 * proportionally smaller head; a zero-length arrow is a point. Pure, tested.
 */
import type { Vec } from '../model/vec.ts';

export interface ArrowShape {
  /** Shaft from the tail to the back of the head; null when the head covers it all. */
  shaft: readonly [Vec, Vec] | null;
  /** Closed path of the head; null for a zero-length arrow. */
  head: string | null;
  /** The arrow has no length: draw it as a point at `tail`. */
  point: boolean;
  /** Unit direction and left normal in screen coordinates (y down). */
  u: Vec;
  n: Vec;
  length: number;
}

const f = (v: number) => Math.round(v * 100) / 100;

/** `width` is the stroke width; the head scales with it, as in hand-drawn diagrams. */
export function arrowShape(tail: Vec, tip: Vec, width: number): ArrowShape {
  const dx = tip.x - tail.x;
  const dy = tip.y - tail.y;
  const length = Math.hypot(dx, dy);
  if (length < 0.75) {
    return { shaft: null, head: null, point: true, u: { x: 1, y: 0 }, n: { x: 0, y: -1 }, length };
  }
  const u = { x: dx / length, y: dy / length };
  const n = { x: u.y, y: -u.x }; // left of the direction of travel, on screen
  const full = 4.2 * width + 6;
  const L = Math.min(full, length * 0.6);
  const W = L * 0.4;
  const notch = L * 0.2;
  const at = (back: number, side: number) => ({
    x: tip.x - u.x * back + n.x * side,
    y: tip.y - u.y * back + n.y * side,
  });
  const left = at(L, W);
  const inner = at(L - notch, 0);
  const right = at(L, -W);
  const head = `M${f(tip.x)} ${f(tip.y)}L${f(left.x)} ${f(left.y)}L${f(inner.x)} ${f(inner.y)}L${f(right.x)} ${f(right.y)}Z`;
  // The shaft ends a little inside the head so that no seam shows between them.
  const end = at(L - notch - 0.5, 0);
  const shaft = length - (L - notch) > 0.5 ? ([tail, end] as const) : null;
  return { shaft, head, point: false, u, n, length };
}

/** Moves a segment sideways by `d` pixels along its left normal: parallel tracks. */
export function offsetSegment(a: Vec, b: Vec, d: number): [Vec, Vec] {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  if (len < 1e-9 || d === 0) return [a, b];
  const nx = (b.y - a.y) / len;
  const ny = -(b.x - a.x) / len;
  return [
    { x: a.x + nx * d, y: a.y + ny * d },
    { x: b.x + nx * d, y: b.y + ny * d },
  ];
}

/**
 * The side on which a coincident arrow is moved: up for (nearly) horizontal arrows, right for
 * the others, whatever their sense, so stacked arrows always stack the same way.
 */
export function trackNormal(a: Vec, b: Vec): Vec {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  if (len < 1e-9) return { x: 0, y: -1 };
  let n = { x: (b.y - a.y) / len, y: -(b.x - a.x) / len };
  const horizontal = Math.abs(b.x - a.x) >= Math.abs(b.y - a.y);
  if ((horizontal && n.y > 0) || (!horizontal && n.x < 0)) n = { x: -n.x, y: -n.y };
  return n;
}

export interface TrackItem {
  key: string;
  seg: readonly [Vec, Vec];
  width: number;
}

/**
 * Coincident arrows on parallel tracks. Items come in priority order; an item that lies on a
 * line already drawn and overlaps it is moved sideways just enough to clear it (repeatedly, if
 * the new track is taken too). Returns the segment to draw for each key.
 */
export function stackTracks(items: readonly TrackItem[], gap = 5): Map<string, [Vec, Vec]> {
  const out = new Map<string, [Vec, Vec]>();
  const placed: { seg: [Vec, Vec]; width: number }[] = [];
  for (const item of items) {
    const [a, b] = item.seg;
    let seg: [Vec, Vec] = [a, b];
    if (Math.hypot(b.x - a.x, b.y - a.y) >= 1) {
      const n = trackNormal(a, b);
      for (let tries = 0; tries < 4; tries += 1) {
        const hit = placed.find((p) =>
          collinearOverlap(p.seg, seg, (p.width + item.width) / 2 + 1),
        );
        if (!hit) break;
        const at = (hit.seg[0].x - a.x) * n.x + (hit.seg[0].y - a.y) * n.y;
        const d = at + (hit.width + item.width) / 2 + gap;
        seg = [
          { x: a.x + n.x * d, y: a.y + n.y * d },
          { x: b.x + n.x * d, y: b.y + n.y * d },
        ];
      }
    }
    out.set(item.key, seg);
    placed.push({ seg, width: item.width });
  }
  return out;
}

/**
 * Whether two pixel segments lie on the same line and share more than `minOverlap` pixels:
 * the case in which the lower one must be drawn on a parallel track to stay visible.
 */
export function collinearOverlap(
  a: readonly [Vec, Vec],
  b: readonly [Vec, Vec],
  tolerance = 2.5,
  minOverlap = 4,
): boolean {
  const [p, q] = a;
  const len = Math.hypot(q.x - p.x, q.y - p.y);
  if (len < 1e-6) return false;
  const u = { x: (q.x - p.x) / len, y: (q.y - p.y) / len };
  const off = (r: Vec) => Math.abs((r.x - p.x) * u.y - (r.y - p.y) * u.x);
  if (off(b[0]) > tolerance || off(b[1]) > tolerance) return false;
  const t0 = (b[0].x - p.x) * u.x + (b[0].y - p.y) * u.y;
  const t1 = (b[1].x - p.x) * u.x + (b[1].y - p.y) * u.y;
  const lo = Math.max(0, Math.min(t0, t1));
  const hi = Math.min(len, Math.max(t0, t1));
  return hi - lo > minOverlap;
}
