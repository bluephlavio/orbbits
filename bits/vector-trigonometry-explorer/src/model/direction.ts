/**
 * The one model of this Bit: a vector v⃗ drawn from the origin to its tip P = (v_x, v_y), read
 * in two directions with the same right triangle O–H–P, H = (v_x, 0).
 *
 *   from modulus and direction:  |v_x| = |v⃗|·cos β,  |v_y| = |v⃗|·sen β,  signs from the quadrant
 *   from the components:         |v⃗| = √(v_x² + v_y²),  β = tan⁻¹(|v_y| / |v_x|),  quadrant from signs
 *
 * β is the *reference angle*: the acute angle between v⃗ and the nearer half of the x-axis. No
 * angle above 90° is ever given to sen, cos or tan, so nothing here needs the unit circle; in
 * the first quadrant β is the angle α with the positive x half-axis. Vectors on an axis and the
 * zero vector have no triangle and are cases of their own, never a division by zero.
 * Pure, tested in tests/model.test.ts.
 */
import { clamp, clean, EPS, sign, snap, vec } from './vec.ts';
import type { Vec } from './vec.ts';

export type Quadrant = 1 | 2 | 3 | 4;

/** Modulus and direction: the reference angle β (degrees, acute) and the quadrant. */
export interface Polar {
  mod: number;
  angle: number;
  quadrant: Quadrant;
}

export const ANGLE_MIN = 1;
export const ANGLE_MAX = 89;
export const MOD_MIN = 0.5;

export const ROMAN: Record<Quadrant, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };

