/** Modulus and direction ↔ components: quadrants, signs, reference angle, special cases, TeX. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  analyse,
  ANGLE_MAX,
  ANGLE_MIN,
  calculatorAngle,
  givenPolar,
  INITIAL,
  INITIAL_POLAR,
  intoFirst,
  polarFromPointer,
  polarOf,
  quadrantOf,
  signsOf,
  tipOf,
  toCartesian,
  toPolar,
} from '../src/model/direction.ts';
import type { Quadrant } from '../src/model/direction.ts';
import { vec } from '../src/model/vec.ts';
import { formulaGroups, notes } from '../src/ui/formulas.ts';
import type { Mode } from '../src/ui/formulas.ts';

/** Equal up to float noise (values are cleaned at 1e-9). */
const close = (a: number, b: number, eps = 1e-7) => Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b));
const QUADRANTS: Quadrant[] = [1, 2, 3, 4];

test('the signs come from the quadrant, as in the table', () => {
  assert.deepEqual(signsOf(1), { x: 1, y: 1 });
  assert.deepEqual(signsOf(2), { x: -1, y: 1 });
  assert.deepEqual(signsOf(3), { x: -1, y: -1 });
  assert.deepEqual(signsOf(4), { x: 1, y: -1 });
  assert.equal(quadrantOf(vec(-3, 4)), 2);
  assert.equal(quadrantOf(vec(-3, -4)), 3);
  assert.equal(quadrantOf(vec(3, -4)), 4);
  assert.equal(quadrantOf(vec(0, 4)), null, 'an axis is not a quadrant');
});

test('from modulus and direction: lengths from the triangle, signs from the quadrant', () => {
  for (const q of QUADRANTS) {
    for (const angle of [1, 30, 35, 45, 60, 89]) {
      const tip = tipOf({ mod: 6, angle, quadrant: q });
      const s = signsOf(q);
      assert.ok(close(Math.abs(tip.x), 6 * Math.cos((angle * Math.PI) / 180)), 'the horizontal leg is |v| cos β');
      assert.ok(close(Math.abs(tip.y), 6 * Math.sin((angle * Math.PI) / 180)), 'the vertical leg is |v| sen β');
      assert.equal(Math.sign(tip.x), s.x);
      assert.equal(Math.sign(tip.y), s.y);
      assert.equal(quadrantOf(tip), q);
      // And back: the same data.
      const p = givenPolar(tip)!;
      assert.deepEqual(p, { mod: 6, angle, quadrant: q });
    }
  }
  assert.deepEqual(tipOf({ mod: 10, angle: 30, quadrant: 2 }).y, 5, 'sen 30° = 1/2 exactly');
  assert.ok(close(INITIAL.x, 6 * Math.cos((35 * Math.PI) / 180)) && INITIAL.x > 0 && INITIAL.y > 0);
});

test('from the components: Pythagoras, the reference angle and the quadrant', () => {
  for (const [x, y, q] of [
    [3, 4, 1],
    [-3, 4, 2],
    [-3, -4, 3],
    [3, -4, 4],
  ] as const) {
    const a = analyse(vec(x, y));
    assert.equal(a.kind, 'quadrant');
    if (a.kind !== 'quadrant') continue;
    assert.equal(a.mod, 5);
    assert.equal(a.quadrant, q);
    assert.ok(close(a.angle, 53.13010235415598), 'the same acute β in every quadrant');
    assert.ok(close(a.ratio, 4 / 3), 'tan β = |v_y| / |v_x|, never negative');
  }
  const a = analyse(vec(1, 1));
  assert.ok(a.kind === 'quadrant' && a.angle === 45 && a.ratio === 1);
});

test('the reference angle is always acute and positive, even for tiny components', () => {
  for (const [x, y] of [
    [0.1, 13],
    [13, 0.1],
    [-0.1, -0.1],
    [0.1, -12.9],
    [-12.9, 0.1],
  ]) {
    const a = analyse(vec(x, y));
    assert.equal(a.kind, 'quadrant');
    if (a.kind === 'quadrant') {
      assert.ok(a.angle > 0 && a.angle < 90 && Number.isFinite(a.ratio), `${x}, ${y}`);
    }
  }
});

