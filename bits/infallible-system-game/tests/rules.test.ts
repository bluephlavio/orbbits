import assert from 'node:assert/strict';
import test from 'node:test';
import { colorOf, createWheel, outcomeOf, POCKETS, seededUint32, seededWheel, THEORY, WHEEL_ORDER } from '../src/game/rules.ts';

test('the wheel has every pocket 0–36 exactly once', () => {
  assert.equal(POCKETS, 37);
  assert.deepEqual([...WHEEL_ORDER].sort((a, b) => a - b), Array.from({ length: 37 }, (_, i) => i));
});

test('18 red, 18 black, one green zero, and colours alternate around the wheel', () => {
  const colors = WHEEL_ORDER.map(colorOf);
  assert.equal(colors.filter((c) => c === 'red').length, 18);
  assert.equal(colors.filter((c) => c === 'black').length, 18);
  assert.equal(colors.filter((c) => c === 'green').length, 1);
  for (let i = 1; i < 36; i += 1) assert.notEqual(colors[i], colors[i + 1], `pockets ${WHEEL_ORDER[i]} and ${WHEEL_ORDER[i + 1]}`);
  assert.equal(colorOf(32), 'red');
  assert.equal(colorOf(26), 'black');
});

test('a colour pays 1:1 and the zero loses for both colours', () => {
  assert.deepEqual(outcomeOf(1, 'red', 5), { pocket: 1, bet: 'red', stake: 5, win: true, net: 5 });
  assert.equal(outcomeOf(1, 'black', 5).net, -5);
  assert.equal(outcomeOf(0, 'red', 3).net, -3);
  assert.equal(outcomeOf(0, 'black', 3).net, -3);
});

test('theory is counted from the wheel: 18/37, 19/37, −1/37', () => {
  assert.equal(THEORY.winProbability, 18 / 37);
  assert.equal(THEORY.loseProbability, 19 / 37);
  assert.ok(Math.abs(THEORY.expectedPerToken + 1 / 37) < 1e-15);
});

test('the game wheel rejects bytes ≥ 222 (no modulo bias)', () => {
  const bytes = [221, 222, 255, 0, 36, 37];
  const wheel = createWheel((buffer) => buffer.set(bytes.slice(0, buffer.length)), bytes.length);
  assert.deepEqual([wheel(), wheel(), wheel(), wheel()], [221 % 37, 0, 36, 0]);
});

test('every byte below 222 maps to each pocket exactly 6 times', () => {
  const counts = new Array(37).fill(0);
  for (let b = 0; b < 222; b += 1) counts[b % 37] += 1;
  assert.ok(counts.every((c) => c === 6));
});

test('seeded streams are reproducible and distinct', () => {
  const a = seededUint32(42, 3);
  const b = seededUint32(42, 3);
  const first = Array.from({ length: 50 }, a);
  assert.deepEqual(first, Array.from({ length: 50 }, b));
  assert.notDeepEqual(first, Array.from({ length: 50 }, seededUint32(42, 4)));
  assert.notDeepEqual(first, Array.from({ length: 50 }, seededUint32(43, 3)));
});

test('a seeded wheel is uniform over the 37 pockets (chi-square)', () => {
  const n = 370_000;
  const counts = new Array(37).fill(0);
  const wheel = seededWheel(7);
  for (let i = 0; i < n; i += 1) counts[wheel()] += 1;
  const expected = n / 37;
  const chi2 = counts.reduce((sum, c) => sum + (c - expected) ** 2 / expected, 0);
  // 36 degrees of freedom: the 99.9th percentile is about 67.
  assert.ok(chi2 < 67, `chi2 = ${chi2}`);
});

test('the crypto wheel is uniform too', () => {
  const n = 185_000;
  const counts = new Array(37).fill(0);
  const wheel = createWheel();
  for (let i = 0; i < n; i += 1) counts[wheel()] += 1;
  const expected = n / 37;
  const chi2 = counts.reduce((sum, c) => sum + (c - expected) ** 2 / expected, 0);
  assert.ok(chi2 < 80, `chi2 = ${chi2}`);
});
