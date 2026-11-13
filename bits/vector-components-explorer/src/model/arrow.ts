/**
 * The one geometric model of this Bit: an arrow from tail A to tip B representing the free
 * vector v⃗ = B − A. Everything else (components, projections, the case notes) derives from it.
 * Pure, tested in tests/model.test.ts.
 */
import { add, length, sign, sub, vec } from './vec.ts';
import type { Vec } from './vec.ts';

export interface ArrowState {
  /** Tail. */
  A: Vec;
  /** Tip. */
  B: Vec;
}

export type Construction = 'tip-to-tail' | 'common-tail';

/** Tail away from the origin, so that B's coordinates are visibly not the components. */
export const INITIAL: ArrowState = { A: vec(1, 1), B: vec(5, 4) };

/** v⃗ = (v_x, v_y) = (x_B − x_A, y_B − y_A). */
export const componentsOf = (s: ArrowState): Vec => sub(s.B, s.A);

export const magnitude = (s: ArrowState): number => length(componentsOf(s));

/** Rigid translation: a new tail, the same vector. */
export const translateTo = (s: ArrowState, A: Vec): ArrowState => ({
  A,
  B: add(A, componentsOf(s)),
});

/** The same tail, a new vector. */
export const withComponents = (s: ArrowState, v: Vec): ArrowState => ({ A: s.A, B: add(s.A, v) });

export const mixArrow = (a: ArrowState, b: ArrowState, t: number): ArrowState => ({
  A: { x: a.A.x + (b.A.x - a.A.x) * t, y: a.A.y + (b.A.y - a.A.y) * t },
  B: { x: a.B.x + (b.B.x - a.B.x) * t, y: a.B.y + (b.B.y - a.B.y) * t },
});

/**
 * Where the vector components are drawn: always at the arrow, never only "on the axis", so the
 * picture stays right wherever the tail is. Tip-to-tail: A → C → B with C = (x_B, y_A), the
 * right triangle of v⃗ = v⃗_x + v⃗_y. Common tail: both from A, the rectangle with diagonal v⃗.
 */
export function componentSegments(s: ArrowState, construction: Construction) {
  const corner = vec(s.B.x, s.A.y);
  return {
    x: [s.A, corner] as [Vec, Vec],
    y:
      construction === 'tip-to-tail'
        ? ([corner, s.B] as [Vec, Vec])
        : ([s.A, vec(s.A.x, s.B.y)] as [Vec, Vec]),
  };
}

/** Feet of the perpendiculars from A and B on each axis: the projected segments. */
export const projections = (s: ArrowState) => ({
  x: [vec(s.A.x, 0), vec(s.B.x, 0)] as [Vec, Vec],
  y: [vec(0, s.A.y), vec(0, s.B.y)] as [Vec, Vec],
});

export type Situation =
  | { kind: 'zero' }
  | { kind: 'axis'; axis: 'x' | 'y' }
  | { kind: 'quadrant'; quadrant: 1 | 2 | 3 | 4 };

/** Where v⃗ points, by the signs of its components (with zero meaning |·| < EPS). */
export function situation(v: Vec): Situation {
  const sx = sign(v.x);
  const sy = sign(v.y);
  if (sx === 0 && sy === 0) return { kind: 'zero' };
  if (sy === 0) return { kind: 'axis', axis: 'x' };
  if (sx === 0) return { kind: 'axis', axis: 'y' };
  if (sx > 0) return { kind: 'quadrant', quadrant: sy > 0 ? 1 : 4 };
  return { kind: 'quadrant', quadrant: sy > 0 ? 2 : 3 };
}
