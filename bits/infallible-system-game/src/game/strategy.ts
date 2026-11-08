/**
 * The table's limits and the two strategies, shared by the game and by the simulator so that both
 * play by exactly the same rules. Pure.
 *
 * The martingale stakes base · 2^level: level 0 at the start of a cycle, one more after each
 * loss, back to 0 after a win. It stops — it does not shrink its stake — when the next doubling is
 * not affordable or exceeds the table limit.
 */
import { THEORY } from './rules.ts';

export interface Table {
  /** Base stake of a strategy, in tokens. */
  base: number;
  /** Largest stake the table accepts, or null for no limit (simulation only). */
  limit: number | null;
}

export type Strategy = 'martingale' | 'flat';
export const STRATEGIES: readonly Strategy[] = ['martingale', 'flat'];

/** The smallest chip: a capital below it cannot bet at all. */
export const MIN_STAKE = 1;

export const isStakeAllowed = (stake: number, capital: number, limit: number | null) =>
  Number.isInteger(stake) && stake >= MIN_STAKE && stake <= capital && (limit === null || stake <= limit);

export const martingaleStake = (base: number, level: number) => base * 2 ** level;

export const stakeOf = (strategy: Strategy, base: number, level: number) =>
  strategy === 'martingale' ? martingaleStake(base, level) : base;

/** Tokens lost so far in a martingale cycle that has reached `level`: b(2^level − 1). */
export const cycleLoss = (base: number, level: number) => base * (2 ** level - 1);

/**
 * How many consecutive stakes b, 2b, 4b, … a cycle starting from `capital` can place: the largest
 * k with (2^k − 1)b ≤ capital and 2^(k−1)b ≤ limit. Capped, because without a limit a huge capital
 * would only make the loop long.
 */
export function maxLevels(capital: number, { base, limit }: Table, cap = 40): number {
  let k = 0;
  while (k < cap && cycleLoss(base, k + 1) <= capital && (limit === null || martingaleStake(base, k) <= limit)) {
    k += 1;
  }
  return k;
}

/** The exact distribution of one martingale cycle: it wins +base or collapses after k losses. */
export function cycleTheory(capital: number, table: Table) {
  const levels = maxLevels(capital, table);
  const q = THEORY.loseProbability;
  const collapse = levels === 0 ? 1 : q ** levels;
  const win = table.base;
  const loss = cycleLoss(table.base, levels);
  const expected = levels === 0 ? 0 : (1 - collapse) * win - collapse * loss;
  // Expected tokens staked in the cycle: stake at level j is placed if the first j spins lost.
  let staked = 0;
  for (let j = 0; j < levels; j += 1) staked += q ** j * martingaleStake(table.base, j);
  const variance = levels === 0 ? 0 : (1 - collapse) * (win - expected) ** 2 + collapse * (-loss - expected) ** 2;
  return {
    levels,
    /** Probability that the cycle ends in profit. */
    winProbability: levels === 0 ? 0 : 1 - collapse,
    collapseProbability: levels === 0 ? 0 : collapse,
    win,
    loss,
    expected,
    staked,
    sd: Math.sqrt(variance),
  };
}
