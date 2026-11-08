import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceRun, createRun, histogram, playSession, summarizeStrategy } from '../src/game/lab.ts';
import type { LabConfig } from '../src/game/lab.ts';
import { seededWheel, THEORY } from '../src/game/rules.ts';
import type { Pocket } from '../src/game/rules.ts';
import { capitalOf, createSession, reduce, systemStake } from '../src/game/session.ts';
import { cycleTheory } from '../src/game/strategy.ts';

const config = (over: Partial<LabConfig> = {}): LabConfig => ({
  capital: 63,
  base: 1,
  limit: 100,
  goal: 1,
  maxSpins: 1000,
  players: 100,
  seed: 1,
  ...over,
});

const script = (pockets: Pocket[]) => {
  let i = 0;
  return () => pockets[i++ % pockets.length];
};

const complete = (run: ReturnType<typeof createRun>, slice = 37) => {
  while (!advanceRun(run, slice));
  return run;
};

test('a martingale session stops at +1 or when the doubling is impossible', () => {
  assert.deepEqual(playSession('martingale', config(), script([2, 2, 1])), { net: 1, staked: 7, spins: 3, stop: 'goal' });
  assert.deepEqual(playSession('martingale', config(), script([2])), { net: -63, staked: 63, spins: 6, stop: 'stuck' });
  assert.deepEqual(playSession('martingale', config({ limit: 20 }), script([2])), { net: -31, staked: 31, spins: 5, stop: 'stuck' });
});

test('flat betting stops at the goal, at ruin, or at the spin cap', () => {
  assert.equal(playSession('flat', config(), script([1])).stop, 'goal');
  assert.deepEqual(playSession('flat', config({ capital: 3 }), script([0])), { net: -3, staked: 3, spins: 3, stop: 'stuck' });
  assert.deepEqual(playSession('flat', config({ maxSpins: 4, goal: null }), script([1, 2])), { net: 0, staked: 4, spins: 4, stop: 'cap' });
});

test('the simulator plays exactly as the game does, on the same pockets', () => {
  const pockets: Pocket[] = Array.from({ length: 400 }, seededWheel(99));
  const result = playSession('martingale', config({ capital: 100, limit: 20, goal: null, maxSpins: 400 }), script(pockets));
  let s = reduce(createSession({ capital: 100, base: 1, limit: 20 }), { type: 'setMode', mode: 'system' });
  for (const pocket of pockets) {
    const stake = systemStake(s.game);
    if (stake === null) break;
    const spun = reduce(s, { type: 'spin', pocket, bet: 'red', stake });
    s = reduce(spun, { type: 'settle', id: spun.game.pending!.id });
  }
  assert.equal(capitalOf(s.game) - 100, result.net);
  assert.equal(s.game.events.length, result.spins);
});

test('the same seed gives the same experiment, whatever the slicing', () => {
  const a = complete(createRun(1, config({ players: 300, goal: 10 })), 300);
  const b = complete(createRun(2, config({ players: 300, goal: 10 })), 7);
  assert.deepEqual(a.byStrategy, b.byStrategy);
  const c = complete(createRun(3, config({ players: 300, goal: 10, seed: 2 })));
  assert.notDeepEqual(a.byStrategy.martingale.results, c.byStrategy.martingale.results);
});

test('players are independent of how many are simulated: player i is the same in every run', () => {
  const small = complete(createRun(1, config({ players: 50, goal: null, maxSpins: 200 })));
  const large = complete(createRun(2, config({ players: 500, goal: null, maxSpins: 200 })));
  assert.deepEqual(small.byStrategy.flat.results, large.byStrategy.flat.results.slice(0, 50));
});

test('both strategies read the same pockets', () => {
  const run = complete(createRun(1, config({ players: 1, goal: null, maxSpins: 1, capital: 10 })));
  const m = run.byStrategy.martingale.results[0];
  const f = run.byStrategy.flat.results[0];
  assert.equal(m.net, f.net); // one spin, stake 1 for both
});

test('the simulated martingale agrees with the exact cycle distribution', () => {
  const run = complete(createRun(1, config({ players: 100_000, seed: 2026 })), 5000);
  const s = summarizeStrategy(run.byStrategy.martingale);
  const t = cycleTheory(63, { base: 1, limit: 100 });
  // Four standard errors.
  const seShare = Math.sqrt((t.winProbability * t.collapseProbability) / s.sessions);
  assert.ok(Math.abs(s.winShare! - t.winProbability) < 4 * seShare, `share ${s.winShare}`);
  assert.ok(Math.abs(s.meanNet! - t.expected) < (4 * t.sd) / Math.sqrt(s.sessions), `mean ${s.meanNet}`);
  assert.deepEqual(new Set(run.byStrategy.martingale.results.map((r) => r.net)), new Set([1, -63]));
  assert.equal(s.stops.goal + s.stops.stuck, s.sessions);
});

test('every strategy loses about 1/37 of what it stakes', () => {
  const run = complete(createRun(1, config({ players: 4000, goal: 20, seed: 5 })), 500);
  for (const strategy of ['martingale', 'flat'] as const) {
    const s = summarizeStrategy(run.byStrategy[strategy]);
    assert.ok(Math.abs(s.netPerStaked! - THEORY.expectedPerToken) < 0.006, `${strategy}: ${s.netPerStaked}`);
  }
});

test('running statistics end on the final values', () => {
  const run = complete(createRun(1, config({ players: 1234 })));
  const m = run.byStrategy.martingale;
  const last = m.running.at(-1)!;
  const s = summarizeStrategy(m);
  assert.equal(last.n, 1234);
  assert.equal(last.meanNet, s.meanNet);
  assert.equal(last.winShare, s.winShare);
  assert.ok(m.running.length <= 201);
  assert.equal(m.paths.length, 20);
  assert.equal(m.paths[0].at(-1)! - 63, m.results[0].net);
});

test('histograms count every value once', () => {
  const discrete = histogram([1, 1, 1, -63, 1], [-63, 1]);
  assert.deepEqual(discrete, [{ lo: -63, hi: -63, count: 1 }, { lo: 1, hi: 1, count: 4 }]);
  const values = Array.from({ length: 500 }, (_, i) => i - 250);
  const bins = histogram(values, [-250, 249], 10);
  assert.equal(bins.reduce((sum, b) => sum + b.count, 0), 500);
});
