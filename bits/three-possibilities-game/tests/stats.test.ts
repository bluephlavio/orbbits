import assert from 'node:assert/strict';
import test from 'node:test';
import { switchTarget } from '../src/game/rules.ts';
import type { Option, Strategy } from '../src/game/rules.ts';
import { createState, reduce } from '../src/game/session.ts';
import type { Round, State } from '../src/game/session.ts';
import {
  MIN_GAMES,
  MIN_SESSION_GAMES,
  pooledRounds,
  rateSeries,
  readingOf,
  sessionRates,
  summarize,
  wilson,
} from '../src/game/stats.ts';
import type { Tally } from '../src/game/stats.ts';

const round = (n: number, strategy: Strategy, win: boolean): Round => ({
  n,
  prize: 0,
  pick: 0,
  opened: 1,
  final: 0,
  strategy,
  win,
});

const rounds = (...codes: string[]) =>
  codes.map((code, i) => round(i + 1, code[0] === 'k' ? 'stay' : 'switch', code[1] === '+'));

const tally = (wins: number, played: number): Tally => ({
  played,
  wins,
  rate: played ? wins / played : null,
});

test('an empty log has undefined rates, not rates of zero', () => {
  const s = summarize([]);
  assert.deepEqual(s.all, { played: 0, wins: 0, rate: null });
  assert.equal(s.stay.rate, null);
  assert.equal(s.switch.rate, null);
});

test('counts add up by strategy', () => {
  const s = summarize(rounds('k+', 'k-', 'k-', 's+', 's+', 's-'));
  assert.deepEqual(s.all, { played: 6, wins: 3, rate: 0.5 });
  assert.equal(s.losses, 3);
  assert.deepEqual(s.stay, { played: 3, wins: 1, rate: 1 / 3 });
  assert.deepEqual(s.switch, { played: 3, wins: 2, rate: 2 / 3 });
});

test('a strategy never used has no rate, even when the other has many games', () => {
  const s = summarize(rounds('s+', 's-', 's+'));
  assert.equal(s.stay.rate, null);
  assert.equal(s.switch.played, 3);
});

test('statistics come from the real session log', () => {
  const finish = (state: State, pick: Option, strategy: Strategy) => {
    let s = reduce(state, { type: 'pick', option: pick, coin: 0 });
    s = reduce(s, { type: 'opened', id: s.live.id });
    const option = strategy === 'stay' ? pick : switchTarget(pick, s.live.opened!);
    s = reduce(s, { type: 'decide', option });
    s = reduce(s, { type: 'settle', id: s.live.id });
    return reduce(s, { type: 'deal', prize: 0 });
  };
  let s = createState(0);
  s = finish(s, 0, 'stay'); // right, kept: win
  s = finish(s, 1, 'stay'); // wrong, kept: loss
  s = finish(s, 2, 'switch'); // wrong, changed: win
  s = finish(s, 0, 'switch'); // right, changed: loss
  const summary = summarize(s.session.rounds);
  assert.deepEqual(summary.stay, { played: 2, wins: 1, rate: 0.5 });
  assert.deepEqual(summary.switch, { played: 2, wins: 1, rate: 0.5 });
});

test('frequency is counted on the games of that strategy only', () => {
  const log = rounds('k+', 's-', 's+', 'k-', 's+');
  assert.deepEqual(rateSeries(log, 'stay'), [
    { x: 1, y: 1 },
    { x: 2, y: 0.5 },
  ]);
  assert.deepEqual(rateSeries(log, 'switch'), [
    { x: 1, y: 0 },
    { x: 2, y: 0.5 },
    { x: 3, y: 2 / 3 },
  ]);
});

test('the last point of a series is the rate of the summary', () => {
  const log = rounds('s+', 's-', 'k-', 's+', 'k+', 's-', 's+');
  for (const strategy of ['stay', 'switch'] as const) {
    assert.equal(rateSeries(log, strategy).at(-1)!.y, summarize(log)[strategy].rate);
  }
});

test('the interval matches known values', () => {
  // Reference values of the Wilson score interval, z = 1.96.
  const [lo, hi] = wilson(5, 10)!;
  assert.ok(Math.abs(lo - 0.2366) < 1e-3, String(lo));
  assert.ok(Math.abs(hi - 0.7634) < 1e-3, String(hi));
  const [lo2, hi2] = wilson(0, 10)!;
  assert.equal(lo2, 0);
  assert.ok(Math.abs(hi2 - 0.2775) < 1e-3, String(hi2));
});

test('three wins out of three is not certainty', () => {
  const [lo, hi] = wilson(3, 3)!;
  assert.ok(lo < 0.5);
  assert.ok(hi > 0.99);
});

test('the interval has no meaning without games', () => {
  assert.equal(wilson(0, 0), null);
});

test('the interval always contains the observed rate and shrinks with data', () => {
  for (const [wins, played] of [[0, 1], [1, 1], [4, 12], [30, 45], [333, 1000]]) {
    const [lo, hi] = wilson(wins, played)!;
    assert.ok(lo <= wins / played && wins / played <= hi);
    assert.ok(lo >= 0 && hi <= 1);
  }
  const width = (w: number, n: number) => {
    const [lo, hi] = wilson(w, n)!;
    return hi - lo;
  };
  assert.ok(width(100, 300) < width(10, 30));
});

test('no reading without games', () => {
  assert.deepEqual(readingOf(tally(0, 0), tally(0, 0)), { kind: 'empty' });
});

test('with one strategy almost unused nothing is concluded', () => {
  assert.deepEqual(readingOf(tally(12, 40), tally(2, 2)), { kind: 'few', scarce: 'switch', played: 2, other: 40 });
  assert.deepEqual(readingOf(tally(0, 0), tally(9, 30)), { kind: 'few', scarce: 'stay', played: 0, other: 30 });
});

test('even a striking gap is not a result below the minimum', () => {
  const reading = readingOf(tally(0, MIN_GAMES - 1), tally(MIN_GAMES - 1, MIN_GAMES - 1));
  assert.equal(reading.kind, 'few');
});

test('a balanced but small sample stays open', () => {
  assert.deepEqual(readingOf(tally(4, 12), tally(8, 12)), { kind: 'overlap' });
});

test('a large gap on many games is called, in the right direction', () => {
  assert.deepEqual(readingOf(tally(33, 100), tally(67, 100)), { kind: 'apart', higher: 'switch' });
  assert.deepEqual(readingOf(tally(67, 100), tally(33, 100)), { kind: 'apart', higher: 'stay' });
});

test('sessions with few games of a strategy are counted as excluded, not plotted', () => {
  const sessions = [
    { id: 1, rounds: Array.from({ length: MIN_SESSION_GAMES }, (_, i) => round(i + 1, 'switch', i % 2 === 0)) },
    { id: 2, rounds: rounds('s+', 's+') },
    { id: 3, rounds: rounds('k+') },
  ];
  const { rates, excluded } = sessionRates(sessions, 'switch');
  assert.deepEqual(rates, [{ id: 1, rate: 3 / 5 }]);
  assert.equal(excluded, 1);
});

test('pooling keeps every game', () => {
  const sessions = [
    { id: 1, rounds: rounds('k+', 's-') },
    { id: 2, rounds: rounds('s+') },
  ];
  assert.deepEqual(summarize(pooledRounds(sessions)).switch, { played: 2, wins: 1, rate: 0.5 });
});
