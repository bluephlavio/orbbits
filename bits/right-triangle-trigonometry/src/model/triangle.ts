/**
 * The one geometric model of this Bit: a right triangle ABC with the right angle in C, the
 * acute angle α in A and β = 90° − α in B. It is given by α (degrees) and the hypotenuse AB;
 * the legs follow. A sits at the origin and AC lies along the positive x direction, so
 *
 *   A = (0, 0),   C = (AB·cos α, 0),   B = (AB·cos α, AB·sen α).
 *
 * Which leg is "opposite" and which "adjacent" is not a property of the triangle but of the
 * reference angle (α or β): `roles` says it. Pure, tested in tests/model.test.ts.
 */
import { clamp, clean, EPS, snap, vec } from './vec.ts';
import type { Vec } from './vec.ts';

export interface Triangle {
  /** The acute angle in A, in degrees, strictly between 0° and 90°. */
  alpha: number;
  /** The hypotenuse AB. */
  hyp: number;
}

/** The acute angle the ratios refer to: α in A or β in B. */
export type Reference = 'alpha' | 'beta';

export type Side = 'AB' | 'BC' | 'AC';
export type Role = 'hyp' | 'opp' | 'adj';

/** Acute angles only: a right triangle with a 0° or 90° angle is not a triangle. */
export const ALPHA_MIN = 1;
export const ALPHA_MAX = 89;
export const HYP_MIN = 1;
/** B stays inside the square [0, BOX] × [0, BOX], so the triangle always fits the stage. */
export const BOX = 10;

/** The similar copies drawn inside the triangle, as scale factors of ABC. */
export const COPY_SCALES = [0.5, 0.75] as const;

export const INITIAL: Triangle = { alpha: 35, hyp: 10 };

const rad = (deg: number) => (deg * Math.PI) / 180;

/** sen and cos of an acute angle in degrees, without floating-point noise (sen 30° = 0,5). */
export const sinDeg = (deg: number): number => clean(Math.sin(rad(deg)));
export const cosDeg = (deg: number): number => clean(Math.cos(rad(deg)));

/** The longest hypotenuse that keeps B inside the box, for this angle (multiple of 0.1). */
export const maxHyp = (alpha: number): number =>
  Math.floor((BOX / Math.max(cosDeg(alpha), sinDeg(alpha))) * 10 + 1e-6) / 10;

/** Clamps a triangle to the acute range and the box; angles to 0.1°, lengths to 0.1. */
export function normalise(t: Triangle): Triangle {
  const alpha = clamp(snap(t.alpha, 0.1), ALPHA_MIN, ALPHA_MAX);
  const hyp = clamp(snap(t.hyp, 0.1), HYP_MIN, maxHyp(alpha));
  return { alpha, hyp };
}

export const beta = (t: Triangle): number => clean(90 - t.alpha);

export const referenceAngle = (t: Triangle, ref: Reference): number =>
  ref === 'alpha' ? t.alpha : beta(t);

/** Lengths of the three sides. */
export function sides(t: Triangle): Record<Side, number> {
  return {
    AB: t.hyp,
    BC: clean(t.hyp * sinDeg(t.alpha)),
    AC: clean(t.hyp * cosDeg(t.alpha)),
  };
}

/** The side playing each role for the reference angle: the legs swap, the hypotenuse stays. */
export function roles(ref: Reference): Record<Role, Side> {
  return ref === 'alpha'
    ? { hyp: 'AB', opp: 'BC', adj: 'AC' }
    : { hyp: 'AB', opp: 'AC', adj: 'BC' };
}

/** The role a side plays for the reference angle. */
export function roleOf(side: Side, ref: Reference): Role {
  const r = roles(ref);
  return side === r.hyp ? 'hyp' : side === r.opp ? 'opp' : 'adj';
}

export interface Ratios {
  /** opposite / hypotenuse */
  sin: number;
  /** adjacent / hypotenuse */
  cos: number;
  /** opposite / adjacent */
  tan: number;
}

/**
 * The three ratios of the reference angle, from the angle itself: they do not depend on the
 * size of the triangle, which is the point of the Bit (tests check them against the sides).
 */
export function ratios(t: Triangle, ref: Reference): Ratios {
  const angle = referenceAngle(t, ref);
  const s = sinDeg(angle);
  const c = cosDeg(angle);
  return { sin: s, cos: c, tan: clean(s / c) };
}

/** The same ratios measured on the sides of a triangle: opposite/hyp, adjacent/hyp, opp/adj. */
export function measuredRatios(lengths: Record<Side, number>, ref: Reference): Ratios {
  const r = roles(ref);
  return {
    sin: clean(lengths[r.opp] / lengths[r.hyp]),
    cos: clean(lengths[r.adj] / lengths[r.hyp]),
    tan: clean(lengths[r.opp] / lengths[r.adj]),
  };
}

/** Vertices in the plane of the drawing (units of the grid). */
export function vertices(t: Triangle, k = 1): { A: Vec; B: Vec; C: Vec } {
  const s = sides(t);
  return { A: vec(0, 0), B: vec(s.AC * k, s.BC * k), C: vec(s.AC * k, 0) };
}

/** A similar copy: the same angles, every side multiplied by k. */
export const scaled = (t: Triangle, k: number): Record<Side, number> => {
  const s = sides(t);
  return { AB: clean(s.AB * k), BC: clean(s.BC * k), AC: clean(s.AC * k) };
};

/** Dragging B: both the angle and the size follow the pointer (snapped). */
export function fromVertexB(p: Vec, angleStep: number, lengthStep: number): Triangle {
  const x = Math.max(p.x, EPS);
  const y = Math.max(p.y, EPS);
  const alpha = clamp(snap((Math.atan2(y, x) * 180) / Math.PI, angleStep), ALPHA_MIN, ALPHA_MAX);
  const hyp = clamp(snap(Math.hypot(x, y), lengthStep), HYP_MIN, maxHyp(alpha));
  return { alpha, hyp };
}

/** Dragging C along the base: the angle stays, the triangle grows or shrinks (similar). */
export function fromVertexC(t: Triangle, x: number, lengthStep: number): Triangle {
  const hyp = clamp(snap(Math.max(x, 0) / cosDeg(t.alpha), lengthStep), HYP_MIN, maxHyp(t.alpha));
  return { alpha: t.alpha, hyp };
}

export const mixTriangle = (a: Triangle, b: Triangle, t: number): Triangle => ({
  alpha: a.alpha + (b.alpha - a.alpha) * t,
  hyp: a.hyp + (b.hyp - a.hyp) * t,
});

/** α = 45°: the legs are equal (within the precision of the state). */
export const isIsosceles = (t: Triangle): boolean => Math.abs(t.alpha - 45) < EPS;
