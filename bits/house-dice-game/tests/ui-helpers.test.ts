import assert from 'node:assert/strict';
import test from 'node:test';
import { decimal, integer, orDash, percent, signed, tokens } from '../src/ui/format.ts';
import { linear, niceTicks, paddedDomain } from '../src/ui/scale.ts';

test('numbers are written the Italian way', () => {
  assert.equal(integer(1000), '1.000');
  assert.equal(integer(1000000), '1.000.000');
  assert.equal(decimal(-1 / 6), '−0,167');
  assert.equal(percent(1 / 6), '16,7%');
});

test('signs are explicit, and zero has none', () => {
  assert.equal(signed(4), '+4');
  assert.equal(signed(-1), '−1');
  assert.equal(signed(0), '0');
});

test('a value that rounds to zero carries no sign', () => {
  assert.equal(signed(-0.0001, 3), '0,000');
  assert.equal(signed(0.0001, 3), '0,000');
  assert.equal(decimal(-0.0001), '0,000');
});

test('tokens agree in number', () => {
  assert.equal(tokens(1), '1 gettone');
  assert.equal(tokens(0), '0 gettoni');
  assert.equal(tokens(5), '5 gettoni');
});

test('an undefined statistic is a dash, and a zero is not', () => {
  assert.equal(orDash(null, percent), '—');
  assert.equal(orDash(0, percent), '0,0%');
});

test('scales map mathematical values to pixels, inverted axes included', () => {
  const y = linear([0, 10], [200, 0]);
  assert.equal(y(0), 200);
  assert.equal(y(10), 0);
  assert.equal(y(5), 100);
});

test('ticks are round and stay inside the domain', () => {
  assert.deepEqual(niceTicks(0, 100, 5), [0, 20, 40, 60, 80, 100]);
  assert.deepEqual(niceTicks(-80, 60, 4), [-50, 0, 50]);
  const ticks = niceTicks(0, 0.35, 5);
  assert.ok(ticks.includes(0.1) && ticks.includes(0.3)); // no 0.30000000000000004
});

test('ticks include zero whenever the domain crosses it', () => {
  assert.ok(niceTicks(-367, 180, 5).includes(0));
});

test('roll axes never get fractional ticks', () => {
  assert.deepEqual(niceTicks(0, 3, 6, true), [0, 1, 2, 3]);
});

test('an empty range gives a single tick rather than looping', () => {
  assert.deepEqual(niceTicks(5, 5), [5]);
});

test('a flat series still gets a usable axis', () => {
  const [lo, hi] = paddedDomain([20, 20], { minSpan: 8 });
  assert.ok(lo < 20 && hi > 20 && hi - lo >= 8);
});
