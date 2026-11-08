import assert from 'node:assert/strict';
import test from 'node:test';
import { THEORY } from '../src/game/rules.ts';
import { cycleLoss, cycleTheory, isStakeAllowed, martingaleStake, maxLevels } from '../src/game/strategy.ts';

const close = (a: number, b: number, eps = 1e-12) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);

test('doubling: 1, 2, 4, 8, 16, 32, and the losses so far are always one less than the next stake', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5].map((k) => martingaleStake(1, k)), [1, 2, 4, 8, 16, 32]);
  for (let k = 0; k < 12; k += 1) assert.equal(martingaleStake(3, k) - cycleLoss(3, k), 3);
});

test('a stake must be a whole number within the capital and the table limit', () => {
  assert.ok(isStakeAllowed(32, 32, 100));
  assert.ok(!isStakeAllowed(33, 32, 100));
  assert.ok(!isStakeAllowed(64, 100, 50));
  assert.ok(isStakeAllowed(64, 100, null));
  assert.ok(!isStakeAllowed(0, 10, 10));
  assert.ok(!isStakeAllowed(1.5, 10, 10));
});

test('63 tokens allow six stakes; a limit of 20 allows five', () => {
  assert.equal(maxLevels(63, { base: 1, limit: 100 }), 6);
  assert.equal(maxLevels(62, { base: 1, limit: 100 }), 5);
  assert.equal(maxLevels(127, { base: 1, limit: null }), 7);
  assert.equal(maxLevels(63, { base: 1, limit: 20 }), 5);
  assert.equal(maxLevels(63, { base: 1, limit: 16 }), 5);
  assert.equal(maxLevels(63, { base: 1, limit: 15 }), 4);
  assert.equal(maxLevels(63, { base: 5, limit: 100 }), 3);
  assert.equal(maxLevels(0, { base: 1, limit: 100 }), 0);
});

test('the canonical cycle: +1 in 98,17%, −63 in 1,83%, about −0,174 on average', () => {
  const t = cycleTheory(63, { base: 1, limit: 100 });
  assert.equal(t.levels, 6);
  assert.equal(t.win, 1);
  assert.equal(t.loss, 63);
  close(t.collapseProbability, (19 / 37) ** 6);
  assert.equal(t.winProbability.toFixed(4), '0.9817');
  assert.equal(t.collapseProbability.toFixed(4), '0.0183');
  assert.equal(t.expected.toFixed(3), '-0.174');
  close(t.expected, 1 - 64 * (19 / 37) ** 6);
});

test('invariant: a cycle loses on average 1/37 of what it stakes, whatever the setup', () => {
  for (const capital of [1, 7, 30, 63, 100, 500, 10_000]) {
    for (const base of [1, 2, 5]) {
      for (const limit of [10, 100, null]) {
        const t = cycleTheory(capital, { base, limit });
        close(t.expected, THEORY.expectedPerToken * t.staked, 1e-9);
      }
    }
  }
});

test('a bigger capital makes the collapse rarer and larger, and the mean no better', () => {
  const small = cycleTheory(63, { base: 1, limit: null });
  const big = cycleTheory(1023, { base: 1, limit: null });
  assert.ok(big.collapseProbability < small.collapseProbability);
  assert.ok(big.loss > small.loss);
  assert.ok(big.expected < small.expected);
});
