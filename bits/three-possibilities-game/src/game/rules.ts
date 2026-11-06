/**
 * The rules of the three possibilities and the mathematics that follows from them. Pure: no state, no
 * UI. Every part of the Bit (the session, the simulator, the reasoning, the charts) goes through
 * these functions, so that they cannot disagree on what a game is.
 *
 * The protocol, which is the whole problem:
 *   - the meteorite is placed before the player chooses;
 *   - the game knows where it is, and never opens the chosen option or the meteorite;
 *   - with two stones available, a fair coin decides which one to open;
 *   - the player may always keep the option or take the only other closed one.
 */

export const OPTIONS = [0, 1, 2] as const;
export type Option = (typeof OPTIONS)[number];

/** How an option is named on screen. */
export const LABELS = ['I', 'II', 'III'] as const;

export type Strategy = 'stay' | 'switch';
export const STRATEGIES = ['stay', 'switch'] as const;

export type Coin = 0 | 1;

/** The options the game may open: not the chosen one, not the one with the meteorite. */
export const openable = (prize: Option, pick: Option): Option[] =>
  OPTIONS.filter((option) => option !== prize && option !== pick);

/** The option opened by the game. The coin only matters when there are two stones to open. */
export function hostOpens(prize: Option, pick: Option, coin: Coin): Option {
  const options = openable(prize, pick);
  return options[options.length === 2 ? coin : 0];
}

/** The only other option still closed. */
export const switchTarget = (pick: Option, opened: Option): Option =>
  OPTIONS.find((option) => option !== pick && option !== opened)!;

export const strategyOf = (pick: Option, final: Option): Strategy =>
  final === pick ? 'stay' : 'switch';

export const finalOption = (strategy: Strategy, pick: Option, opened: Option): Option =>
  strategy === 'stay' ? pick : switchTarget(pick, opened);

/** Every game the protocol allows, each with its exact probability. */
export function allGames() {
  const games: { prize: Option; pick: Option; coin: Coin; opened: Option; weight: number }[] = [];
  const cells = OPTIONS.length ** 2 * 2;
  for (const prize of OPTIONS) {
    for (const pick of OPTIONS) {
      for (const coin of [0, 1] as const) {
        games.push({ prize, pick, coin, opened: hostOpens(prize, pick, coin), weight: 1 / cells });
      }
    }
  }
  return games;
}

const winProbability = (strategy: Strategy) =>
  allGames()
    .filter(({ prize, pick, opened }) => finalOption(strategy, pick, opened) === prize)
    .reduce((sum, game) => sum + game.weight, 0);

/** Computed from the rules by enumeration, not typed in: 1/3 and 2/3. */
export const THEORY: Record<Strategy, number> = {
  stay: winProbability('stay'),
  switch: winProbability('switch'),
};

/** Fills a buffer with uniform random bytes. Injectable so that tests can be deterministic. */
export type ByteSource = (buffer: Uint8Array) => void;

const cryptoBytes: ByteSource = (buffer) => {
  crypto.getRandomValues(buffer);
};

export interface Random {
  /** A uniform integer in [0, n). */
  below: (n: number) => number;
  option: () => Option;
  coin: () => Coin;
}

/**
 * Fair draws from random bytes. Bytes at or above the largest multiple of n are rejected: keeping
 * them would favour the low values (modulo bias). For n = 3 that discards only the byte 255.
 */
export function createRandom(source: ByteSource = cryptoBytes, bufferSize = 1024): Random {
  const buffer = new Uint8Array(bufferSize);
  let next = bufferSize;
  const byte = () => {
    if (next === bufferSize) {
      source(buffer);
      next = 0;
    }
    return buffer[next++];
  };
  const below = (n: number) => {
    const limit = 256 - (256 % n);
    for (;;) {
      const value = byte();
      if (value < limit) return value % n;
    }
  };
  return {
    below,
    option: () => below(OPTIONS.length) as Option,
    coin: () => below(2) as Coin,
  };
}
