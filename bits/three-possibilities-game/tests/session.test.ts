import assert from 'node:assert/strict';
import test from 'node:test';
import type { Option, Coin } from '../src/game/rules.ts';
import { switchTarget } from '../src/game/rules.ts';
import {
  canCloseSession,
  createState,
  deserialize,
  MAX_ARCHIVED,
  playedSessions,
  reduce,
  serialize,
} from '../src/game/session.ts';
import type { State } from '../src/game/session.ts';

const toDecision = (state: State, option: Option, coin: Coin = 0) => {
  const s = reduce(state, { type: 'pick', option, coin });
  return reduce(s, { type: 'opened', id: s.live.id });
};

/** Plays one game to the end and deals the next one. */
function play(state: State, pick: Option, strategy: 'stay' | 'switch', nextPrize: Option = 0) {
  let s = toDecision(state, pick);
  const option = strategy === 'stay' ? pick : switchTarget(pick, s.live.opened!);
  s = reduce(s, { type: 'decide', option });
  s = reduce(s, { type: 'settle', id: s.live.id });
  return reduce(s, { type: 'deal', prize: nextPrize });
}

test('a game walks through its five phases', () => {
  let s = createState(2);
  assert.equal(s.live.phase, 'choose');
  s = reduce(s, { type: 'pick', option: 0, coin: 0 });
  assert.equal(s.live.phase, 'opening');
  s = reduce(s, { type: 'opened', id: s.live.id });
  assert.equal(s.live.phase, 'decide');
  s = reduce(s, { type: 'decide', option: 2 });
  assert.equal(s.live.phase, 'revealing');
  s = reduce(s, { type: 'settle', id: s.live.id });
  assert.equal(s.live.phase, 'done');
  assert.deepEqual(s.session.rounds, [
    { n: 1, prize: 2, pick: 0, opened: 1, final: 2, strategy: 'switch', win: true },
  ]);
});

test('the opened option follows the rules for every deal', () => {
  for (const prize of [0, 1, 2] as const) {
    for (const option of [0, 1, 2] as const) {
      for (const coin of [0, 1] as const) {
        const { live } = reduce(createState(prize), { type: 'pick', option, coin });
        assert.notEqual(live.opened, option);
        assert.notEqual(live.opened, prize);
      }
    }
  }
});

test('confirming wins exactly when the first choice was right', () => {
  const right = play(createState(1), 1, 'stay').session.rounds[0];
  assert.deepEqual([right.strategy, right.win], ['stay', true]);
  const wrong = play(createState(1), 0, 'stay').session.rounds[0];
  assert.deepEqual([wrong.strategy, wrong.win], ['stay', false]);
});

test('switching loses exactly when the first choice was right', () => {
  const right = play(createState(1), 1, 'switch').session.rounds[0];
  assert.deepEqual([right.strategy, right.win], ['switch', false]);
  const wrong = play(createState(1), 0, 'switch').session.rounds[0];
  assert.deepEqual([wrong.strategy, wrong.win], ['switch', true]);
});

test('a second pick during the opening is ignored: the first choice stands', () => {
  const s = reduce(createState(0), { type: 'pick', option: 1, coin: 0 });
  const again = reduce(s, { type: 'pick', option: 2, coin: 1 });
  assert.equal(again, s);
});

test('many clicks in one tick produce one choice', () => {
  let s = createState(0);
  for (const option of [1, 1, 2, 0, 1, 2] as const) s = reduce(s, { type: 'pick', option, coin: 0 });
  assert.equal(s.live.pick, 1);
});

test('a decision cannot be taken before the opening has ended', () => {
  const s = reduce(createState(0), { type: 'pick', option: 1, coin: 0 });
  assert.equal(reduce(s, { type: 'decide', option: 1 }), s);
});

test('the opened option cannot be taken', () => {
  const s = toDecision(createState(0), 1);
  assert.equal(reduce(s, { type: 'decide', option: s.live.opened! }), s);
});

