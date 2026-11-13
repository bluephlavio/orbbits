/**
 * Angle marks in pixels: the arc and sector of an angle, the square of a right angle, and the
 * direction of a bisector (where the name of the angle goes). Directions are screen vectors
 * (y down). Pure, tested in tests/marks.test.ts.
 *
 * Copied, not imported, in right-triangle-trigonometry and vector-trigonometry-explorer.
 */
import type { Vec } from '../model/vec.ts';

const f = (v: number) => Math.round(v * 100) / 100;

export const unit = (v: Vec): Vec => {
  const len = Math.hypot(v.x, v.y);
  return len < 1e-12 ? { x: 1, y: 0 } : { x: v.x / len, y: v.y / len };
};

/** Positive when turning from u to v is clockwise on screen. */
const cross = (u: Vec, v: Vec) => u.x * v.y - u.y * v.x;

/**
 * The arc of radius r at `c` from direction u to direction v (both units), the short way round,
 * and the closed sector under it. Angles of 180° or more are not drawn (null).
 */
export function angleArc(c: Vec, u: Vec, v: Vec, r: number): { arc: string; sector: string } | null {
  const a = unit(u);
  const b = unit(v);
  const angle = Math.acos(Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y)));
  if (angle < 1e-4 || angle > Math.PI - 1e-4) return null;
  const sweep = cross(a, b) > 0 ? 1 : 0;
  const p = { x: c.x + a.x * r, y: c.y + a.y * r };
  const q = { x: c.x + b.x * r, y: c.y + b.y * r };
  const arc = `M${f(p.x)} ${f(p.y)}A${f(r)} ${f(r)} 0 0 ${sweep} ${f(q.x)} ${f(q.y)}`;
  const sector = `M${f(c.x)} ${f(c.y)}L${f(p.x)} ${f(p.y)}A${f(r)} ${f(r)} 0 0 ${sweep} ${f(q.x)} ${f(q.y)}Z`;
  return { arc, sector };
}

/** The bisector direction of the angle between u and v (unit vectors). */
export const bisector = (u: Vec, v: Vec): Vec => {
  const a = unit(u);
  const b = unit(v);
  const s = { x: a.x + b.x, y: a.y + b.y };
  return Math.hypot(s.x, s.y) < 1e-9 ? { x: -a.y, y: a.x } : unit(s);
};

/** The right-angle mark at `c` between directions u and v: a small square of side `size`. */
export function rightAngle(c: Vec, u: Vec, v: Vec, size: number): string {
  const a = unit(u);
  const b = unit(v);
  const p = { x: c.x + a.x * size, y: c.y + a.y * size };
  const q = { x: p.x + b.x * size, y: p.y + b.y * size };
  const r = { x: c.x + b.x * size, y: c.y + b.y * size };
  return `M${f(p.x)} ${f(p.y)}L${f(q.x)} ${f(q.y)}L${f(r.x)} ${f(r.y)}`;
}

/** Points along an arc, for the label placer (an arc is an obstacle). */
export function arcPoints(c: Vec, u: Vec, v: Vec, r: number, n = 5): Vec[] {
  const a = unit(u);
  const b = unit(v);
  const t0 = Math.atan2(a.y, a.x);
  let d = Math.atan2(b.y, b.x) - t0;
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return Array.from({ length: n }, (_, i) => {
    const t = t0 + (d * i) / (n - 1);
    return { x: c.x + r * Math.cos(t), y: c.y + r * Math.sin(t) };
  });
}
