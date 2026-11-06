import assert from 'node:assert/strict';
import test from 'node:test';
import { createDie, FACES, outcomeOf, rateSpread, RULES, THEORY, totalSpread } from '../src/game/rules.ts';
import type { Face } from '../src/game/rules.ts';

const close = (a: number, b: number, eps = 1e-12) =>
  assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

test('a 6 pays 5 tokens: net +4', () => {
  assert.deepEqual(outcomeOf(6), { face: 6, win: true, stake: 1, payout: 5, net: 4 });
});

test('any other face loses the stake: net −1', () => {
  for (const face of [1, 2, 3, 4, 5] as const) {
    assert.deepEqual(outcomeOf(face), { face, win: false, stake: 1, payout: 0, net: -1 });
  }
});

test('net is always payout minus stake', () => {
  for (const face of FACES) {
    const o = outcomeOf(face);
    assert.equal(o.net, o.payout - o.stake);
  }
});

test('theoretical values derive from the rules', () => {
  close(THEORY.winProbability, 1 / 6);
  close(THEORY.expectedNet, -1 / 6);
  close(THEORY.houseEdge, 1 / 6);
  close(THEORY.houseEdge * 100, 16.666666666666668);
  close(THEORY.variance, 125 / 36);
  close(THEORY.sd, (5 * Math.sqrt(5)) / 6);
});

test('the fair payout would be 6: the gap to 5 is the house edge', () => {
  close(THEORY.expectedNet, (RULES.payout - 6) / 6);
});

test('the upper edge of the typical band crosses zero at exactly n = 500', () => {
  close(500 * THEORY.expectedNet + totalSpread(500), 0, 1e-9);
});

test('the rate band of the 6 narrows like 1/√n', () => {
  close(rateSpread(100) / rateSpread(10000), 10, 1e-9);
});

function scripted(bytes: number[]) {
  let i = 0;
  return (buffer: Uint8Array) => {
    for (let j = 0; j < buffer.length; j += 1) {
      buffer[j] = bytes[i % bytes.length];
      i += 1;
    }
  };
}

test('bytes map to faces uniformly, one residue each', () => {
  const die = createDie(scripted([0, 1, 2, 3, 4, 5]), 6);
  assert.deepEqual(Array.from({ length: 6 }, die), [1, 2, 3, 4, 5, 6]);
});

test('bytes ≥ 252 are rejected, so no face is favoured', () => {
  const die = createDie(scripted([252, 253, 254, 255, 251, 0]), 6);
  assert.equal(die(), 6); // 251 % 6 = 5
  assert.equal(die(), 1);
});

test('all 252 accepted bytes split evenly across the faces', () => {
  const counts = new Map<Face, number>();
  const bytes = Array.from({ length: 256 }, (_, i) => i);
  const die = createDie(scripted(bytes), 256);
  for (let i = 0; i < 252; i += 1) {
    const face = die();
    counts.set(face, (counts.get(face) ?? 0) + 1);
  }
  assert.deepEqual([...counts.values()], [42, 42, 42, 42, 42, 42]);
});

test('the real die passes a chi-squared test for uniformity', () => {
  const die = createDie();
  const n = 600_000;
  const counts = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < n; i += 1) counts[die() - 1] += 1;
  const expected = n / 6;
  const chi2 = counts.reduce((sum, c) => sum + (c - expected) ** 2 / expected, 0);
  assert.ok(chi2 < 37.5, `χ² = ${chi2}`); // 5 d.o.f., p ≈ 5·10⁻⁷: a false alarm is negligible
});

test('consecutive rolls are independent: P(6 | previous 6) ≈ 1/6', () => {
  const die = createDie();
  let after6 = 0;
  let sixAfter6 = 0;
  let previous = die();
  for (let i = 0; i < 1_200_000; i += 1) {
    const face = die();
    if (previous === 6) {
      after6 += 1;
      if (face === 6) sixAfter6 += 1;
    }
    previous = face;
  }
  const sd = Math.sqrt((1 / 6) * (5 / 6) * (1 / after6));
  assert.ok(Math.abs(sixAfter6 / after6 - 1 / 6) < 5 * sd);
});
