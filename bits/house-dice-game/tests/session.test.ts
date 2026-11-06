import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canRoll,
  canStop,
  createSession,
  deserialize,
  ledgerOf,
  MAX_ARCHIVED,
  playedGames,
  reduce,
  serialize,
  settledBalance,
} from '../src/game/session.ts';
import type { Session } from '../src/game/session.ts';
import type { Face } from '../src/game/rules.ts';

function play(session: Session, faces: Face[]) {
  for (const face of faces) {
    session = reduce(session, { type: 'roll', face });
    session = reduce(session, { type: 'settle', id: session.game.pending!.id });
  }
  return session;
}

test('a game starts with the configured balance and nothing logged', () => {
  const { game } = createSession(35);
  assert.equal(settledBalance(game), 35);
  assert.equal(game.events.length, 0);
  assert.ok(canRoll(game));
  assert.ok(!canStop(game));
});

test('a losing roll costs exactly 1, a winning roll nets exactly +4', () => {
  let s = play(createSession(10), [3]);
  assert.equal(settledBalance(s.game), 9);
  s = play(s, [6]);
  assert.equal(settledBalance(s.game), 13);
  assert.deepEqual(
    s.game.events.map((e) => [e.n, e.face, e.net, e.balance]),
    [
      [1, 3, -1, 9],
      [2, 6, 4, 13],
    ],
  );
});

test('the stake leaves the balance at the roll, the payout arrives at settle', () => {
  let s = createSession(10);
  s = reduce(s, { type: 'roll', face: 6 });
  assert.deepEqual(ledgerOf(s.game), { you: 9, table: 1, house: 0 });
  s = reduce(s, { type: 'settle', id: s.game.pending!.id });
  assert.deepEqual(ledgerOf(s.game), { you: 14, table: 0, house: -4 });
});

test('tokens are conserved through a whole game', () => {
  let s = createSession(10);
  for (const face of [1, 6, 2, 6, 6, 3, 4, 5, 1, 2] as Face[]) {
    s = reduce(s, { type: 'roll', face });
    let { you, table, house } = ledgerOf(s.game);
    assert.equal(you + table + house, 10);
    s = reduce(s, { type: 'settle', id: s.game.pending!.id });
    ({ you, table, house } = ledgerOf(s.game));
    assert.equal(you + table + house, 10);
  }
});

test('extra rolls during a throw change nothing', () => {
  let s = reduce(createSession(10), { type: 'roll', face: 2 });
  const during = s;
  s = reduce(s, { type: 'roll', face: 6 });
  s = reduce(s, { type: 'roll', face: 5 });
  assert.equal(s, during);
  assert.equal(s.game.pending?.face, 2);
});

test('settling twice logs one event and pays once', () => {
  let s = reduce(createSession(10), { type: 'roll', face: 6 });
  const id = s.game.pending!.id;
  s = reduce(s, { type: 'settle', id });
  const once = s;
  s = reduce(s, { type: 'settle', id });
  assert.equal(s, once);
  assert.equal(s.game.events.length, 1);
  assert.equal(settledBalance(s.game), 14);
});

test('a stale settle cannot settle a later roll', () => {
  let s = reduce(createSession(10), { type: 'roll', face: 6 });
  const stale = s.game.pending!.id;
  s = reduce(s, { type: 'clearAll' });
  s = reduce(s, { type: 'roll', face: 1 });
  const during = s;
  s = reduce(s, { type: 'settle', id: stale });
  assert.equal(s, during);
  assert.equal(s.game.events.length, 0);
});

test('nothing can stop, restart or reconfigure a game during a throw', () => {
  let s = play(createSession(10), [1]);
  s = reduce(s, { type: 'roll', face: 2 });
  const during = s;
  for (const action of [
    { type: 'stop' },
    { type: 'newGame' },
    { type: 'setInitialBalance', value: 50 },
  ] as const) {
    assert.equal(reduce(s, action), during);
  }
});

test('reaching 0 ends the game and refuses further rolls', () => {
  let s = play(createSession(2), [1, 1]);
  assert.equal(settledBalance(s.game), 0);
  assert.equal(s.game.ended, 'broke');
  assert.ok(!canRoll(s.game));
  const ended = s;
  s = reduce(s, { type: 'roll', face: 6 });
  assert.equal(s, ended);
});

test('the balance never goes negative', () => {
  let s = createSession(3);
  for (let i = 0; i < 20; i += 1) {
    s = reduce(s, { type: 'roll', face: 1 });
    if (s.game.pending) s = reduce(s, { type: 'settle', id: s.game.pending.id });
    assert.ok(settledBalance(s.game) >= 0);
  }
  assert.equal(s.game.events.length, 3);
});