const rad = (deg: number) => (deg * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/** sen and cos of an acute angle in degrees, without floating-point noise. */
export const sinDeg = (d: number): number => clean(Math.sin(rad(d)));
export const cosDeg = (d: number): number => clean(Math.cos(rad(d)));

/** The signs of the components in a quadrant: they come from the axes, not from the triangle. */
export function signsOf(q: Quadrant): { x: 1 | -1; y: 1 | -1 } {
  return { x: q === 1 || q === 4 ? 1 : -1, y: q === 1 || q === 2 ? 1 : -1 };
}

/** The quadrant of a point strictly inside one, or null on an axis. */
export function quadrantOf(v: Vec): Quadrant | null {
  const sx = sign(v.x);
  const sy = sign(v.y);
  if (sx === 0 || sy === 0) return null;
  if (sx > 0) return sy > 0 ? 1 : 4;
  return sy > 0 ? 2 : 3;
}

/** The tip from modulus and direction: lengths from the triangle, signs from the quadrant. */
export function tipOf(p: Polar): Vec {
  const s = signsOf(p.quadrant);
  return vec(s.x * p.mod * cosDeg(p.angle), s.y * p.mod * sinDeg(p.angle));
}

export type Analysis =
  | { kind: 'zero' }
  | { kind: 'axis'; axis: 'x' | 'y'; sense: 1 | -1; mod: number }
  | {
      kind: 'quadrant';
      quadrant: Quadrant;
      mod: number;
      /** The reference angle in degrees, strictly between 0° and 90°. */
      angle: number;
      /** |v_y| / |v_x|: the tangent of the reference angle (never a signed ratio). */
      ratio: number;
    };

/** What the components say about the vector: modulus, reference angle, quadrant, or a case. */
export function analyse(v: Vec): Analysis {
  const sx = sign(v.x);
  const sy = sign(v.y);
  if (sx === 0 && sy === 0) return { kind: 'zero' };
  if (sy === 0) return { kind: 'axis', axis: 'x', sense: sx as 1 | -1, mod: clean(Math.abs(v.x)) };
  if (sx === 0) return { kind: 'axis', axis: 'y', sense: sy as 1 | -1, mod: clean(Math.abs(v.y)) };
  const ratio = Math.abs(v.y) / Math.abs(v.x);
  return {
    kind: 'quadrant',
    quadrant: quadrantOf(v)!,
    mod: clean(Math.hypot(v.x, v.y)),
    angle: clean(deg(Math.atan(ratio))),
    ratio: clean(ratio),
  };
}

/** Modulus and direction of a vector inside a quadrant; null on an axis or for the zero vector. */
export function polarOf(v: Vec): Polar | null {
  const a = analyse(v);
  return a.kind === 'quadrant' ? { mod: a.mod, angle: a.angle, quadrant: a.quadrant } : null;
}

/**
 * The data of the 'polar' mode read back from the tip: modulus and angle are multiples of 0.1
 * there (the tip is computed from them), so rounding removes only the trigonometric noise.
 */
export function givenPolar(v: Vec): Polar | null {
  const p = polarOf(v);
  return p && { mod: snap(p.mod, 0.1), angle: snap(p.angle, 0.1), quadrant: p.quadrant };
}

/**
 * What the calculator's tan⁻¹ key gives for v_y / v_x, in degrees: a signed angle between −90°
 * and 90° that cannot tell (−3; 4) from (3; −4). Only for the remark; null when v_x = 0.
 */
export function calculatorAngle(v: Vec): number | null {
  if (sign(v.x) === 0) return null;
  return clean(deg(Math.atan(v.y / v.x)));
}

export interface SnapOptions {
  /** Degrees for the angle (1, or 0.1 with Shift). */
  angleStep: number;
  /** Units for the modulus. */
  modStep: number;
  /** Only the first quadrant is allowed. */
  first: boolean;
  /** Largest modulus that keeps the tip on stage. */
  maxMod: number;
}

/**
 * Dragging the tip in the "modulus and direction" mode: the pointer gives the quadrant, the
 * reference angle (snapped, kept acute) and the modulus (snapped). With `first`, the angle is
 * the angle with the positive x half-axis, clamped to the first quadrant.
 */
export function polarFromPointer(p: Vec, o: SnapOptions): Polar {
  const mod = clamp(snap(Math.hypot(p.x, p.y), o.modStep), MOD_MIN, Math.max(MOD_MIN, o.maxMod));
  if (o.first) {
    const raw = deg(Math.atan2(p.y, p.x));
    // Below the positive x half-axis the angle is clamped to the bottom; on the left, to the top.
    const a = raw < -90 ? ANGLE_MAX : raw;
    return { mod, angle: clamp(snap(a, o.angleStep), ANGLE_MIN, ANGLE_MAX), quadrant: 1 };
  }
  const quadrant: Quadrant = p.x >= 0 ? (p.y >= 0 ? 1 : 4) : p.y >= 0 ? 2 : 3;
  const angle = deg(Math.atan2(Math.abs(p.y), Math.max(Math.abs(p.x), EPS)));
  return { mod, angle: clamp(snap(angle, o.angleStep), ANGLE_MIN, ANGLE_MAX), quadrant };
}

/** Normalises typed or snapped polar data: modulus to tenths, angle to tenths of a degree. */
export function normalisePolar(p: Polar, maxMod: number): Polar {
  return {
    mod: clamp(snap(p.mod, 0.1), MOD_MIN, Math.max(MOD_MIN, maxMod)),
    angle: clamp(snap(p.angle, 0.1), ANGLE_MIN, ANGLE_MAX),
    quadrant: p.quadrant,
  };
}

/**
 * Entering the "modulus and direction" mode from any tip: the nearest vector with round data
 * (modulus to tenths, angle to tenths of a degree) inside a quadrant. A vector on an axis moves
 * by one degree into a quadrant; the zero vector becomes `fallback`.
 */
export function toPolar(v: Vec, first: boolean, maxMod: number, fallback: Polar): Polar {
  const a = analyse(v);
  if (a.kind === 'zero') return fallback;
  if (a.kind === 'axis') {
    const quadrant: Quadrant =
      a.axis === 'x' ? (a.sense > 0 ? 1 : 2) : a.sense > 0 ? 1 : 4;
    return normalisePolar(
      { mod: a.mod, angle: a.axis === 'x' ? ANGLE_MIN : ANGLE_MAX, quadrant: first ? 1 : quadrant },
      maxMod,
    );
  }
  return normalisePolar({ mod: a.mod, angle: a.angle, quadrant: first ? 1 : a.quadrant }, maxMod);
}

/** Entering the "components" mode: the tip on the grid of tenths (and in the first quadrant). */
export function toCartesian(v: Vec, first: boolean): Vec {
  const x = snap(v.x, 0.1);
  const y = snap(v.y, 0.1);
  return first ? vec(Math.abs(x), Math.abs(y)) : vec(x, y);
}

/** Restricting to the first quadrant mirrors the tip there: the same triangle, positive legs. */
export const intoFirst = (v: Vec): Vec => vec(Math.abs(v.x), Math.abs(v.y));

export const mixTip = (a: Vec, b: Vec, t: number): Vec => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

export const INITIAL_POLAR: Polar = { mod: 6, angle: 35, quadrant: 1 };
export const INITIAL: Vec = tipOf(INITIAL_POLAR);
