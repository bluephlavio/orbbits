/**
 * The simulator: many independent players, each playing one session, kept apart from the game on
 * purpose. It shares the wheel and the strategies (rules.ts, strategy.ts) and nothing else.
 *
 * Units, which the interface must never mix up:
 *   spin     one bet on red;
 *   session  one player's spins from the starting capital until a stop: the goal reached, the
 *            next stake impossible, or the spin cap;
 *   player   independent of every other: their own seeded stream of pockets.
 *
 * Both strategies play the *same* pockets: player i's martingale session and flat session read
 * the same stream (seed, i) from its start. They stop at different times, so one may read
 * further than the other. Nothing is shaped after the fact: every number is a count of these
 * sessions.
 */
import { colorOf, seededWheel } from './rules.ts';
import type { Pocket } from './rules.ts';
import { isStakeAllowed, stakeOf, STRATEGIES } from './strategy.ts';
import type { Strategy } from './strategy.ts';

export interface LabConfig {
  capital: number;
  base: number;
  limit: number | null;
  /** Stop once net gain ≥ goal; null plays until a stake is impossible or the cap. */
  goal: number | null;
  maxSpins: number;
  players: number;
  seed: number;
}

/** Why a session ended. */
export type Stop = 'goal' | 'stuck' | 'cap';

export interface SessionResult {
  net: number;
  staked: number;
  spins: number;
  stop: Stop;
}

/** Plays one session. `wheel` must be a fresh stream for this player. */
export function playSession(
  strategy: Strategy,
  config: Pick<LabConfig, 'capital' | 'base' | 'limit' | 'goal' | 'maxSpins'>,
  wheel: () => Pocket,
  path?: number[],
): SessionResult {
  const { base, limit, goal, maxSpins } = config;
  let capital = config.capital;
  let level = 0;
  let staked = 0;
  let spins = 0;
  path?.push(capital);
  for (;;) {
    const net = capital - config.capital;
    if (goal !== null && net >= goal) return { net, staked, spins, stop: 'goal' };
    if (spins >= maxSpins) return { net, staked, spins, stop: 'cap' };
    const stake = stakeOf(strategy, base, level);
    if (!isStakeAllowed(stake, capital, limit)) return { net, staked, spins, stop: 'stuck' };
    const win = colorOf(wheel()) === 'red';
    spins += 1;
    staked += stake;
    capital += win ? stake : -stake;
    level = win ? 0 : level + 1;
    path?.push(capital);
  }
}

/** Trajectories are kept for the first few players only: they are for looking at, not counting. */
export const TRACED = 20;
/** Points of the running statistics kept per run. */
export const RUNNING_SAMPLES = 200;

export interface RunningPoint {
  /** Sessions played so far. */
  n: number;
  meanNet: number;
  winShare: number;
}

export interface StrategyRun {
  results: SessionResult[];
  paths: number[][];
  running: RunningPoint[];
  sumNet: number;
  sumStaked: number;
  wins: number;
}

export interface LabRun {
  id: number;
  config: LabConfig;
  /** Players simulated so far. */
  done: number;
  stride: number;
  byStrategy: Record<Strategy, StrategyRun>;
}

const emptyStrategyRun = (): StrategyRun => ({ results: [], paths: [], running: [], sumNet: 0, sumStaked: 0, wins: 0 });

export function createRun(id: number, config: LabConfig): LabRun {
  return {
    id,
    config,
    done: 0,
    stride: Math.max(1, Math.ceil(config.players / RUNNING_SAMPLES)),
    byStrategy: { martingale: emptyStrategyRun(), flat: emptyStrategyRun() },
  };
}

/**
 * Simulates up to `players` more players. Mutates the run, which belongs to the simulator alone.
 * The result does not depend on the slice size: player i always reads stream i.
 */
export function advanceRun(run: LabRun, players: number): boolean {
  const { config } = run;
  const target = Math.min(config.players, run.done + players);
  for (let i = run.done; i < target; i += 1) {
    for (const strategy of STRATEGIES) {
      const s = run.byStrategy[strategy];
      const path = i < TRACED ? [] : undefined;
      const result = playSession(strategy, config, seededWheel(config.seed, i), path);
      s.results.push(result);
      if (path) s.paths.push(path);
      s.sumNet += result.net;
      s.sumStaked += result.staked;
      if (result.net > 0) s.wins += 1;
      const n = i + 1;
      if (n % run.stride === 0 || n === config.players) {
        s.running.push({ n, meanNet: s.sumNet / n, winShare: s.wins / n });
      }
    }
  }
  run.done = target;
  return run.done === config.players;
}

export interface StrategySummary {
  sessions: number;
  /** Sessions that ended with a profit. */
  wins: number;
  winShare: number | null;
  losses: number;
  meanNet: number | null;
  meanStaked: number | null;
  /** Total net over total staked: the house's take, seen from the player. */
  netPerStaked: number | null;
  meanSpins: number | null;
  totalSpins: number;
  worst: number | null;
  best: number | null;
  stops: Record<Stop, number>;
}

export function summarizeStrategy(s: StrategyRun): StrategySummary {
  const n = s.results.length;
  let losses = 0;
  let spins = 0;
  let worst = Infinity;
  let best = -Infinity;
  const stops: Record<Stop, number> = { goal: 0, stuck: 0, cap: 0 };
  for (const r of s.results) {
    if (r.net < 0) losses += 1;
    spins += r.spins;
    worst = Math.min(worst, r.net);
    best = Math.max(best, r.net);
    stops[r.stop] += 1;
  }
  return {
    sessions: n,
    wins: s.wins,
    winShare: n ? s.wins / n : null,
    losses,
    meanNet: n ? s.sumNet / n : null,
    meanStaked: n ? s.sumStaked / n : null,
    netPerStaked: s.sumStaked ? s.sumNet / s.sumStaked : null,
    meanSpins: n ? spins / n : null,
    totalSpins: spins,
    worst: n ? worst : null,
    best: n ? best : null,
    stops,
  };
}

export interface Bin {
  /** Inclusive lower edge, exclusive upper edge (the last bin includes its upper edge). */
  lo: number;
  hi: number;
  count: number;
}

/**
 * Counts results in bins. Few distinct values (a martingale's +1 and −63) get one bin each, so
 * that the bar sits exactly on its value; otherwise equal-width bins over the given domain.
 */
export function histogram(values: readonly number[], domain: readonly [number, number], bins = 24): Bin[] {
  const distinct = [...new Set(values)].sort((a, b) => a - b);
  if (distinct.length <= 12) {
    return distinct.map((v) => ({ lo: v, hi: v, count: values.filter((x) => x === v).length }));
  }
  const [lo, hi] = domain;
  const width = (hi - lo) / bins || 1;
  const counts = new Array<number>(bins).fill(0);
  for (const v of values) counts[Math.min(bins - 1, Math.max(0, Math.floor((v - lo) / width)))] += 1;
  return counts.map((count, i) => ({ lo: lo + i * width, hi: lo + (i + 1) * width, count }));
}

/** A fresh random seed, small enough to read aloud and type back. */
export const randomSeed = () => 1 + Math.floor(Math.random() * 99_999);
