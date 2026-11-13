/**
 * The model of this Bit: two vectors a⃗, b⃗ applied at a common tail P, a scalar k, and the
 * constructions of a⃗ + b⃗, a⃗ − b⃗ and k a⃗ as lists of arrows. The diagram draws exactly these
 * pieces, and the readouts compute from the same functions. Pure, tested in tests/model.test.ts.
 *
 * Constructions can be seen together: the tip-to-tail copy is always there for a sum, and the
 * parallelogram of a⃗ and b⃗ is a light auxiliary layer on top, for the sum (its diagonal is
 * a⃗ + b⃗) and for the difference (its other diagonal, from the tip of b⃗ to the tip of a⃗, is
 * a⃗ − b⃗). Transitions are part of the model as numbers in [0, 1] (Motion); the UI tweens them.
 */
import { add, clean, cross, length, scale, sign, sub, vec } from './vec.ts';
import type { Vec } from './vec.ts';

export interface Vectors {
  /** Common tail of a⃗ and b⃗. */
  P: Vec;
  a: Vec;
  b: Vec;
  k: number;
}

export type Operation = 'sum' | 'difference' | 'scalar';
export type SumOrder = 'ab' | 'ba';
export type DiffMode = 'opposite' | 'tips';

export const INITIAL: Vectors = { P: vec(0, 0), a: vec(4, 1), b: vec(1, 3), k: 1.5 };
export const K_MIN = -3;
export const K_MAX = 3;

export const mixVectors = (x: Vectors, y: Vectors, t: number): Vectors => ({
  P: { x: x.P.x + (y.P.x - x.P.x) * t, y: x.P.y + (y.P.y - x.P.y) * t },
  a: { x: x.a.x + (y.a.x - x.a.x) * t, y: x.a.y + (y.a.y - x.a.y) * t },
  b: { x: x.b.x + (y.b.x - x.b.x) * t, y: x.b.y + (y.b.y - x.b.y) * t },
  k: x.k + (y.k - x.k) * t,
});

/** The vector each operation produces. */
export function resultOf(s: Vectors, op: Operation): Vec {
  if (op === 'sum') return add(s.a, s.b);
  if (op === 'difference') return sub(s.a, s.b);
  return scale(s.a, s.k);
}

/** Where the copies are, in [0, 1]: 0 = on their original (hidden), 1 = in place. */
export interface Motion {
  /** Copy of b⃗ travelling from P to the tip of a⃗ (a⃗ + b⃗). */
  copyB: number;
  /** Copy of a⃗ travelling from P to the tip of b⃗ (b⃗ + a⃗). */
  copyA: number;
  /** The parallelogram: dashed sides, shading, the diagonals of the difference. */
  fill: number;
  /** b⃗ turning into −b⃗ through the zero vector: −b⃗ is drawn as (1 − 2·flip) b⃗. */
  flip: number;
  /** Copy of −b⃗ travelling from P to the tip of a⃗. */
  negShift: number;
  /** Tail of a⃗ − b⃗ travelling from P to the tip of b⃗. */
  resShift: number;
}

export const REST: Motion = { copyB: 0, copyA: 0, fill: 0, flip: 0, negShift: 0, resShift: 0 };

export interface Construction {
  order: SumOrder;
  diff: DiffMode;
  parallelogram: boolean;
}

export function motionFor(op: Operation, c: Construction): Motion {
  const fill = c.parallelogram && op !== 'scalar' ? 1 : 0;
  if (op === 'sum') {
    return { ...REST, copyB: c.order === 'ab' ? 1 : 0, copyA: c.order === 'ba' ? 1 : 0, fill };
  }
  if (op === 'difference') {
    return c.diff === 'opposite'
      ? { ...REST, flip: 1, negShift: 1, fill }
      : { ...REST, resShift: 1, fill };
  }
  return REST;
}

export const mixMotion = (x: Motion, y: Motion, t: number): Motion => {
  const out = { ...x };
  for (const key of Object.keys(x) as (keyof Motion)[]) out[key] = x[key] + (y[key] - x[key]) * t;
  return out;
};

/**
 * original: a⃗, b⃗ · copy: a translated original (same key, same name) · opposite: −b⃗ ·
 * result: the vector the operation produces · secondary: a⃗ + b⃗ seen as a diagonal while the
 * operation is the difference.
 */
export type Role = 'original' | 'copy' | 'opposite' | 'result' | 'secondary';

/**
 * Keys of the objects that formulas and pointers refer to: the vectors, the result, the other
 * diagonal, and the two directions of the Cartesian reading.
 */
export type Key = 'a' | 'b' | 'nb' | 'r' | 'sd' | 'x' | 'y';

export interface Piece {
  id: string;
  key: Key;
  role: Role;
  tail: Vec;
  tip: Vec;
  /** TeX of its name; copies carry the name of the vector they copy. */
  tex: string;
  /** Opacity factor while it appears (1 when absent). */
  fade?: number;
}

/** Below this a moving copy is still on its original, or a fading piece is gone. */
const VISIBLE = 0.02;

/** The parallelogram has no area: a⃗ ∥ b⃗, or one of them is the zero vector. */
export const degenerate = (s: Vectors): boolean => Math.abs(cross(s.a, s.b)) < 1e-9;

