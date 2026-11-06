/**
 * The picture must tell the same story as the logic: these views are all that the UI draws.
 * Each test walks every game the rules allow.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { allGames, OPTIONS, finalOption, STRATEGIES } from '../src/game/rules.ts';
import { createState, reduce } from '../src/game/session.ts';
import type { State } from '../src/game/session.ts';
import { METEORITE, STONES, viewOf } from '../src/game/view.ts';

/** Every game, stopped at every phase. */
function everyMoment(visit: (state: State, game: ReturnType<typeof allGames>[0]) => void) {
  for (const game of allGames()) {
    for (const strategy of STRATEGIES) {
      let s = createState(game.prize);
      visit(s, game);
      s = reduce(s, { type: 'pick', option: game.pick, coin: game.coin });
      visit(s, game);
      s = reduce(s, { type: 'opened', id: s.live.id });
      visit(s, game);
      s = reduce(s, { type: 'decide', option: finalOption(strategy, game.pick, game.opened) });
      visit(s, game);
      s = reduce(s, { type: 'settle', id: s.live.id });
      visit(s, game);
    }
  }
}

test('a closed option shows nothing, in every moment of every game', () => {
  everyMoment(({ live }) => {
    for (const view of viewOf(live)) assert.equal(view.content !== null, view.open);
  });
});

test('at the start every option looks the same and can be chosen', () => {
  for (const prize of OPTIONS) {
    const views = viewOf(createState(prize).live);
    assert.ok(views.every((v) => !v.open && !v.chosen && v.action === 'pick'));
  }
});

test('before the final reveal only a stone is visible', () => {
  everyMoment(({ live }) => {
    if (live.phase === 'choose' || live.phase === 'revealing' || live.phase === 'done') return;
    const open = viewOf(live).filter((v) => v.open);
    assert.equal(open.length, 1);
    assert.equal(open[0].option, live.opened);
    assert.equal(open[0].content, 'stone');
  });
});

test('what is visible before the decision does not depend on the meteorite', () => {
  // Two deals that the player cannot tell apart must look identical in every detail.
  const looks = new Map<string, string>();
  for (const game of allGames()) {
    let s = reduce(createState(game.prize), { type: 'pick', option: game.pick, coin: game.coin });
    s = reduce(s, { type: 'opened', id: s.live.id });
    const key = `${game.pick}-${game.opened}`;
    const look = JSON.stringify(viewOf(s.live));
    assert.equal(looks.get(key) ?? look, look);
    looks.set(key, look);
  }
  assert.equal(looks.size, 6);
});

test('the stone in an option depends on the option alone', () => {
  // Three kinds, one per position: which stone appears can carry no information.
  assert.equal(new Set(STONES.map((s) => s.detail)).size, OPTIONS.length);
  everyMoment(({ live }) => {
    for (const view of viewOf(live)) {
      if (view.content === 'stone') assert.equal(view.specimen, STONES[view.option]);
    }
  });
});

test('the meteorite always carries its own label, and a closed option none', () => {
  everyMoment(({ live }) => {
    for (const view of viewOf(live)) {
      if (view.content === 'meteorite') assert.equal(view.specimen, METEORITE);
      if (!view.open) assert.equal(view.specimen, null);
    }
  });
});

test('exactly two options can be pressed at the decision: stay on the chosen one, switch on the other', () => {
  everyMoment(({ live }) => {
    if (live.phase !== 'decide') return;
    const views = viewOf(live);
    assert.equal(views[live.pick!].action, 'stay');
    assert.equal(views[live.opened!].action, null);
    assert.deepEqual(views.map((v) => v.action).sort(), [null, 'stay', 'switch'].sort());
  });
});

test('during transitions nothing can be pressed', () => {
  everyMoment(({ live }) => {
    if (live.phase === 'opening' || live.phase === 'revealing' || live.phase === 'done') {
      assert.ok(viewOf(live).every((v) => v.action === null));
    }
  });
});

test('the mark follows the player: on the first choice, then on the final one', () => {
  everyMoment(({ live }) => {
    const chosen = viewOf(live).filter((v) => v.chosen);
    if (live.phase === 'choose') {
      assert.equal(chosen.length, 0);
      return;
    }
    assert.equal(chosen.length, 1);
    assert.equal(chosen[0].option, live.final ?? live.pick);
  });
});

test('during the reveal the final option is open, and the third stays closed', () => {
  everyMoment(({ live }) => {
    if (live.phase !== 'revealing') return;
    for (const view of viewOf(live)) {
      assert.equal(view.open, view.option === live.final || view.option === live.opened);
    }
  });
});

test('no verdict exists before the end', () => {
  everyMoment(({ live }) => {
    if (live.phase === 'done') return;
    assert.ok(viewOf(live).every((v) => v.verdict === null));
  });
});

test('at the end the verdicts tell the outcome', () => {
  everyMoment((state) => {
    if (state.live.phase !== 'done') return;
    const round = state.session.rounds.at(-1)!;
    const verdicts = viewOf(state.live).map((v) => v.verdict);
    assert.equal(verdicts[round.final], round.win ? 'won' : 'lost');
    assert.equal(verdicts.filter((v) => v === 'other').length, round.win ? 2 : 1);
    if (!round.win) assert.equal(verdicts[round.prize], 'missed');
  });
});

test('at the end everything is open, the meteorite is where the log says, once', () => {
  everyMoment((state) => {
    if (state.live.phase !== 'done') return;
    const views = viewOf(state.live);
    assert.ok(views.every((v) => v.open));
    const found = views.filter((v) => v.content === 'meteorite');
    assert.equal(found.length, 1);
    const round = state.session.rounds.at(-1)!;
    assert.equal(found[0].option, round.prize);
    assert.equal(views[round.final].chosen, true);
    assert.equal(views[round.final].content === 'meteorite', round.win);
  });
});
