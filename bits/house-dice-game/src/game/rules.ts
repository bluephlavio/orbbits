/**
 * The game's rules and the mathematics that follows from them. Pure: no state, no UI.
 * The theoretical values are computed from the rules, so they cannot drift apart.
 */

export const FACES = [1, 2, 3, 4, 5, 6] as const;
export type Face = (typeof FACES)[number];

export const RULES = { stake: 1, payout: 5, winningFace: 6 } as const;

export interface Outcome {
  face: Face;
  win: boolean;
  stake: number;
  /** Gross tokens received. */
  payout: number;
  /** payout − stake. */
  net: number;
}

export function outcomeOf(face: Face): Outcome {
  const win = face === RULES.winningFace;
  const payout = win ? RULES.payout : 0;
  return { face, win, stake: RULES.stake, payout, net: payout - RULES.stake };
}

const expectation = (f: (face: Face) => number) =>
  FACES.reduce((sum, face) => sum + f(face), 0) / FACES.length;

const expectedNet = expectation((face) => outcomeOf(face).net);
const variance = expectation((face) => (outcomeOf(face).net - expectedNet) ** 2);

export const THEORY = {
  winProbability: 1 / FACES.length,
  /** Expected net gain per roll: −1/6. */
  expectedNet,
  /** Variance of the net gain of one roll: 125/36. */
  variance,
  sd: Math.sqrt(variance),
  /** The house's average take, as a share of the stake: 1/6. */
  houseEdge: -expectedNet / RULES.stake,
} as const;

/** How many standard deviations the "typical" band spans on each side (≈ 95% of games). */
export const BAND_Z = 2;

/** Half-width of the typical band of the total gain after n rolls: 2σ√n. */
export const totalSpread = (n: number) => BAND_Z * THEORY.sd * Math.sqrt(n);

/** Half-width of the typical band of the mean gain per roll after n rolls: 2σ/√n. */
export const meanSpread = (n: number) => (BAND_Z * THEORY.sd) / Math.sqrt(n);

/** Half-width of the typical band of the relative frequency of a win after n rolls. */
export const rateSpread = (n: number) => {
  const p = THEORY.winProbability;
  return BAND_Z * Math.sqrt((p * (1 - p)) / n);
};

/** Fills a buffer with uniform random bytes. Injectable so that tests can be deterministic. */
export type ByteSource = (buffer: Uint8Array) => void;

const cryptoBytes: ByteSource = (buffer) => {
  crypto.getRandomValues(buffer);
};

/**
 * A fair die. Bytes ≥ 252 are rejected: 252 is the largest multiple of 6 below 256, and keeping
 * the rest would favour the low faces (modulo bias). Each call is independent of the others.
 */
export function createDie(source: ByteSource = cryptoBytes, bufferSize = 1024): () => Face {
  const buffer = new Uint8Array(bufferSize);
  let next = bufferSize;
  return () => {
    for (;;) {
      if (next === bufferSize) {
        source(buffer);
        next = 0;
      }
      const byte = buffer[next++];
      if (byte < 252) return ((byte % 6) + 1) as Face;
    }
  };
}
