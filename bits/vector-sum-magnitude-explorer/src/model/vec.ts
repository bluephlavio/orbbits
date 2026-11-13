/**
 * Plane vectors as immutable pairs. Pure, no DOM: the diagram and every number on screen are
 * computed from these functions, so the drawing and the readouts cannot disagree.
 *
 * Copied, not imported, in each vector Bit (Bits import only from their own src/).
 */
export interface Vec {
  readonly x: number;
  readonly y: number;
}

/** Below this, a coordinate is zero. State values are multiples of 0.1, so this is generous. */
export const EPS = 1e-9;

/** Removes floating-point noise: 0.30000000000000004 → 0.3, −0 and 1e-17 → 0. */
export const clean = (n: number): number => {
  const r = Math.round(n * 1e9) / 1e9;
  return r === 0 ? 0 : r;
};

export const vec = (x: number, y: number): Vec => ({ x: clean(x), y: clean(y) });
export const ZERO: Vec = { x: 0, y: 0 };

export const add = (a: Vec, b: Vec): Vec => vec(a.x + b.x, a.y + b.y);
export const sub = (a: Vec, b: Vec): Vec => vec(a.x - b.x, a.y - b.y);
export const scale = (a: Vec, k: number): Vec => vec(a.x * k, a.y * k);
export const neg = (a: Vec): Vec => scale(a, -1);
export const dot = (a: Vec, b: Vec): number => a.x * b.x + a.y * b.y;
export const cross = (a: Vec, b: Vec): number => a.x * b.y - a.y * b.x;
export const length = (a: Vec): number => Math.hypot(a.x, a.y);
export const isZero = (a: Vec, eps = EPS): boolean => Math.abs(a.x) < eps && Math.abs(a.y) < eps;
export const equal = (a: Vec, b: Vec, eps = EPS): boolean => isZero(sub(a, b), eps);
export const lerp = (a: Vec, b: Vec, t: number): Vec => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

/** −1, 0 or 1, with zero meaning |n| < EPS. */
export const sign = (n: number): -1 | 0 | 1 => (Math.abs(n) < EPS ? 0 : n > 0 ? 1 : -1);

/** Rounds to a multiple of `step` (0.1, 0.5, 1…) without leaving floating-point noise. */
export const snap = (n: number, step: number): number => clean(Math.round(n / step) * step);
export const snapVec = (a: Vec, step: number): Vec => vec(snap(a.x, step), snap(a.y, step));

export const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));
