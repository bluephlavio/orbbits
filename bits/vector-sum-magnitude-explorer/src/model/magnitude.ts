/**
 * The model of this Bit: moduli |a⃗|, |b⃗| and the angle α between the vectors (degrees, 0–180),
 * with a⃗ along the positive x direction from the common tail O and b⃗ turned by α. The three
 * special angles are exact: cos 90° is 0 here, not 6e-17, so 90° is Pythagoras and nothing else.
 * Pure, tested in tests/model.test.ts.
 */
import { add, clean, EPS, length, vec } from './vec.ts';
import type { Vec } from './vec.ts';

export interface Config {
  /** |a⃗| */
  a: number;
  /** |b⃗| */
  b: number;
  /** α in degrees, 0 ≤ α ≤ 180. */
  alpha: number;
}

export const MOD_MIN = 0.5;
export const MOD_MAX = 5;
export const MOD_STEP = 0.5;
export const INITIAL: Config = { a: 4, b: 3, alpha: 60 };

export const mixConfig = (x: Config, y: Config, t: number): Config => ({
  a: x.a + (y.a - x.a) * t,
  b: x.b + (y.b - x.b) * t,
  alpha: x.alpha + (y.alpha - x.alpha) * t,
});

/** cos and sin of an angle in degrees, exact at multiples of 90°. */
export function cosSinDeg(deg: number): [number, number] {
  const q = deg / 90;
  if (Math.abs(q - Math.round(q)) < EPS) {
    const k = ((Math.round(q) % 4) + 4) % 4;
    return ([[1, 0], [0, 1], [-1, 0], [0, -1]] as const)[k] as [number, number];
  }
  const r = (deg * Math.PI) / 180;
  return [clean(Math.cos(r)), clean(Math.sin(r))];
}

export const vectorA = (c: Config): Vec => vec(c.a, 0);

export function vectorB(c: Config): Vec {
  const [cos, sin] = cosSinDeg(c.alpha);
  return vec(c.b * cos, c.b * sin);
}

export const sumOf = (c: Config): Vec => add(vectorA(c), vectorB(c));

export type Case = 'concordant' | 'perpendicular' | 'discordant' | 'general';

/** The special cases are exact angles; 89° is the general case. */
export function caseOf(alpha: number): Case {
  if (Math.abs(alpha) < EPS) return 'concordant';
  if (Math.abs(alpha - 90) < EPS) return 'perpendicular';
  if (Math.abs(alpha - 180) < EPS) return 'discordant';
  return 'general';
}

/**
 * |a⃗ + b⃗|: by the elementary rule in the three special cases, from the components otherwise
 * (the same number the diagram is drawn from).
 */
export function sumModulus(c: Config): number {
  switch (caseOf(c.alpha)) {
    case 'concordant':
      return clean(c.a + c.b);
    case 'discordant':
      return clean(Math.abs(c.a - c.b));
    case 'perpendicular':
      return clean(Math.sqrt(c.a * c.a + c.b * c.b));
    default:
      return clean(length(sumOf(c)));
  }
}

/** ||a⃗| − |b⃗|| ≤ |a⃗ + b⃗| ≤ |a⃗| + |b⃗|. */
export const range = (c: Config): [number, number] => [clean(Math.abs(c.a - c.b)), clean(c.a + c.b)];

/** The cosine rule, for the optional deepening and for the tests. */
export const cosineRule = (c: Config): number =>
  Math.sqrt(Math.max(0, c.a * c.a + c.b * c.b + 2 * c.a * c.b * cosSinDeg(c.alpha)[0]));

/** α from a direction (for dragging the tip of b⃗): above the line of a⃗ only, 0–180. */
export function alphaOf(p: Vec): number {
  if (Math.abs(p.x) < EPS && Math.abs(p.y) < EPS) return 0;
  if (p.y <= 0) return p.x >= 0 ? 0 : 180;
  return (Math.atan2(p.y, p.x) * 180) / Math.PI;
}

/** Whole degrees, pulled onto 0°, 90° and 180° within `magnet` degrees. */
export function snapAlpha(alpha: number, magnet = 3): number {
  const whole = Math.min(180, Math.max(0, Math.round(alpha)));
  for (const special of [0, 90, 180]) if (Math.abs(alpha - special) <= magnet) return special;
  return whole;
}

export const snapModulus = (m: number): number =>
  Math.min(MOD_MAX, Math.max(MOD_MIN, Math.round(m / MOD_STEP) * MOD_STEP));
