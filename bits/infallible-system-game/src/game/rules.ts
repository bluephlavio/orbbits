/**
 * The wheel, the bet on a colour, and the mathematics that follows from them. Pure: no state,
 * no UI. Theoretical values are counted from the wheel itself, so they cannot drift from it.
 */

/** European single-zero wheel, pockets in the order they sit on the wheel, clockwise from 0. */
export const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14,
  31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
] as const;

export const POCKETS = WHEEL_ORDER.length; // 37

const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

export type Pocket = number; // 0 … 36
export type PocketColor = 'red' | 'black' | 'green';
export type BetColor = 'red' | 'black';
export const BET_COLORS: readonly BetColor[] = ['red', 'black'];

export const isPocket = (value: unknown): value is Pocket =>
  Number.isInteger(value) && (value as number) >= 0 && (value as number) < POCKETS;

export const colorOf = (pocket: Pocket): PocketColor =>
  pocket === 0 ? 'green' : RED_NUMBERS.has(pocket) ? 'red' : 'black';

export interface Outcome {
  pocket: Pocket;
  bet: BetColor;
  stake: number;
  win: boolean;
  /** +stake on a win (1:1), −stake otherwise: the zero loses for both colours. */
  net: number;
}

export function outcomeOf(pocket: Pocket, bet: BetColor, stake: number): Outcome {
  const win = colorOf(pocket) === bet;
  return { pocket, bet, stake, win, net: win ? stake : -stake };
}

const count = (color: PocketColor) => WHEEL_ORDER.filter((p) => colorOf(p) === color).length;

export const THEORY = {
  /** 18/37 */
  winProbability: count('red') / POCKETS,
  /** 19/37: the other colour and the zero. */
  loseProbability: (POCKETS - count('red')) / POCKETS,
  /** Expected net gain per token staked: −1/37. Every strategy inherits it (see strategy.ts). */
  expectedPerToken: (count('red') - (POCKETS - count('red'))) / POCKETS,
  /** The house's average take, as a share of the stake: 1/37 ≈ 2,70%. */
  houseEdge: 1 / POCKETS,
} as const;

// Randomness.

/** Fills a buffer with uniform random bytes. Injectable so that tests can be deterministic. */
export type ByteSource = (buffer: Uint8Array) => void;

const cryptoBytes: ByteSource = (buffer) => {
  crypto.getRandomValues(buffer);
};

/**
 * The game's wheel. Bytes ≥ 222 are rejected: 222 = 6 · 37 is the largest multiple of 37 below
 * 256, and keeping the rest would favour the low pockets (modulo bias).
 */
export function createWheel(source: ByteSource = cryptoBytes, bufferSize = 512): () => Pocket {
  const buffer = new Uint8Array(bufferSize);
  let next = bufferSize;
  return () => {
    for (;;) {
      if (next === bufferSize) {
        source(buffer);
        next = 0;
      }
      const byte = buffer[next++];
      if (byte < 222) return byte % POCKETS;
    }
  };
}

/** A 32-bit integer mixer (MurmurHash3's finaliser): nearby seeds give unrelated streams. */
const mix32 = (value: number) => {
  let h = value | 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
};

/**
 * A reproducible stream of uniform 32-bit integers (sfc32), one per (seed, stream) pair. The
 * simulator gives every player their own stream, so a player's spins do not depend on how the
 * work is sliced or on how many players come before.
 */
export function seededUint32(seed: number, stream = 0): () => number {
  // Both seed and stream reach every word of the state.
  const s = mix32(seed ^ 0x9e3779b9);
  const t = mix32(Math.imul(stream, 0x85ebca6b) ^ 0x632be5ab);
  let a = mix32(s ^ t);
  let b = mix32(a + t);
  let c = mix32(b ^ s);
  let d = mix32(c + 0x5bd1e995);
  const next = () => {
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return t >>> 0;
  };
  for (let i = 0; i < 16; i += 1) next();
  return next;
}

/** 2³² − (2³² mod 37): above it a 32-bit draw would favour the low pockets. */
const UINT32_LIMIT = 2 ** 32 - (2 ** 32 % POCKETS);

/** A wheel driven by a seeded stream: the same seed and stream always give the same pockets. */
export function seededWheel(seed: number, stream = 0): () => Pocket {
  const next = seededUint32(seed, stream);
  return () => {
    for (;;) {
      const value = next();
      if (value < UINT32_LIMIT) return value % POCKETS;
    }
  };
}
