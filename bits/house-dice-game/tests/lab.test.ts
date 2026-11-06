import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceRun, createRun, MAX_SAMPLES, summarizeRun } from '../src/game/lab.ts';
import type { LabConfig } from '../src/game/lab.ts';
import { createDie, meanSpread, outcomeOf, rateSpread, THEORY } from '../src/game/rules.ts';
import type { Face } from '../src/game/rules.ts';
import { createSession, reduce, settledBalance } from '../src/game/session.ts';

const config = (over: Partial<LabConfig> = {}): LabConfig => ({
  rolls: 100,
  players: 1,
  referenceBalance: 20,
  ...over,
});

const script = (faces: Face[]) => {
  let i = 0;
  return () => faces[i++ % faces.length];
};

const complete = (run: ReturnType<typeof createRun>, roll: () => Face) => {
  while (!advanceRun(run, 7, roll));
  return run;
};

test('every player makes exactly the requested rolls', () => {
  const run = complete(createRun(1, config({ rolls: 1000, players: 5 })), createDie());
  assert.ok(run.trajectories.every((t) => t.rolled === 1000));
  assert.equal(summarizeRun(run).rolls, 5000);
});

test('advancing a finished run does nothing', () => {
  const run = complete(createRun(1, config({ rolls: 10 })), script([6]));
  assert.ok(advanceRun(run, 50, script([1])));
  assert.equal(run.trajectories[0].rolled, 10);
  assert.equal(run.trajectories[0].net, 40);
});

test('the chunk size does not change the result', () => {
  const faces: Face[] = [1, 6, 2, 3, 6, 4, 5, 1];
  const a = createRun(1, config({ rolls: 64 }));
  advanceRun(a, 64, script(faces));
  const b = complete(createRun(2, config({ rolls: 64 })), script(faces));
  assert.deepEqual(a.trajectories, b.trajectories);
});

test('accounting matches the rules, sample by sample', () => {
  const run = createRun(1, config({ rolls: 6 }));
  advanceRun(run, 6, script([1, 2, 3, 4, 5, 6]));
  const [t] = run.trajectories;
  assert.equal(t.sixes, 1);
  assert.equal(t.net, -1);
  assert.deepEqual(t.samples.at(-1), { n: 6, net: -1, sixes: 1 });
});

test('samples are exact, thinned, and always include the last roll', () => {
  const run = createRun(1, config({ rolls: 10_001 }));
  advanceRun(run, 10_001, script([6, 1, 1, 1, 1, 1]));
  const { samples, net } = run.trajectories[0];
  assert.ok(samples.length <= MAX_SAMPLES + 1);
  assert.equal(samples.at(-1)!.n, 10_001);
  assert.equal(samples.at(-1)!.net, net);
});

test('the simulator can go below zero: it has no balance', () => {
  const run = createRun(1, config({ rolls: 50, referenceBalance: 5 }));
  advanceRun(run, 50, script([1]));
  assert.equal(run.trajectories[0].net, -50);
  assert.equal(run.trajectories[0].ruinedAt, 5);
});

test('ruin is the roll on which the real game would have ended', () => {
  const faces: Face[] = [1, 1, 6, 1, 1, 1, 1, 2, 3, 4, 5, 1, 2, 3];
  const roll = script(faces);
  const run = createRun(1, config({ rolls: faces.length, referenceBalance: 6 }));
  advanceRun(run, faces.length, roll);

  let s = createSession(6);
  for (const face of faces) {
    s = reduce(s, { type: 'roll', face });
    if (s.game.pending) s = reduce(s, { type: 'settle', id: s.game.pending.id });
  }
  assert.equal(settledBalance(s.game), 0);
  assert.equal(run.trajectories[0].ruinedAt, s.game.events.length);
});

test('a player who never runs out has no ruin', () => {
  const run = createRun(1, config({ rolls: 30 }));
  advanceRun(run, 30, script([6]));
  assert.equal(run.trajectories[0].ruinedAt, null);
  assert.equal(summarizeRun(run).meanRuinRoll, null);
  assert.equal(summarizeRun(run).ahead, 1);
});

test('an empty run has undefined rates', () => {
  const s = summarizeRun(createRun(1, config()));
  assert.equal(s.sixRate, null);
  assert.equal(s.meanNet, null);
});

test('summary totals agree with the rules', () => {
  const run = createRun(1, config({ rolls: 60, players: 3 }));
  advanceRun(run, 60, createDie());
  const s = summarizeRun(run);
  assert.equal(s.net, 4 * s.sixes - (s.rolls - s.sixes));
  assert.equal(s.net, run.trajectories.reduce((sum, t) => sum + t.net, 0));
});

test('running the simulator leaves a session untouched', () => {
  const session = reduce(createSession(10), { type: 'roll', face: 3 });
  const snapshot = JSON.stringify(session);
  advanceRun(createRun(1, config({ rolls: 1000 })), 1000, createDie());
  assert.equal(JSON.stringify(session), snapshot);
});

test('law of large numbers: 2·10⁶ rolls land within 3 standard errors of theory', () => {
  const run = createRun(1, config({ rolls: 2_000_000 }));
  advanceRun(run, 2_000_000, createDie());
  const s = summarizeRun(run);
  const n = s.rolls;
  assert.ok(Math.abs(s.meanNet! - THEORY.expectedNet) < 2.5 * meanSpread(n));
  assert.ok(Math.abs(s.sixRate! - THEORY.winProbability) < 2.5 * rateSpread(n));
});

test('about 95% of simulated players end inside the typical band', () => {
  const players = 4000;
  const rolls = 200;
  const run = createRun(1, config({ rolls, players }));
  advanceRun(run, rolls, createDie());
  const centre = rolls * THEORY.expectedNet;
  const half = 2 * THEORY.sd * Math.sqrt(rolls);
  const inside = run.trajectories.filter((t) => Math.abs(t.net - centre) <= half).length;
  const share = inside / players;
  assert.ok(share > 0.93 && share < 0.975, `share ${share}`);
});

test('outcomes used by the simulator are the game rules', () => {
  const run = createRun(1, config({ rolls: 1 }));
  advanceRun(run, 1, script([6]));
  assert.equal(run.trajectories[0].net, outcomeOf(6).net);
});
