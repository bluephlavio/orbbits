import assert from 'node:assert/strict';
import test from 'node:test';
import type { BetColor, Pocket } from '../src/game/rules.ts';
import {
  canRestart,
  capitalOf,
  createSession,
  deserialize,
  ledgerOf,
  reduce,
  serialize,
  systemStake,
} from '../src/game/session.ts';
import type { Action, Session, Setup } from '../src/game/session.ts';
import { cyclesOf, summarize } from '../src/game/stats.ts';

// 1 is red, 2 is black, 0 is green.
const RED: Pocket = 1;
const BLACK: Pocket = 2;
const ZERO: Pocket = 0;

const setup = (over: Partial<Setup> = {}): Setup => ({ capital: 63, base: 1, limit: 100, ...over });

/** Spins and settles at once. */
function play(session: Session, pocket: Pocket, stake: number, bet: BetColor = 'red'): Session {
  const spun = reduce(session, { type: 'spin', pocket, bet, stake });
  if (spun === session) return session;
  return reduce(spun, { type: 'settle', id: spun.game.pending!.id });
}

const system = (over: Partial<Setup> = {}) => reduce(createSession(setup(over)), { type: 'setMode', mode: 'system' });

/** Lets the system play the given pockets, always on red. */
const runSystem = (session: Session, pockets: Pocket[]) =>
  pockets.reduce((s, p) => play(s, p, systemStake(s.game) ?? -1), session);

test('a spin pays 1:1, the zero loses, and the ledger always adds up', () => {
  let s = createSession(setup());
  s = play(s, RED, 5);
  assert.equal(capitalOf(s.game), 68);
  s = play(s, ZERO, 10, 'black');
  assert.equal(capitalOf(s.game), 58);
  const spun = reduce(s, { type: 'spin', pocket: BLACK, bet: 'red', stake: 8 });
  const { you, table, house } = ledgerOf(spun.game);
  assert.deepEqual({ you, table, house }, { you: 50, table: 8, house: 5 });
  assert.equal(you + table + house, 63);
});

test('free stakes must fit the capital and the table limit', () => {
  const s = createSession(setup({ capital: 63, limit: 50 }));
  for (const stake of [0, 64, 51, 2.5, -1]) {
    assert.equal(reduce(s, { type: 'spin', pocket: RED, bet: 'red', stake }), s, `stake ${stake}`);
  }
  assert.notEqual(reduce(s, { type: 'spin', pocket: RED, bet: 'red', stake: 50 }), s);
});

test('a second spin while one is pending, or a stale settle, does nothing', () => {
  const s = reduce(createSession(setup()), { type: 'spin', pocket: RED, bet: 'red', stake: 1 });
  assert.equal(reduce(s, { type: 'spin', pocket: RED, bet: 'red', stake: 1 }), s);
  assert.equal(reduce(s, { type: 'settle', id: s.game.pending!.id + 1 }), s);
  assert.equal(reduce(s, { type: 'setMode', mode: 'system' }), s);
  const settled = reduce(s, { type: 'settle', id: s.game.pending!.id });
  assert.equal(reduce(settled, { type: 'settle', id: s.game.pending!.id }), settled);
});

test('the system doubles 1–2–4–8–16–32 and a win recovers everything plus one', () => {
  let s = system();
  const stakes: number[] = [];
  for (let i = 0; i < 5; i += 1) {
    stakes.push(systemStake(s.game)!);
    s = play(s, BLACK, systemStake(s.game)!);
  }
  stakes.push(systemStake(s.game)!);
  assert.deepEqual(stakes, [1, 2, 4, 8, 16, 32]);
  assert.equal(capitalOf(s.game), 63 - 31);
  s = play(s, RED, 32);
  assert.equal(capitalOf(s.game), 64);
  assert.equal(systemStake(s.game), 1);
  assert.equal(s.game.events.at(-1)!.cycle, 'won');
});

test('the system refuses any stake but its own', () => {
  const s = runSystem(system(), [BLACK, BLACK]);
  assert.equal(systemStake(s.game), 4);
  assert.equal(reduce(s, { type: 'spin', pocket: RED, bet: 'red', stake: 1 }), s);
  assert.equal(reduce(s, { type: 'spin', pocket: RED, bet: 'red', stake: 8 }), s);
});

test('six losses with 63 tokens: the doubling is impossible and the system halts at −63', () => {
  const s = runSystem(system(), [BLACK, ZERO, BLACK, BLACK, BLACK, BLACK]);
  assert.equal(capitalOf(s.game), 0);
  assert.equal(s.game.halted, true);
  assert.equal(s.game.events.at(-1)!.cycle, 'halted');
  assert.equal(s.game.ended, 'broke');
  assert.equal(systemStake(s.game), null);
});

