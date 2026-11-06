import assert from 'node:assert/strict';
import test from 'node:test';
import { outcomeOf, totalSpread } from '../src/game/rules.ts';
import type { Face } from '../src/game/rules.ts';
import {
  balanceSeries,
  expectedBand,
  expectedNetAfter,
  grid,
  netSeries,
  sixRateSeries,
  summarize,
} from '../src/game/stats.ts';

const log = (...faces: Face[]) => faces.map(outcomeOf);

test('no rolls: counts are zero and rates are undefined, not zero', () => {
  assert.deepEqual(summarize([]), {
    rolls: 0,
    wins: 0,
    losses: 0,
    sixRate: null,
    net: 0,
    meanNet: null,
  });
});

test('summary of a short log', () => {
  assert.deepEqual(summarize(log(6, 1, 2, 6)), {
    rolls: 4,
    wins: 2,
    losses: 2,
    sixRate: 0.5,
    net: 6,
    meanNet: 1.5,
  });
});

test('wins + losses = rolls and net = 4·wins − losses', () => {
  const faces = log(1, 6, 3, 3, 6, 2, 5, 4, 6, 1);
  const s = summarize(faces);
  assert.equal(s.wins + s.losses, s.rolls);
  assert.equal(s.net, 4 * s.wins - s.losses);
});

test('one roll: the empirical mean equals the net of that roll', () => {
  assert.equal(summarize(log(6)).meanNet, 4);
  assert.equal(summarize(log(2)).meanNet, -1);
});

test('series start where the game starts', () => {
  assert.deepEqual(netSeries(log(1, 6)), [
    { x: 0, y: 0 },
    { x: 1, y: -1 },
    { x: 2, y: 3 },
  ]);
  assert.deepEqual(balanceSeries(20, log(1, 6)).map((p) => p.y), [20, 19, 23]);
});

test('the frequency series starts at the first roll and tracks wins/n', () => {
  assert.deepEqual(sixRateSeries(log(6, 1, 1, 6)).map((p) => p.y), [1, 0.5, 1 / 3, 0.5]);
  assert.deepEqual(sixRateSeries([]), []);
});

test('the last point of each series agrees with the summary', () => {
  const faces = log(1, 6, 3, 3, 6, 2);
  const s = summarize(faces);
  assert.equal(netSeries(faces).at(-1)!.y, s.net);
  assert.equal(sixRateSeries(faces).at(-1)!.y, s.sixRate);
});

test('the expected band is centred on the expected value', () => {
  const { lo, hi } = expectedBand(36, 20);
  assert.ok(Math.abs((lo + hi) / 2 - (20 + expectedNetAfter(36))) < 1e-9);
  assert.ok(Math.abs((hi - lo) / 2 - totalSpread(36)) < 1e-9);
  assert.equal(expectedNetAfter(600), -100);
});

test('grid spans its range and handles a degenerate one', () => {
  assert.deepEqual(grid(0, 4, 4), [0, 1, 2, 3, 4]);
  assert.deepEqual(grid(3, 3), [3]);
});