test('special cases: on an axis or zero, no triangle and no division by zero', () => {
  assert.deepEqual(analyse(vec(0, 0)), { kind: 'zero' });
  assert.deepEqual(analyse(vec(0, -2.5)), { kind: 'axis', axis: 'y', sense: -1, mod: 2.5 });
  assert.deepEqual(analyse(vec(-4, 0)), { kind: 'axis', axis: 'x', sense: -1, mod: 4 });
  assert.deepEqual(analyse(vec(1e-12, 3)), { kind: 'axis', axis: 'y', sense: 1, mod: 3 }, 'float noise is zero');
  assert.equal(polarOf(vec(0, 3)), null);
  assert.equal(calculatorAngle(vec(0, 3)), null);
});

test('the calculator’s tan⁻¹ cannot tell opposite vectors apart', () => {
  const second = calculatorAngle(vec(-3, 4))!;
  const fourth = calculatorAngle(vec(3, -4))!;
  assert.ok(close(second, -53.13010235415598));
  assert.equal(second, fourth);
  assert.equal(calculatorAngle(vec(-3, -4)), calculatorAngle(vec(3, 4)), 'III and I give the same key result');
});

test('dragging in the polar mode: quadrant from the pointer, acute angle, round data', () => {
  const o = { angleStep: 1, modStep: 0.5, first: false, maxMod: 9 };
  assert.deepEqual(polarFromPointer({ x: -3.1, y: 3.9 }, o), { mod: 5, angle: 52, quadrant: 2 });
  assert.equal(polarFromPointer({ x: -3, y: -0.001 }, o).quadrant, 3);
  assert.equal(polarFromPointer({ x: 5, y: 0 }, o).angle, ANGLE_MIN, 'never on the axis');
  assert.equal(polarFromPointer({ x: 0, y: 5 }, o).angle, ANGLE_MAX);
  assert.equal(polarFromPointer({ x: 30, y: 30 }, o).mod, 9, 'stays on stage');
  const first = { ...o, first: true };
  assert.deepEqual(polarFromPointer({ x: -2, y: 3 }, first), { mod: 3.5, angle: ANGLE_MAX, quadrant: 1 });
  assert.equal(polarFromPointer({ x: 3, y: -2 }, first).angle, ANGLE_MIN);
  assert.equal(polarFromPointer({ x: -3, y: -3 }, first).angle, ANGLE_MAX);
});

test('changing mode keeps the vector, with round data in the new mode', () => {
  assert.deepEqual(toCartesian(INITIAL, true), { x: 4.9, y: 3.4 });
  assert.deepEqual(toCartesian(vec(-4.91, 3.44), false), { x: -4.9, y: 3.4 });
  assert.deepEqual(toCartesian(vec(-4.91, 3.44), true), { x: 4.9, y: 3.4 }, 'mirrored into the first quadrant');
  assert.deepEqual(toPolar(vec(3, 4), false, 12, INITIAL_POLAR), { mod: 5, angle: 53.1, quadrant: 1 });
  assert.deepEqual(toPolar(vec(-3, 0), false, 12, INITIAL_POLAR), { mod: 3, angle: 1, quadrant: 2 });
  assert.deepEqual(toPolar(vec(0, -2), false, 12, INITIAL_POLAR), { mod: 2, angle: 89, quadrant: 4 });
  assert.deepEqual(toPolar(vec(0, 0), false, 12, INITIAL_POLAR), INITIAL_POLAR);
  assert.deepEqual(toPolar(vec(-3, -4), true, 12, INITIAL_POLAR).quadrant, 1);
  assert.deepEqual(intoFirst(vec(-3, -4)), { x: 3, y: 4 });
});

/** TeX without the \htmlClass{…}{…} wrappers, masks as "?". */
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

const all = (mode: Mode, tip: ReturnType<typeof vec>, o: { first: boolean; steps: boolean; masked: boolean }) =>
  formulaGroups(mode, tip, polarOf(tip), o)
    .flatMap((g) => g.rows.map((r) => plain(r.tex)))
    .join('\n');

test('the first quadrant uses α and the components directly', () => {
  const t = all('polar', INITIAL, { first: true, steps: true, masked: false });
  assert.ok(t.includes('v_x = |\\vec v|\\cos\\alpha = 6\\cdot \\cos 35^\\circ \\approx 4{,}91'), t);
  assert.ok(t.includes('\\dfrac{\\text{adiacente}}{\\text{ipotenusa}}'));
  assert.ok(!t.includes('\\beta'));
});