test('the table limit halts the system before the capital does', () => {
  let s = runSystem(system({ capital: 100, limit: 20 }), [BLACK, BLACK, BLACK, BLACK]);
  assert.equal(systemStake(s.game), 16);
  s = runSystem(s, [BLACK]);
  // Next would be 32 > 20: halted with 69 tokens left, the cycle closed at −31.
  assert.equal(s.game.halted, true);
  assert.equal(capitalOf(s.game), 69);
  assert.equal(s.game.ended, null);
  assert.deepEqual(cyclesOf(s.game).map((c) => [c.net, c.end]), [[-31, 'halted']]);
  assert.ok(canRestart(s.game));
  s = reduce(s, { type: 'restart' });
  assert.equal(systemStake(s.game), 1);
});

test('leaving the system mid-cycle abandons the cycle with its losses; coming back starts again', () => {
  let s = runSystem(system(), [BLACK, BLACK, RED, BLACK]);
  s = reduce(s, { type: 'setMode', mode: 'free' });
  s = play(s, RED, 3);
  s = reduce(s, { type: 'setMode', mode: 'system' });
  assert.equal(systemStake(s.game), 1);
  s = runSystem(s, [BLACK]);
  assert.deepEqual(cyclesOf(s.game).map((c) => c.end), ['won', 'abandoned', 'open']);
  assert.deepEqual(cyclesOf(s.game).map((c) => c.net), [1, -1, -1]);
});

test('a session can be stopped, then archived by a new one with the same setup', () => {
  let s = play(createSession(setup({ capital: 30 })), RED, 2);
  s = reduce(s, { type: 'stop' });
  assert.equal(s.game.ended, 'stopped');
  assert.equal(reduce(s, { type: 'spin', pocket: RED, bet: 'red', stake: 1 }), s);
  s = reduce(s, { type: 'newGame' });
  assert.equal(s.archive.length, 1);
  assert.equal(s.game.setup.capital, 30);
  assert.equal(s.game.events.length, 0);
});

test('the setup can change only before the first spin', () => {
  let s = reduce(createSession(setup()), { type: 'setSetup', setup: { capital: 500, base: 5, limit: 50 } });
  assert.deepEqual(s.game.setup, { capital: 500, base: 5, limit: 50 });
  s = play(s, RED, 1);
  assert.equal(reduce(s, { type: 'setSetup', setup: { capital: 30 } }), s);
});

test('summaries count spins, zeros and the staked total', () => {
  let s = createSession(setup());
  s = play(s, RED, 4);
  s = play(s, ZERO, 2);
  s = play(s, BLACK, 6, 'black');
  const summary = summarize(s.game.events);
  assert.deepEqual(summary, { spins: 3, wins: 2, losses: 1, zeros: 1, staked: 12, net: 8, netPerStaked: 8 / 12 });
});

test('storage replays moves and restores the same session', () => {
  let s = runSystem(system({ capital: 100, limit: 20 }), [BLACK, RED, BLACK, BLACK, BLACK, BLACK, BLACK]);
  s = reduce(s, { type: 'restart' });
  s = runSystem(s, [RED]);
  s = reduce(s, { type: 'setMode', mode: 'free' });
  s = play(s, ZERO, 7, 'black');
  s = reduce(s, { type: 'newGame' });
  s = play(s, BLACK, 3, 'black');
  const restored = deserialize(serialize(s))!;
  assert.ok(restored);
  assert.deepEqual(restored.game.events, s.game.events);
  assert.deepEqual(restored.archive[0].events, s.archive[0].events);
  assert.equal(restored.archive[0].ended, 'stopped');
  assert.equal(restored.game.mode, s.game.mode);
});

test('a pending spin is stored as played: reloading never refunds a stake', () => {
  const s = reduce(createSession(setup()), { type: 'spin', pocket: BLACK, bet: 'red', stake: 10 });
  const restored = deserialize(serialize(s))!;
  assert.equal(restored.game.pending, null);
  assert.equal(capitalOf(restored.game), 53);
});

test('a stored session that breaks the rules is discarded', () => {
  const s = play(createSession(setup()), RED, 1);
  const data = JSON.parse(serialize(s));
  data.game.x = '1r64';
  assert.equal(deserialize(JSON.stringify(data)), null);
  data.game.x = '37r1';
  assert.equal(deserialize(JSON.stringify(data)), null);
  data.game.x = '1r1,Q';
  assert.equal(deserialize(JSON.stringify(data)), null);
  assert.equal(deserialize('not json'), null);
});

test('clearAll keeps spin ids increasing', () => {
  const pending = reduce(createSession(setup()), { type: 'spin', pocket: RED, bet: 'red', stake: 1 });
  const cleared = reduce(pending, { type: 'clearAll' } as Action);
  assert.equal(cleared.game.pending, null);
  assert.ok(cleared.nextSpinId > pending.game.pending!.id);
});
