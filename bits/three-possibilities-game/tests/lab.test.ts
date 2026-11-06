import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceRun, createRun, FIRST_GAMES, MAX_SAMPLES, playPaired, summarizeRun } from '../src/game/lab.ts';
import { createRandom, THEORY } from '../src/game/rules.ts';
import type { ByteSource, Option } from '../src/game/rules.ts';
import { createState, reduce } from '../src/game/session.ts';

function seeded(seed: number): ByteSource {
  let state = seed >>> 0;
  return (buffer) => {
    for (let i = 0; i < buffer.length; i += 1) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      buffer[i] = state >>> 24;
    }
  };
}

const finished = (run: ReturnType<typeof createRun>, seed = 7) => {
  advanceRun(run, run.config.games, createRandom(seeded(seed)));
  return run;
};

test('on every paired game exactly one strategy wins', () => {
  const random = createRandom(seeded(1));
  for (let i = 0; i < 20_000; i += 1) {
    const game = playPaired(random);
    assert.notEqual(game.stayWins, game.switchWins);
    assert.notEqual(game.opened, game.pick);
    assert.notEqual(game.opened, game.prize);
  }
});

test('both winning and both losing never happen, and they are counted, not assumed', () => {
  const run = finished(createRun(1, { games: 5000, series: 4 }));
  const s = summarizeRun(run);
  assert.equal(s.played, 20_000);
  assert.equal(s.bothWin, 0);
  assert.equal(s.bothLose, 0);
  assert.equal(s.stayWins + s.switchWins, s.played);
});

test('frequencies approach the theory, for a fixed seed', () => {
  const s = summarizeRun(finished(createRun(1, { games: 40_000, series: 5 })));
  // 5 standard deviations over 200,000 games: 0.0053.
  assert.ok(Math.abs(s.stayRate! - THEORY.stay) < 0.0053, String(s.stayRate));
  assert.ok(Math.abs(s.switchRate! - THEORY.switch) < 0.0053, String(s.switchRate));
});

test('keeping wins exactly when the first choice was right', () => {
  const s = summarizeRun(finished(createRun(1, { games: 3000, series: 3 })));
  assert.equal(s.firstRight, s.stayWins);
  assert.equal(s.firstRightRate, s.stayRate);
});

test('the simulator and the real game agree on every configuration', () => {
  // Fixed draws, replayed through the reducer that the player uses.
  const bytes = [...Array(180).keys()].map((i) => (i * 37 + 11) % 255);
  const source: ByteSource = (buffer) => {
    bytes.forEach((b, i) => (buffer[i] = b));
  };
  const coinOf = (draws: ReturnType<typeof createRandom>) => draws.coin();

  const lab = createRandom(source, bytes.length);
  const mirror = createRandom(source, bytes.length);
  for (let i = 0; i < 40; i += 1) {
    const game = playPaired(lab);
    const prize = mirror.option();
    const pick = mirror.option();
    const coin = coinOf(mirror);
    const start = createState(prize);
    let s = reduce(start, { type: 'pick', option: pick, coin });
    assert.equal(s.live.opened, game.opened);
    s = reduce(s, { type: 'opened', id: s.live.id });
    const other = ([0, 1, 2] as Option[]).find((c) => c !== pick && c !== s.live.opened)!;
    for (const [option, expected] of [
      [pick, game.stayWins],
      [other, game.switchWins],
    ] as const) {
      let end = reduce(s, { type: 'decide', option });
      end = reduce(end, { type: 'settle', id: end.live.id });
      assert.equal(end.session.rounds[0].win, expected);
    }
  }
});

test('a run grows in step and reports when it has finished', () => {
  const run = createRun(1, { games: 100, series: 3 });
  const random = createRandom(seeded(3));
  assert.equal(advanceRun(run, 40, random), false);
  assert.ok(run.series.every((s) => s.played === 40));
  assert.equal(advanceRun(run, 40, random), false);
  assert.equal(advanceRun(run, 40, random), true);
  assert.ok(run.series.every((s) => s.played === 100));
  assert.equal(advanceRun(run, 40, random), true);
  assert.ok(run.series.every((s) => s.played === 100));
});

test('samples are exact values, thinned, and reach the last game', () => {
  const run = finished(createRun(1, { games: 10_000, series: 2 }));
  for (const s of run.series) {
    assert.ok(s.samples.length <= MAX_SAMPLES);
    const last = s.samples.at(-1)!;
    assert.equal(last.n, 10_000);
    assert.equal(last.stay, s.stayWins / s.played);
    assert.equal(last.change, s.switchWins / s.played);
  }
});

test('small runs keep every game', () => {
  const run = finished(createRun(1, { games: 50, series: 1 }));
  assert.equal(run.series[0].samples.length, 50);
});

test('the first games are recorded for reading, from one series only', () => {
  const run = finished(createRun(1, { games: 100, series: 5 }));
  assert.equal(run.firstGames.length, FIRST_GAMES);
});

test('an empty run has undefined rates', () => {
  const s = summarizeRun(createRun(1, { games: 10, series: 1 }));
  assert.equal(s.stayRate, null);
  assert.equal(s.seriesAgainst, 0);
});

test('series going against the theory are counted', () => {
  const run = createRun(1, { games: 10, series: 2 });
  run.series[0] = { ...run.series[0], played: 10, stayWins: 6, switchWins: 4 };
  run.series[1] = { ...run.series[1], played: 10, stayWins: 3, switchWins: 7 };
  assert.equal(summarizeRun(run).seriesAgainst, 1);
});

test('the simulator does not touch the game state', () => {
  const state = createState(1);
  const before = JSON.stringify(state);
  finished(createRun(1, { games: 1000, series: 3 }));
  assert.equal(JSON.stringify(state), before);
});
