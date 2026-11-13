/** Operations, their constructions seen together, the Cartesian reading and the readouts. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  auxiliary,
  degenerate,
  INITIAL,
  motionFor,
  parallelogram,
  pieces,
  resultOf,
  REST,
  scalarCase,
  scaledLength,
  steps,
} from '../src/model/operations.ts';
import type { Construction, Motion, Piece, Vectors } from '../src/model/operations.ts';
import { add, length, scale, sub, vec } from '../src/model/vec.ts';
import { algebra, columns, reading } from '../src/ui/formulas.ts';

const state = (P: [number, number], a: [number, number], b: [number, number], k = 1): Vectors => ({
  P: vec(...P),
  a: vec(...a),
  b: vec(...b),
  k,
});
const byId = (list: Piece[], id: string) => list.find((p) => p.id === id);
const vectorOf = (p: Piece) => sub(p.tip, p.tail);
const C = (c: Partial<Construction> = {}): Construction => ({ order: 'ab', diff: 'opposite', parallelogram: false, ...c });

/** TeX without the \htmlClass{…}{…} wrappers (colour, highlighting), masks as "?". */
function plain(tex: string): string {
  let out = '';
  for (let i = 0; i < tex.length; ) {
    if (tex.startsWith('\\htmlClass{', i)) {
      const close = tex.indexOf('}', i);
      const name = tex.slice(i + 11, close);
      let depth = 1;
      let j = close + 2;
      const start = j;
      for (; j < tex.length && depth > 0; j += 1) {
        if (tex[j] === '{') depth += 1;
        if (tex[j] === '}') depth -= 1;
      }
      out += name === 'mask' ? '?' : plain(tex.slice(start, j - 1));
      i = j;
    } else {
      out += tex[i];
      i += 1;
    }
  }
  return out;
}
const ARRAY = '\\begin{array}{rll}';
const lines = (tex: string) => {
  const t = plain(tex);
  return t.slice(t.indexOf(ARRAY) + ARRAY.length, t.lastIndexOf('\\end{array}')).split(' \\\\ ');
};

test('sum and difference by components, with no floating-point residue', () => {
  const s = state([0, 0], [0.1, 0.7], [0.2, -0.7]);
  assert.deepEqual(resultOf(s, 'sum'), { x: 0.3, y: 0 });
  assert.ok(Object.is(resultOf(s, 'sum').y, 0));
  assert.deepEqual(resultOf(s, 'difference'), { x: -0.1, y: 1.4 });
  assert.deepEqual(resultOf(INITIAL, 'sum'), resultOf({ ...INITIAL, a: INITIAL.b, b: INITIAL.a }, 'sum'));
});

test('tip-to-tail and the parallelogram together reach the same tip', () => {
  const s = state([-2, 1], [3, -1], [-1, 4]);
  for (const order of ['ab', 'ba'] as const) {
    const m = motionFor('sum', C({ order, parallelogram: true }));
    const list = pieces(s, 'sum', m);
    const result = byId(list, 'sum')!;
    assert.deepEqual(result.tail, s.P);
    assert.deepEqual(result.tip, parallelogram(s)[2], 'the diagonal from the common tail');
    const copies = list.filter((p) => p.role === 'copy');
    assert.equal(copies.length, 1, 'one tip-to-tail copy, the other side stays a dashed line');
    assert.deepEqual(vectorOf(copies[0]), copies[0].key === 'a' ? s.a : s.b);
    assert.deepEqual(copies[0].tip, result.tip);
    const aux = auxiliary(s, 'sum', m);
    assert.equal(aux.sides.length, 1, 'the side under the copy is not drawn twice');
    assert.equal(aux.fill, 1);
  }
  assert.equal(auxiliary(s, 'sum', motionFor('sum', C())).sides.length, 0);
});

test('a copy in transit is still the same vector', () => {
  const s = state([0, 0], [4, 1], [1, 3]);
  const halfway: Motion = { ...REST, copyB: 0.5 };
  const copy = byId(pieces(s, 'sum', halfway), 'b-copy')!;
  assert.deepEqual(vectorOf(copy), s.b);
  assert.deepEqual(copy.tail, vec(2, 0.5));
  assert.equal(byId(pieces(s, 'sum', REST), 'b-copy'), undefined, 'at rest it is under b');
});

test('difference: a + (−b), the arrow between the tips and the second diagonal agree', () => {
  const s = state([1, 1], [4, 1], [1, 3]);
  const opposite = pieces(s, 'difference', motionFor('difference', C({ diff: 'opposite', parallelogram: true })));
  const tips = pieces(s, 'difference', motionFor('difference', C({ diff: 'tips', parallelogram: true })));
  assert.deepEqual(vectorOf(byId(opposite, 'nb')!), scale(s.b, -1));
  const nbCopy = byId(opposite, 'nb-copy')!;
  assert.deepEqual(nbCopy.tail, add(s.P, s.a));
  const r1 = byId(opposite, 'diff')!;
  const r2 = byId(tips, 'diff')!;
  const diagonal = byId(opposite, 'diff-diag')!;
  for (const r of [r1, r2, diagonal]) assert.deepEqual(vectorOf(r), sub(s.a, s.b));
  assert.deepEqual(r1.tip, nbCopy.tip);
  // From the tip of b to the tip of a, not the other way round.
  for (const r of [r2, diagonal]) {
    assert.deepEqual(r.tail, add(s.P, s.b));
    assert.deepEqual(r.tip, add(s.P, s.a));
  }
  // The other diagonal is the sum, from the common tail.
  const sd = byId(tips, 'sum-diag')!;
  assert.equal(sd.role, 'secondary');
  assert.deepEqual(sd.tail, s.P);
  assert.deepEqual(vectorOf(sd), add(s.a, s.b));
  assert.equal(byId(tips, 'diff-diag'), undefined, 'already drawn as the result');
  assert.equal(byId(pieces(s, 'difference', motionFor('difference', C())), 'sum-diag'), undefined);
});

