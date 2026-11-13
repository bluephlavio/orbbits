/** Moduli, angle, the three exact cases and the readouts. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  alphaOf,
  caseOf,
  cosineRule,
  cosSinDeg,
  range,
  snapAlpha,
  snapModulus,
  sumModulus,
  sumOf,
  vectorB,
} from '../src/model/magnitude.ts';
import { length } from '../src/model/vec.ts';
import { caseReading, rangeTex } from '../src/ui/formulas.ts';

const c = (a: number, b: number, alpha: number) => ({ a, b, alpha });

test('the special angles are exact', () => {
  assert.deepEqual(cosSinDeg(0), [1, 0]);
  assert.deepEqual(cosSinDeg(90), [0, 1]);
  assert.deepEqual(cosSinDeg(180), [-1, 0]);
  assert.ok(Object.is(vectorB(c(3, 3, 90)).x, 0));
  assert.ok(Object.is(vectorB(c(3, 3, 180)).y, 0));
  assert.deepEqual(sumOf(c(4, 4, 180)), { x: 0, y: 0 });
});

test('three cases, and only at exactly 0°, 90° and 180°', () => {
  assert.equal(caseOf(0), 'concordant');
  assert.equal(caseOf(90), 'perpendicular');
  assert.equal(caseOf(180), 'discordant');
  for (const alpha of [1, 89, 89.5, 90.4, 91, 179, 0.2]) assert.equal(caseOf(alpha), 'general');
});

test('the elementary rules and the components agree', () => {
  assert.equal(sumModulus(c(4, 3, 0)), 7);
  assert.equal(sumModulus(c(4, 3, 180)), 1);
  assert.equal(sumModulus(c(3, 4, 180)), 1);
  assert.equal(sumModulus(c(4, 4, 180)), 0);
  assert.equal(sumModulus(c(4, 3, 90)), 5);
  assert.equal(sumModulus(c(1.5, 2, 90)), 2.5);
  for (let alpha = 0; alpha <= 180; alpha += 7.5) {
    const conf = c(3.5, 2, alpha);
    assert.ok(Math.abs(sumModulus(conf) - length(sumOf(conf))) < 1e-9, `α = ${alpha}`);
    assert.ok(Math.abs(sumModulus(conf) - cosineRule(conf)) < 1e-9, `α = ${alpha}`);
  }
});

test('fixed moduli: maximum when concordant, minimum when discordant, decreasing between', () => {
  const [lo, hi] = range(c(4, 2.5, 0));
  assert.deepEqual([lo, hi], [1.5, 6.5]);
  let previous = Infinity;
  for (let alpha = 0; alpha <= 180; alpha += 1) {
    const s = sumModulus(c(4, 2.5, alpha));
    assert.ok(s >= lo - 1e-12 && s <= hi + 1e-12);
    assert.ok(s <= previous + 1e-12, `not decreasing at ${alpha}°`);
    previous = s;
  }
  // Close to a special case the value is close, and the case is still general.
  assert.ok(Math.abs(sumModulus(c(4, 3, 89)) - 5) < 0.1);
  assert.equal(caseReading(c(4, 3, 89), false).case, 'general');
});

test('dragging the tip of b: angle above the line of a, snapping', () => {
  assert.equal(alphaOf({ x: 1, y: 0 }), 0);
  assert.equal(alphaOf({ x: -1, y: 0 }), 180);
  assert.equal(alphaOf({ x: 2, y: -1 }), 0, 'below the line: clamped to the nearer end');
  assert.equal(alphaOf({ x: -2, y: -1 }), 180);
  assert.ok(Math.abs(alphaOf({ x: 0, y: 3 }) - 90) < 1e-9);
  assert.equal(snapAlpha(88.2), 90);
  assert.equal(snapAlpha(86.4), 86);
  assert.equal(snapAlpha(2.9), 0);
  assert.equal(snapAlpha(178), 180);
  assert.equal(snapModulus(2.74), 2.5);
  assert.equal(snapModulus(9), 5);
  assert.equal(snapModulus(0), 0.5);
});

test('readouts with numbers, masks and the zero result', () => {
  assert.match(caseReading(c(4, 3, 0), false).worked, /= 4 \+ 3 = 7$/);
  assert.match(caseReading(c(4, 3, 180), false).worked, /\|4 - 3\| = 1$/);
  assert.match(caseReading(c(4, 3, 90), false).worked, /\\sqrt\{4\^2 \+ 3\^2\} = \\sqrt\{25\} = 5$/);
  assert.match(caseReading(c(2.5, 1.5, 90), false).worked, /\\sqrt\{8\{,\}5\} \\approx 2\{,\}92$/);
  const general = caseReading(c(4, 3, 60), false);
  assert.equal(general.rule, null);
  assert.match(general.worked, /\\approx 6\{,\}08$/);
  assert.match(general.note!, /altri strumenti/);
  assert.doesNotMatch(general.note!, /impossibile/);
  assert.match(caseReading(c(4, 3, 60), true).worked, /mask/);
  assert.match(caseReading(c(3, 3, 180), false).note!, /vettore nullo/);
  assert.match(caseReading(c(3, 3, 180), false).worked, /= 0$/);
  assert.equal(rangeTex(c(4, 3, 10)).startsWith('1 \\le'), true);
});

test('every formula and remark is valid KaTeX', async () => {
  const { default: katex } = await import('katex');
  const { COSINE_RULE, INEQUALITY } = await import('../src/ui/formulas.ts');
  const render = (t: string) =>
    katex.renderToString(t, { throwOnError: true, strict: 'ignore', trust: (x) => x.command === '\\htmlClass' });
  render(COSINE_RULE);
  render(INEQUALITY);
  for (const alpha of [0, 37, 90, 180]) {
    for (const masked of [false, true]) {
      const r = caseReading(c(3, 3, alpha), masked);
      render(r.worked);
      if (r.rule) render(r.rule);
      r.note?.split('$').forEach((part, i) => i % 2 === 1 && render(part));
      render(rangeTex(c(3, 3, alpha)));
    }
  }
});
