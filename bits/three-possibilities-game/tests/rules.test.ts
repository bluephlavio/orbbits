import assert from 'node:assert/strict';
import test from 'node:test';
import {
  allGames,
  OPTIONS,
  createRandom,
  finalOption,
  hostOpens,
  openable,
  strategyOf,
  switchTarget,
  THEORY,
} from '../src/game/rules.ts';
import type { ByteSource, Option } from '../src/game/rules.ts';

/** A deterministic byte source (a small LCG): the tests below must not flake. */
function seeded(seed: number): ByteSource {
  let state = seed >>> 0;
  return (buffer) => {
    for (let i = 0; i < buffer.length; i += 1) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      buffer[i] = state >>> 24;
    }
  };
}

const near = (actual: number, expected: number, tolerance = 1e-12) =>
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} is not ${expected}`);

test('the theoretical probabilities, computed from the rules, are exactly 1/3 and 2/3', () => {
  near(THEORY.stay, 1 / 3);
  near(THEORY.switch, 2 / 3);
  near(THEORY.stay + THEORY.switch, 1);
});

test('the enumeration covers every game, and the weights sum to one', () => {
  const games = allGames();
  assert.equal(games.length, 18);
  near(games.reduce((sum, g) => sum + g.weight, 0), 1);
});

test('the game never opens the chosen option, and never the meteorite', () => {
  for (const { prize, pick, opened } of allGames()) {
    assert.notEqual(opened, pick);
    assert.notEqual(opened, prize);
  }
});

test('there is always something to open, and a second option to switch to', () => {
  for (const prize of OPTIONS) {
    for (const pick of OPTIONS) {
      const options = openable(prize, pick);
      assert.equal(options.length, prize === pick ? 2 : 1);
      for (const opened of options) {
        const other = switchTarget(pick, opened);
        assert.equal(new Set([pick, opened, other]).size, 3);
      }
    }
  }
});

test('with two stones available, the coin picks either one', () => {
  for (const option of OPTIONS) {
    const seen = new Set([hostOpens(option, option, 0), hostOpens(option, option, 1)]);
    assert.deepEqual(seen, new Set(openable(option, option)));
  }
});

test('with one stone available, the coin changes nothing', () => {
  for (const prize of OPTIONS) {
    for (const pick of OPTIONS) {
      if (prize !== pick) assert.equal(hostOpens(prize, pick, 0), hostOpens(prize, pick, 1));
    }
  }
});

test('switching wins given every first choice and every option opened, not only on average', () => {
  for (const pick of OPTIONS) {
    for (const opened of OPTIONS) {
      const cases = allGames().filter((g) => g.pick === pick && g.opened === opened);
      if (cases.length === 0) continue;
      const total = cases.reduce((sum, g) => sum + g.weight, 0);
      const wins = cases
        .filter((g) => finalOption('switch', pick, opened) === g.prize)
        .reduce((sum, g) => sum + g.weight, 0);
      near(wins / total, 2 / 3);
    }
  }
});

test('on any one game exactly one of the two strategies wins', () => {
  for (const { prize, pick, opened } of allGames()) {
    const stay = finalOption('stay', pick, opened) === prize;
    const change = finalOption('switch', pick, opened) === prize;
    assert.notEqual(stay, change);
    assert.equal(stay, pick === prize);
  }
});

test('strategyOf is the inverse of finalOption', () => {
  for (const { pick, opened } of allGames()) {
    assert.equal(strategyOf(pick, finalOption('stay', pick, opened)), 'stay');
    assert.equal(strategyOf(pick, finalOption('switch', pick, opened)), 'switch');
  }
});

test('over every possible byte, draws are exactly uniform', () => {
  const allBytes: ByteSource = (buffer) => {
    buffer.forEach((_, i) => (buffer[i] = i));
  };
  const random = createRandom(allBytes, 256);
  // One pass over the buffer: 255 bytes survive for n = 3, 85 per value.
  const counts = [0, 0, 0];
  for (let i = 0; i < 255; i += 1) counts[random.option()] += 1;
  assert.deepEqual(counts, [85, 85, 85]);

  const coins = createRandom(allBytes, 256);
  const faces = [0, 0];
  for (let i = 0; i < 256; i += 1) faces[coins.coin()] += 1;
  assert.deepEqual(faces, [128, 128]);
});

test('the byte that would bias the draw is rejected', () => {
  let filled = false;
  const source: ByteSource = (buffer) => {
    buffer[0] = filled ? 2 : 255;
    filled = true;
  };
  // 255 % 3 is 0: without rejection the draw would be 0.
  assert.equal(createRandom(source, 1).option(), 2);
});

test('the meteorite lands in each option a third of the time', () => {
  const random = createRandom(seeded(12345));
  const counts = [0, 0, 0];
  const draws = 300_000;
  for (let i = 0; i < draws; i += 1) counts[random.option()] += 1;
  // 5 standard deviations: about 0.0043 of the draws.
  for (const count of counts) near(count / draws, 1 / 3, 0.0043);
});

test('position and first choice are independent, and the coin is fair at every tie', () => {
  const random = createRandom(seeded(99));
  const opened = new Map<Option, number[]>();
  for (let i = 0; i < 90_000; i += 1) {
    const pick = random.option();
    const coinOpen = hostOpens(pick, pick, random.coin());
    const row = opened.get(pick) ?? [0, 0, 0];
    row[coinOpen] += 1;
    opened.set(pick, row);
  }
  for (const [pick, row] of opened) {
    const [a, b] = openable(pick, pick);
    assert.equal(row[pick], 0);
    near(row[a] / (row[a] + row[b]), 0.5, 0.02);
  }
});