test('a decision cannot be changed once taken', () => {
  const s = reduce(toDecision(createState(0), 1), { type: 'decide', option: 1 });
  assert.equal(reduce(s, { type: 'decide', option: 0 }), s);
});

test('a game is logged once, whatever the number of settle callbacks', () => {
  let s = reduce(toDecision(createState(0), 1), { type: 'decide', option: 1 });
  s = reduce(s, { type: 'settle', id: s.live.id });
  const once = s;
  s = reduce(s, { type: 'settle', id: s.live.id });
  assert.equal(s, once);
  assert.equal(s.session.rounds.length, 1);
});

test('nothing is in the statistics until the reveal has ended', () => {
  let s = reduce(toDecision(createState(0), 1), { type: 'decide', option: 1 });
  assert.equal(s.session.rounds.length, 0);
  s = reduce(s, { type: 'settle', id: s.live.id });
  assert.equal(s.session.rounds.length, 1);
});

test('stale callbacks from an earlier game are rejected', () => {
  let s = reduce(createState(0), { type: 'pick', option: 1, coin: 0 });
  const stale = s.live.id;
  s = reduce(s, { type: 'clearAll', prize: 2 });
  s = reduce(s, { type: 'pick', option: 1, coin: 0 });
  assert.notEqual(s.live.id, stale);
  assert.equal(reduce(s, { type: 'opened', id: stale }), s);
});

test('a new game can only be dealt when the last one is finished', () => {
  for (const s of [
    createState(0),
    reduce(createState(0), { type: 'pick', option: 1, coin: 0 }),
    toDecision(createState(0), 1),
  ]) {
    assert.equal(reduce(s, { type: 'deal', prize: 1 }), s);
  }
});

test('dealing starts clean and takes the new position', () => {
  const s = play(createState(0), 1, 'stay', 2);
  assert.deepEqual(
    { phase: s.live.phase, prize: s.live.prize, pick: s.live.pick, opened: s.live.opened },
    { phase: 'choose', prize: 2, pick: null, opened: null },
  );
});

test('games count upwards inside a session', () => {
  let s = createState(0);
  for (let i = 0; i < 3; i += 1) s = play(s, 1, 'stay');
  assert.deepEqual(s.session.rounds.map((r) => r.n), [1, 2, 3]);
});

test('a new session archives the current one and keeps its games', () => {
  let s = play(createState(0), 1, 'stay');
  s = reduce(s, { type: 'newSession', prize: 1 });
  assert.equal(s.archive.length, 1);
  assert.equal(s.archive[0].rounds.length, 1);
  assert.equal(s.session.rounds.length, 0);
  assert.equal(s.session.id, 2);
});

test('a session cannot be closed empty, or in the middle of a decision', () => {
  const empty = createState(0);
  assert.ok(!canCloseSession(empty));
  assert.equal(reduce(empty, { type: 'newSession', prize: 1 }), empty);

  const deciding = toDecision(play(createState(0), 1, 'stay'), 1);
  assert.ok(!canCloseSession(deciding));
  assert.equal(reduce(deciding, { type: 'newSession', prize: 1 }), deciding);
});

test('the archive is bounded', () => {
  let s = createState(0);
  for (let i = 0; i < MAX_ARCHIVED + 5; i += 1) {
    s = reduce(play(s, 0, 'stay'), { type: 'newSession', prize: 0 });
  }
  assert.equal(s.archive.length, MAX_ARCHIVED);
  assert.equal(s.archive[0].id, 6);
});

test('clearAll removes everything, in any phase', () => {
  let s = reduce(play(createState(0), 1, 'stay'), { type: 'newSession', prize: 0 });
  s = toDecision(play(s, 0, 'switch'), 2);
  s = reduce(s, { type: 'clearAll', prize: 1 });
  assert.equal(playedSessions(s).length, 0);
  assert.equal(s.live.phase, 'choose');
  assert.equal(s.session.id, 1);
});