test('the difference transition flips b first, then moves the copy', () => {
  const s = state([0, 0], [4, 1], [1, 3]);
  const early = pieces(s, 'difference', { ...REST, flip: 0.125, negShift: 0.125 });
  assert.equal(byId(early, 'nb-copy'), undefined);
  assert.deepEqual(vectorOf(byId(early, 'nb')!), scale(s.b, 0.5));
  const late = pieces(s, 'difference', { ...REST, flip: 0.75, negShift: 0.75 });
  assert.deepEqual(vectorOf(byId(late, 'nb')!), scale(s.b, -1));
  assert.deepEqual(byId(late, 'nb-copy')!.tail, vec(2, 0.5));
});

test('degenerate parallelograms: parallel, opposite, coincident and zero vectors', () => {
  const cases = [
    state([0, 0], [4, 1], [2, 0.5]),
    state([0, 0], [4, 1], [-4, -1]),
    state([0, 0], [3, 2], [3, 2]),
    state([0, 0], [0, 0], [1, 3]),
  ];
  for (const s of cases) {
    assert.ok(degenerate(s));
    for (const op of ['sum', 'difference'] as const) {
      const m = motionFor(op, C({ parallelogram: true }));
      const aux = auxiliary(s, op, m);
      assert.equal(aux.fill, 0);
      assert.deepEqual(aux.sides, []);
      assert.ok(aux.degenerate);
      // The vectors themselves are still right.
      const r = byId(pieces(s, op, m), op === 'sum' ? 'sum' : 'diff')!;
      assert.deepEqual(vectorOf(r), resultOf(s, op));
    }
    assert.match(reading(s, 'sum', C({ parallelogram: true }), false).notes[0], /degenera/);
  }
  assert.ok(!degenerate(INITIAL));
  // Opposite vectors: the sum is the zero vector, drawn as a point at the common tail.
  const zero = byId(pieces(cases[1], 'sum', motionFor('sum', C())), 'sum')!;
  assert.deepEqual(zero.tail, zero.tip);
  // Coincident vectors: the difference is the zero vector.
  assert.deepEqual(resultOf(cases[2], 'difference'), { x: 0, y: 0 });
});

test('Cartesian steps add up like numbers on a line', () => {
  const s = state([1, -1], [2, 3], [4, -1], -1.5);
  for (const axis of ['x', 'y'] as const) {
    for (const op of ['sum', 'difference', 'scalar'] as const) {
      for (const order of ['ab', 'ba'] as const) {
        const { parts, result } = steps(s, op, order, axis);
        if (op !== 'scalar') {
          const total = parts.reduce((t, p) => t + p.value, 0);
          assert.ok(Math.abs(total - result) < 1e-9, `${op} ${axis}`);
        }
        assert.equal(result, resultOf(s, op)[axis]);
      }
    }
  }
  assert.deepEqual(
    steps(s, 'sum', 'ba', 'x').parts.map((p) => p.key),
    ['b', 'a'],
  );
  assert.deepEqual(
    steps(s, 'difference', 'ab', 'y').parts.map((p) => [p.key, p.value]),
    [
      ['a', 3],
      ['nb', 1],
    ],
  );
});

test('k a: sense, zero and modulus', () => {
  for (const k of [-3, -1, -0.5, 0, 0.3, 1, 2.5]) {
    const s = { ...INITIAL, k };
    const v = vectorOf(byId(pieces(s, 'scalar', REST), 'ka')!);
    assert.ok(Math.abs(length(v) - scaledLength(s)) < 1e-9);
    assert.ok(Math.abs(length(v) - Math.abs(k) * length(s.a)) < 1e-9);
    const d = v.x * s.a.x + v.y * s.a.y;
    if (k > 0) assert.ok(d > 0);
    if (k < 0) assert.ok(d < 0);
  }
  assert.equal(scalarCase(0), 'zero');
  assert.equal(scalarCase(-1e-12), 'zero');
  assert.equal(scalarCase(-0.1), 'opposite');
  assert.equal(scalarCase(0.1), 'same');
  const zero = vectorOf(byId(pieces({ ...INITIAL, k: 0 }, 'scalar', REST), 'ka')!);
  assert.ok(Object.is(zero.x, 0) && Object.is(zero.y, 0));
});