/** The arrows of a construction, bottom to top. */
export function pieces(s: Vectors, op: Operation, m: Motion): Piece[] {
  const { P, a, b } = s;
  const at = (tail: Vec, v: Vec) => ({ tail, tip: add(tail, v) });
  const out: Piece[] = [];
  const A = { id: 'a', key: 'a' as const, role: 'original' as const, ...at(P, a), tex: '\\vec a' };
  if (op === 'scalar') {
    out.push(A);
    out.push({ id: 'ka', key: 'r', role: 'result', ...at(P, scale(a, s.k)), tex: 'k\\,\\vec a' });
    return out;
  }
  const B = { id: 'b', key: 'b' as const, role: 'original' as const, ...at(P, b), tex: '\\vec b' };
  if (op === 'sum') {
    if (m.copyB > VISIBLE) {
      out.push({ id: 'b-copy', key: 'b', role: 'copy', ...at(add(P, scale(a, m.copyB)), b), tex: '\\vec b' });
    }
    if (m.copyA > VISIBLE) {
      out.push({ id: 'a-copy', key: 'a', role: 'copy', ...at(add(P, scale(b, m.copyA)), a), tex: '\\vec a' });
    }
    out.push(A, B);
    out.push({ id: 'sum', key: 'r', role: 'result', ...at(P, add(a, b)), tex: '\\vec a + \\vec b' });
    return out;
  }
  // Two stages on one parameter pair: first b⃗ turns into −b⃗, then the copy travels; going
  // back, the copy returns first. (flip and negShift move together in the tween.)
  const flip = Math.min(1, 2 * m.flip);
  const negShift = Math.max(0, 2 * m.negShift - 1);
  const negative = scale(b, 1 - 2 * flip);
  if (negShift > VISIBLE) {
    out.push({ id: 'nb-copy', key: 'nb', role: 'copy', ...at(add(P, scale(a, negShift)), negative), tex: '-\\vec b' });
  }
  if (m.fill > VISIBLE) {
    // The parallelogram's diagonals: a⃗ + b⃗ from P, and a⃗ − b⃗ from the tip of b⃗ (drawn as
    // a copy while the result itself is applied at P).
    out.push({ id: 'sum-diag', key: 'sd', role: 'secondary', ...at(P, add(a, b)), tex: '\\vec a + \\vec b', fade: m.fill });
    const away = m.fill * (1 - m.resShift);
    if (away > VISIBLE) {
      out.push({ id: 'diff-diag', key: 'r', role: 'copy', ...at(add(P, b), sub(a, b)), tex: '\\vec a - \\vec b', fade: away });
    }
  }
  out.push(A, B);
  if (flip > VISIBLE) {
    out.push({ id: 'nb', key: 'nb', role: 'opposite', ...at(P, negative), tex: '-\\vec b' });
  }
  out.push({
    id: 'diff',
    key: 'r',
    role: 'result',
    ...at(add(P, scale(b, m.resShift)), sub(a, b)),
    tex: '\\vec a - \\vec b',
  });
  return out;
}

/** The parallelogram P, P + a⃗, P + a⃗ + b⃗, P + b⃗. */
export const parallelogram = (s: Vectors): Vec[] => [
  s.P,
  add(s.P, s.a),
  add(s.P, add(s.a, s.b)),
  add(s.P, s.b),
];

export interface Auxiliary {
  /** Shading of the parallelogram (0 when hidden or degenerate). */
  fill: number;
  /** The two far sides, dashed; each fades where a tip-to-tail copy already lies on it. */
  sides: { from: Vec; to: Vec; opacity: number }[];
  degenerate: boolean;
}

/** The light parallelogram behind the arrows. */
export function auxiliary(s: Vectors, op: Operation, m: Motion): Auxiliary {
  const flat = degenerate(s);
  if (op === 'scalar' || m.fill <= VISIBLE || flat) return { fill: 0, sides: [], degenerate: flat };
  const [, A, S, B] = parallelogram(s);
  const sum = op === 'sum';
  return {
    fill: m.fill,
    sides: [
      { from: A, to: S, opacity: m.fill * (sum ? 1 - m.copyB : 1) },
      { from: B, to: S, opacity: m.fill * (sum ? 1 - m.copyA : 1) },
    ].filter((side) => side.opacity > VISIBLE),
    degenerate: false,
  };
}

/**
 * The Cartesian reading along one direction: the 1D steps of the construction, as signed
 * lengths laid end to end from P (a_x, then b_x or −b_x), and the result's own step.
 */
export function steps(s: Vectors, op: Operation, order: SumOrder, axis: 'x' | 'y') {
  const c = (v: Vec) => v[axis];
  if (op === 'scalar') {
    return { parts: [{ key: 'a' as Key, value: c(s.a) }], result: clean(c(s.a) * s.k) };
  }
  const second = op === 'sum' ? { key: 'b' as Key, value: c(s.b) } : { key: 'nb' as Key, value: clean(-c(s.b)) };
  const first = { key: 'a' as Key, value: c(s.a) };
  const parts = op === 'sum' && order === 'ba' ? [second, first] : [first, second];
  return { parts, result: c(resultOf(s, op)) };
}

export type ScalarCase = 'same' | 'opposite' | 'zero';

/** k > 0 keeps the sense, k < 0 reverses it, k = 0 gives the zero vector. */
export const scalarCase = (k: number): ScalarCase =>
  sign(k) === 0 ? 'zero' : sign(k) > 0 ? 'same' : 'opposite';

/** |k a⃗| = |k| |a⃗|, computed both ways in the tests. */
export const scaledLength = (s: Vectors): number => clean(Math.abs(s.k) * length(s.a));