test('playedSessions leaves out an empty current session', () => {
  let s = play(createState(0), 1, 'stay');
  assert.equal(playedSessions(s).length, 1);
  s = reduce(s, { type: 'newSession', prize: 1 });
  assert.equal(playedSessions(s).length, 1);
  s = play(s, 1, 'stay');
  assert.equal(playedSessions(s).length, 2);
});

test('finished games survive a round trip through storage', () => {
  let s = play(createState(1), 0, 'switch', 2);
  s = play(s, 2, 'stay', 0);
  s = reduce(s, { type: 'newSession', prize: 1 });
  s = play(s, 1, 'switch', 2);
  const loaded = deserialize(serialize(s))!;
  assert.deepEqual(loaded.session, s.session);
  assert.deepEqual(loaded.archive, s.archive);
  assert.equal(loaded.nextSessionId, s.nextSessionId);
  assert.deepEqual(
    { prize: loaded.live.prize, phase: loaded.live.phase },
    { prize: s.live.prize, phase: 'choose' },
  );
});

test('a reload does not redraw the position of the meteorite', () => {
  for (const prize of [0, 1, 2] as const) {
    assert.equal(deserialize(serialize(createState(prize)))!.live.prize, prize);
  }
});

test('a reload during the decision returns to the same decision', () => {
  const s = toDecision(createState(1), 0);
  const { live } = deserialize(serialize(s))!;
  assert.equal(live.phase, 'decide');
  assert.deepEqual([live.prize, live.pick, live.opened], [s.live.prize, s.live.pick, s.live.opened]);
});

test('a reload during the opening skips the animation, not the opening', () => {
  const s = reduce(createState(1), { type: 'pick', option: 0, coin: 0 });
  const { live } = deserialize(serialize(s))!;
  assert.equal(live.phase, 'decide');
  assert.equal(live.opened, s.live.opened);
});

test('a reload cannot undo a decision being revealed', () => {
  const s = reduce(toDecision(createState(1), 0), { type: 'decide', option: 0 });
  const loaded = deserialize(serialize(s))!;
  assert.equal(loaded.session.rounds.length, 1);
  assert.equal(loaded.live.phase, 'done');
  assert.equal(loaded.live.final, 0);
});

test('a reload after the end shows the same finished game', () => {
  let s = reduce(toDecision(createState(1), 0), { type: 'decide', option: 0 });
  s = reduce(s, { type: 'settle', id: s.live.id });
  const { live } = deserialize(serialize(s))!;
  assert.deepEqual(
    [live.phase, live.prize, live.pick, live.opened, live.final],
    ['done', s.live.prize, s.live.pick, s.live.opened, s.live.final],
  );
});

test('a loaded game can go on to the end', () => {
  const loaded = deserialize(serialize(toDecision(createState(1), 0)))!;
  let s = reduce(loaded, { type: 'decide', option: 0 });
  s = reduce(s, { type: 'settle', id: s.live.id });
  assert.equal(s.session.rounds.length, 1);
});

test('garbage and impossible games are refused', () => {
  const good = JSON.parse(serialize(play(createState(0), 1, 'stay')));
  const tampered = (patch: object) => JSON.stringify({ ...good, ...patch });
  for (const text of [
    'nonsense',
    '{}',
    'null',
    tampered({ v: 99 }),
    tampered({ archive: 'x' }),
    tampered({ session: { i: 1, r: '012' } }),
    tampered({ session: { i: 1, r: '0129' } }),
    // The game opened the meteorite.
    tampered({ session: { i: 1, r: '1211' } }),
    // The game opened the chosen option.
    tampered({ session: { i: 1, r: '0111' } }),
    // The final option is the one the game opened.
    tampered({ session: { i: 1, r: '0122' } }),
    tampered({ archive: [{ i: 2, r: '' }] }),
    tampered({ live: { p: 7 } }),
    tampered({ live: { p: 0, k: 1, o: 0 } }),
    tampered({ live: { p: 0, k: 1 } }),
    tampered({ live: null, session: { i: 1, r: '' } }),
  ]) {
    assert.equal(deserialize(text), null, text);
  }
});