test('columns follow the conventions of a linear combination', () => {
  const two = (v: [number, number]) => columns(vec(...v), 'c-a').map(plain).join(' ');
  assert.equal(two([4, -1]), '4\\hat x - \\hat y');
  assert.equal(two([-1, 0]), '-\\hat x ');
  assert.equal(two([0, 2.5]), ' 2{,}5\\hat y');
  assert.equal(two([0, -1]), ' -\\hat y');
  assert.equal(two([0, 0]), '\\vec 0 ');
  assert.equal(two([0.25, 1]), '0{,}25\\hat x + \\hat y');
});

test('the operation in components, with signs and brackets', () => {
  const s = state([0, 0], [2, 3], [4, -1], -1.5);
  assert.deepEqual(lines(algebra(s, 'sum', false)).slice(2), [
    '\\vec a + \\vec b & {}= (a_x + b_x)\\,\\hat x & {}+ (a_y + b_y)\\,\\hat y',
    ' & {}= (2 + 4)\\,\\hat x & {}+ (3 - 1)\\,\\hat y',
    ' & {}= 6\\hat x & {}+ 2\\hat y',
  ]);
  const diff = lines(algebra(s, 'difference', false));
  assert.equal(diff[3], ' & {}= (2 - 4)\\,\\hat x & {}+ (3 - (-1))\\,\\hat y');
  assert.equal(diff[4], ' & {}= -2\\hat x & {}+ 4\\hat y');
  const scalar = lines(algebra(s, 'scalar', false));
  assert.equal(scalar[1], 'k\\,\\vec a & {}= (k\\,a_x)\\,\\hat x & {}+ (k\\,a_y)\\,\\hat y');
  assert.equal(scalar[2], ' & {}= (-1{,}5 \\cdot 2)\\,\\hat x & {}+ (-1{,}5 \\cdot 3)\\,\\hat y');
  assert.equal(scalar[3], ' & {}= -3\\hat x & {}- 4{,}5\\hat y');
  const negative = lines(algebra({ ...s, a: vec(-1, 0), b: vec(-2, 1), k: 2 }, 'scalar', false));
  assert.equal(negative[2], ' & {}= (2 \\cdot (-1))\\,\\hat x & {}+ (2 \\cdot 0)\\,\\hat y');
  assert.equal(negative[3], ' & {}= -2\\hat x & ');
  const zero = lines(algebra(state([0, 0], [2, 3], [-2, -3]), 'sum', false));
  assert.equal(zero.at(-1), ' & {}= \\vec 0 & ');
});

test('hidden values: the result is masked everywhere, the data stay', () => {
  const s = state([0, 0], [2, 3], [4, -1], 2);
  for (const op of ['sum', 'difference', 'scalar'] as const) {
    const block = lines(algebra(s, op, true));
    assert.equal(block.at(-1), ' & {}= ?\\,\\hat x & {}+ ?\\,\\hat y', op);
    assert.match(block[0], /^\\vec a & \{\}= 2\\hat x/);
    const r = reading(s, op, C(), true);
    assert.match(plain(r.rows[1].tex), /= \?$/);
    for (const row of r.rows.slice(0, 1)) assert.doesNotMatch(plain(row.tex), /\?/);
  }
});

test('readouts: values, remarks for each construction', () => {
  const s = state([0, 0], [4, 1], [-1, 3], -1.5);
  assert.match(plain(reading(s, 'sum', C(), false).rows[1].tex), /= 5$/);
  assert.match(reading(s, 'sum', C({ parallelogram: true }), false).notes[0], /stessa freccia/);
  const diff = reading(s, 'difference', C({ diff: 'tips', parallelogram: true }), false);
  assert.match(diff.main.tex, /\(\\htmlClass\{hk-nb\}\{\\htmlClass\{c-nb\}\{-\\vec b\}\}\)/);
  assert.match(diff.notes[0], /dalla punta di/);
  assert.match(diff.notes[1], /diagonali/);
  assert.match(reading(s, 'scalar', C(), false).notes[0], /verso opposto/);
  assert.match(reading({ ...s, k: 0 }, 'scalar', C(), false).notes[0], /vettore nullo/);
  assert.match(reading({ ...s, k: 1 }, 'scalar', C(), false).notes[0], /stesso modulo/);
});

test('every formula is valid KaTeX', async () => {
  const { default: katex } = await import('katex');
  const render = (t: string) =>
    katex.renderToString(t, { throwOnError: true, strict: 'ignore', trust: (c) => c.command === '\\htmlClass' });
  const configs = [
    state([0, 0], [2, 3], [4, -1], -1.5),
    state([1, -2], [0, 0], [-1, 0.5], 0),
    state([0, 0], [3, 2], [3, 2], 1),
  ];
  for (const s of configs) {
    for (const op of ['sum', 'difference', 'scalar'] as const) {
      for (const masked of [false, true]) {
        render(algebra(s, op, masked));
        const r = reading(s, op, C({ parallelogram: true }), masked);
        for (const f of [r.main, ...r.rows]) render(f.tex);
        for (const n of r.notes) n.split('$').forEach((part, i) => i % 2 === 1 && render(part));
      }
    }
  }
});
