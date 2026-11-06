import assert from 'node:assert/strict';
import test from 'node:test';
import { allGames, finalOption, LABELS, STRATEGIES, switchTarget } from '../src/game/rules.ts';
import { createState, reduce } from '../src/game/session.ts';
import type { Live, State } from '../src/game/session.ts';
import { METEORITE } from '../src/game/view.ts';
import type { OptionView } from '../src/game/view.ts';
import { optionLabel, promptOf, RULE, SUBTITLE, TITLE } from '../src/ui/copy.ts';
import { frequency, games, integer, ofTotal, percent, times } from '../src/ui/format.ts';
import { linear, niceTicks, paddedDomain } from '../src/ui/scale.ts';

const tally = (wins: number, played: number) => ({ played, wins, rate: played ? wins / played : null });

test('numbers read the Italian way', () => {
  assert.equal(integer(1000), '1.000');
  assert.equal(percent(1 / 3), '33,3%');
  assert.equal(percent(2 / 3, 0), '67%');
});

test('singular and plural', () => {
  assert.equal(games(1), '1 partita');
  assert.equal(games(2), '2 partite');
  assert.equal(times(1), '1 volta');
  assert.equal(times(0), '0 volte');
});

test('few games give counts, not a percentage', () => {
  assert.equal(frequency(tally(0, 0)), '—');
  assert.equal(frequency(tally(2, 3)), '2 su 3');
  assert.equal(frequency(tally(3, 9)), '3 su 9');
  assert.equal(frequency(tally(3, 10)), '30,0%');
  assert.equal(ofTotal(tally(1000, 3000)), '1.000 su 3.000');
});

test('scales and ticks work on the frequency axis', () => {
  const y = linear([0, 1], [200, 0]);
  assert.equal(y(0), 200);
  assert.equal(y(1), 0);
  assert.deepEqual(niceTicks(0, 1, 5), [0, 0.2, 0.4, 0.6, 0.8, 1]);
  assert.deepEqual(niceTicks(0, 3, 6, true), [0, 1, 2, 3]);
  const [lo, hi] = paddedDomain([5, 5]);
  assert.ok(lo < 5 && hi > 5);
});

function moments(visit: (live: Live, state: State) => void) {
  for (const game of allGames()) {
    for (const strategy of STRATEGIES) {
      let s = createState(game.prize);
      visit(s.live, s);
      s = reduce(s, { type: 'pick', option: game.pick, coin: game.coin });
      visit(s.live, s);
      s = reduce(s, { type: 'opened', id: s.live.id });
      visit(s.live, s);
      s = reduce(s, { type: 'decide', option: finalOption(strategy, game.pick, game.opened) });
      visit(s.live, s);
      s = reduce(s, { type: 'settle', id: s.live.id });
      visit(s.live, s);
    }
  }
}

test('the title and the subtitle are the agreed ones', () => {
  assert.equal(TITLE, 'Tre possibilità');
  assert.equal(SUBTITLE, 'Una pietra venuta dalle stelle. Due nate dalla Terra.');
  assert.equal(promptOf(createState(0).live).detail, SUBTITLE);
});

test('no leftover narration on the stage', () => {
  moments((live) => {
    const { title, detail } = promptOf(live);
    assert.doesNotMatch(`${title} ${detail} ${RULE}`, /curator|cassa|casse|tesor|missione|laboratorio/i);
  });
});

test('at the decision the words name the right options', () => {
  moments((live) => {
    if (live.phase !== 'decide') return;
    const { title, detail } = promptOf(live);
    const other = switchTarget(live.pick!, live.opened!);
    assert.equal(title, `Nella ${LABELS[live.opened!]} c’è una pietra terrestre.`);
    assert.equal(detail, `Confermi la ${LABELS[live.pick!]} o cambi con la ${LABELS[other]}?`);
  });
});

test('the verdict says won or lost in so many words, and agrees with the log', () => {
  moments((live, state) => {
    if (live.phase !== 'done') return;
    const round = state.session.rounds.at(-1)!;
    const { title, detail } = promptOf(live);
    assert.equal(title.startsWith('Hai vinto'), round.win);
    assert.equal(title.startsWith('Hai perso'), !round.win);
    assert.ok(detail.includes(`nella ${LABELS[round.prize]}`));
    assert.ok(detail.includes(round.strategy === 'stay' ? 'confermato' : 'cambiato'));
  });
});

test('nothing said before the end depends on the meteorite', () => {
  const said = new Map<string, string>();
  moments((live) => {
    if (live.phase === 'done') return;
    const key = `${live.phase}-${live.pick}-${live.opened}-${live.final}`;
    const text = JSON.stringify(promptOf(live));
    assert.equal(said.get(key) ?? text, text);
    said.set(key, text);
  });
});

test('no words before the end favour a strategy, or give a number', () => {
  moments((live) => {
    if (live.phase === 'done') return;
    const { title, detail } = promptOf(live);
    assert.doesNotMatch(`${title} ${detail} ${RULE}`, /convien|meglio|probabil|%|1\/3|2\/3|raddopp/i);
  });
});

test('the rule states what the game knows and always does', () => {
  assert.match(RULE, /conosce la posizione del meteorite/);
  assert.match(RULE, /sempre/);
  assert.match(RULE, /pietre terrestri/);
  assert.match(RULE, /confermare o cambiare/);
});

test('every option has a name that says what pressing it does', () => {
  const view = (over: Partial<OptionView>): OptionView => ({
    option: 0,
    label: 'II',
    open: false,
    content: null,
    specimen: null,
    chosen: false,
    action: null,
    verdict: null,
    ...over,
  });
  assert.equal(optionLabel(view({ action: 'pick' })), 'Scegli la possibilità II');
  assert.equal(optionLabel(view({ action: 'stay', chosen: true })), 'Conferma la possibilità II');
  assert.equal(optionLabel(view({ action: 'switch' })), 'Cambia con la possibilità II');
  assert.equal(optionLabel(view({ specimen: METEORITE, chosen: true })), 'Possibilità II, la tua scelta, Meteorite');
});