test('a win on the last token saves the game', () => {
  const s = play(createSession(1), [6]);
  assert.equal(settledBalance(s.game), 5);
  assert.equal(s.game.ended, null);
});

test('stopping ends the game and is refused without a roll', () => {
  let s = createSession(10);
  assert.equal(reduce(s, { type: 'stop' }), s);
  s = reduce(play(s, [1]), { type: 'stop' });
  assert.equal(s.game.ended, 'stopped');
  const stopped = s;
  assert.equal(reduce(s, { type: 'roll', face: 6 }), stopped);
});

test('the starting balance is configurable only before the first roll, within limits', () => {
  let s = createSession(10);
  s = reduce(s, { type: 'setInitialBalance', value: 50 });
  assert.equal(settledBalance(s.game), 50);
  for (const value of [0, -5, 2.5, Number.NaN, 1001]) {
    assert.equal(reduce(s, { type: 'setInitialBalance', value }), s);
  }
  s = play(s, [1]);
  assert.equal(reduce(s, { type: 'setInitialBalance', value: 10 }), s);
});

test('a new game archives the old one exactly once and keeps its starting balance', () => {
  let s = play(createSession(30), [1, 6]);
  s = reduce(s, { type: 'newGame' });
  assert.equal(s.archive.length, 1);
  assert.equal(s.archive[0].ended, 'stopped');
  assert.equal(settledBalance(s.game), 30);
  assert.equal(s.game.events.length, 0);
  s = reduce(s, { type: 'newGame' }); // nothing to archive
  assert.equal(s.archive.length, 1);
  assert.deepEqual(
    playedGames(play(s, [2])).map((g) => g.id),
    [1, 2],
  );
});

test('games do not mix: a new game starts its statistics from zero', () => {
  let s = play(createSession(30), [6, 6, 6]);
  s = reduce(s, { type: 'newGame' });
  s = play(s, [1]);
  assert.deepEqual(s.game.events.map((e) => e.n), [1]);
  assert.equal(s.archive[0].events.length, 3);
});

test('the archive is capped', () => {
  let s = createSession(10);
  for (let i = 0; i < MAX_ARCHIVED + 5; i += 1) s = reduce(play(s, [1]), { type: 'newGame' });
  assert.equal(s.archive.length, MAX_ARCHIVED);
  assert.equal(s.archive.at(-1)!.id, MAX_ARCHIVED + 5);
});

test('clearAll empties everything, also during a throw, keeping the balance choice', () => {
  let s = reduce(play(createSession(50), [1]), { type: 'newGame' });
  s = reduce(s, { type: 'roll', face: 3 });
  s = reduce(s, { type: 'clearAll' });
  assert.equal(s.archive.length, 0);
  assert.equal(s.game.pending, null);
  assert.equal(settledBalance(s.game), 50);
  assert.deepEqual(playedGames(s), []);
});

test('a session survives storage: everything is rebuilt by replay', () => {
  let s = reduce(play(createSession(12), [1, 6, 2]), { type: 'stop' });
  s = reduce(s, { type: 'newGame' });
  s = play(s, [3, 3]);
  const restored = deserialize(serialize(s))!;
  assert.deepEqual(restored.game.events, s.game.events);
  assert.deepEqual(restored.archive, s.archive);
  assert.equal(restored.nextGameId, s.nextGameId);
  const next = reduce(restored, { type: 'newGame' });
  assert.equal(next.game.id, s.nextGameId);
});

test('a reload during a throw does not refund the stake', () => {
  const s = reduce(play(createSession(10), [1]), { type: 'roll', face: 2 });
  const restored = deserialize(serialize(s))!;
  assert.equal(restored.game.pending, null);
  assert.equal(restored.game.events.length, 2);
  assert.equal(settledBalance(restored.game), 8);
});

test('a broke game is still broke after a reload', () => {
  const restored = deserialize(serialize(play(createSession(1), [1])))!;
  assert.equal(restored.game.ended, 'broke');
});

test('unreadable or impossible storage is refused', () => {
  const stored = (game: object) => JSON.stringify({ v: 1, game, archive: [], next: 2 });
  for (const text of [
    '',
    'not json',
    '{}',
    'null',
    JSON.stringify({ v: 99, game: {}, archive: [], next: 2 }),
    stored({ i: 1, b: 10, f: '7', e: null }),
    stored({ i: 1, b: 0, f: '', e: null }),
    stored({ i: 1, b: 2, f: '1111', e: null }), // rolls after running out of tokens
    stored({ i: 'x', b: 10, f: '', e: null }),
  ]) {
    assert.equal(deserialize(text), null, text);
  }
});