test('all quadrants: lengths with β, then the signs, never a negative length', () => {
  const tip = tipOf({ mod: 6, angle: 35, quadrant: 2 });
  const t = all('polar', tip, { first: false, steps: false, masked: false });
  assert.ok(t.includes('|v_x| = |\\vec v|\\cos\\beta \\approx 4{,}91'), t);
  assert.ok(t.includes('\\text{II quadrante:}'));
  assert.ok(t.includes('v_x < 0') && t.includes('v_y > 0'));
  assert.ok(t.includes('v_x = -|v_x| \\approx -4{,}91'));
  assert.ok(t.includes('v_y = +|v_y| \\approx 3{,}44'));
  assert.ok(!/^\|v_[xy]\| = .*(=|\\approx) -/m.test(t), 'a length is never negative');
});

test('the inverse problem: Pythagoras, tan⁻¹ of lengths, quadrant from the signs', () => {
  const t = all('cartesian', vec(-3, 4), { first: false, steps: true, masked: false });
  assert.ok(t.includes('\\sqrt{(-3)^2 + 4^2} = 5'), t);
  assert.ok(t.includes('\\tan\\beta = \\dfrac{|v_y|}{|v_x|} = \\dfrac{4}{3} \\approx 1{,}333'));
  assert.ok(t.includes('\\beta = \\tan^{-1}\\!\\left(\\dfrac{4}{3}\\right) \\approx 53{,}1^\\circ'));
  assert.ok(t.includes('\\Rightarrow\\ \\text{II quadrante}'));
  const n = notes('cartesian', vec(-3, 4), { first: false, masked: false }).join(' ');
  assert.ok(n.includes('-53{,}1^\\circ') && n.includes('(3;\\ -4)'), 'the calculator remark');
  const third = notes('cartesian', vec(-3, -4), { first: false, masked: false }).join(' ');
  assert.ok(third.includes('non distingue'));
});

test('special cases in the inverse problem: no tangent, no division', () => {
  const vertical = all('cartesian', vec(0, -4), { first: false, steps: true, masked: false });
  assert.ok(vertical.includes('v_x = 0:\\quad |\\vec v| = |v_y| = 4'), vertical);
  assert.ok(vertical.includes('verticale, verso il basso') && vertical.includes('\\beta = 90^\\circ'));
  assert.ok(!vertical.includes('\\tan\\beta ='));
  const horizontal = all('cartesian', vec(-2.5, 0), { first: false, steps: true, masked: false });
  assert.ok(horizontal.includes('orizzontale, verso sinistra') && horizontal.includes('\\beta = 0^\\circ'));
  const zero = all('cartesian', vec(0, 0), { first: false, steps: true, masked: false });
  assert.ok(zero.includes('direzione non definita') && zero.includes('= 0'));
});

test('hidden results: what is computed becomes "?", the data stay', () => {
  const polar = all('polar', tipOf({ mod: 6, angle: 35, quadrant: 3 }), { first: false, steps: true, masked: true });
  assert.ok(!polar.includes('4{,}91') && !polar.includes('3{,}44'), polar);
  assert.ok(polar.includes('6\\cdot \\cos 35^\\circ'), 'the data stay');
  const cart = all('cartesian', vec(-3, 4), { first: false, steps: true, masked: true });
  assert.ok(!cart.includes('= 5') && !cart.includes('53{,}1') && !cart.includes('II quadrante'), cart);
  assert.ok(cart.includes('(-3)^2 + 4^2'), 'the data stay');
  assert.deepEqual(notes('cartesian', vec(-3, 4), { first: false, masked: true }), []);
});

test('every formula and remark is valid KaTeX', async () => {
  const { default: katex } = await import('katex');
  const render = (t: string) =>
    katex.renderToString(t, { throwOnError: true, strict: 'ignore', trust: (c) => c.command === '\\htmlClass' });
  const tips = [INITIAL, vec(-3, 4), vec(-3, -4), vec(3, -4), vec(0, 4), vec(0, -4), vec(5, 0), vec(-5, 0), vec(0, 0), vec(0.1, 12.9), vec(-12.9, -0.1)];
  for (const mode of ['polar', 'cartesian'] as const) {
    for (const tip of tips) {
      for (const first of [true, false]) {
        for (const steps of [false, true]) {
          for (const masked of [false, true]) {
            for (const g of formulaGroups(mode, tip, polarOf(tip), { first, steps, masked })) for (const r of g.rows) render(r.tex);
            for (const n of notes(mode, tip, { first, masked })) n.split('$').forEach((part, i) => i % 2 === 1 && render(part));
          }
        }
      }
    }
  }
});
