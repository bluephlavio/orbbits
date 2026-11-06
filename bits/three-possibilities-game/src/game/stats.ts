/** Statistics and chart series derived from finished games. Pure functions of the log. */
import type { Strategy } from './rules.ts';
import type { Round, Session } from './session.ts';

/**
 * Below this many games a strategy gets counts instead of a percentage ("2 su 3"), and no
 * comparison is attempted. It is a convention for reading, not a statistical threshold: the
 * intervals below carry the uncertainty at every size.
 */
export const MIN_GAMES = 10;

/** A session needs this many games with a strategy to appear on the variability plot. */
export const MIN_SESSION_GAMES = 5;

export interface Tally {
  played: number;
  wins: number;
  /** wins / played, or null with no games: an undefined rate is not a rate of zero. */
  rate: number | null;
}

const tally = (played: number, wins: number): Tally => ({
  played,
  wins,
  rate: played ? wins / played : null,
});

export interface Summary {
  all: Tally;
  losses: number;
  stay: Tally;
  switch: Tally;
}

export function summarize(rounds: readonly Round[]): Summary {
  const count = (strategy?: Strategy) => {
    const chosen = strategy ? rounds.filter((r) => r.strategy === strategy) : rounds;
    return tally(chosen.length, chosen.filter((r) => r.win).length);
  };
  const all = count();
  return { all, losses: all.played - all.wins, stay: count('stay'), switch: count('switch') };
}

export interface Point {
  x: number;
  y: number;
}

/**
 * The frequency of victory after each game played with a strategy, counted on that strategy's own
 * games: on a shared axis of all games, a strategy not being used would draw a flat line that
 * means nothing.
 */
export function rateSeries(rounds: readonly Round[], strategy: Strategy): Point[] {
  let played = 0;
  let wins = 0;
  const points: Point[] = [];
  for (const round of rounds) {
    if (round.strategy !== strategy) continue;
    played += 1;
    if (round.win) wins += 1;
    points.push({ x: played, y: wins / played });
  }
  return points;
}

/**
 * The Wilson 95% interval for a proportion. Unlike the textbook p ± 2σ it behaves at small n and
 * near 0 and 1, which is exactly where a student's data live: 3 wins out of 3 is not "100% ± 0".
 */
export function wilson(wins: number, played: number): [number, number] | null {
  if (played === 0) return null;
  const z = 1.96;
  const p = wins / played;
  const denominator = 1 + (z * z) / played;
  const centre = (p + (z * z) / (2 * played)) / denominator;
  const spread = (z * Math.sqrt((p * (1 - p)) / played + (z * z) / (4 * played * played))) / denominator;
  return [Math.max(0, centre - spread), Math.min(1, centre + spread)];
}

export type Reading =
  | { kind: 'empty' }
  /** One strategy has too few games for anything to be said. */
  | { kind: 'few'; scarce: Strategy; played: number; other: number }
  /** Enough games, but the intervals overlap: chance could explain the gap. */
  | { kind: 'overlap' }
  /** The intervals are apart. */
  | { kind: 'apart'; higher: Strategy };

/**
 * What the data allow one to say, and no more. The test is deliberately simple and conservative
 * (do the two intervals touch?), because it can be explained by pointing at the plot.
 */
export function readingOf(stay: Tally, change: Tally): Reading {
  if (stay.played === 0 && change.played === 0) return { kind: 'empty' };
  if (Math.min(stay.played, change.played) < MIN_GAMES) {
    const scarce = stay.played <= change.played ? 'stay' : 'switch';
    const [a, b] = scarce === 'stay' ? [stay, change] : [change, stay];
    return { kind: 'few', scarce, played: a.played, other: b.played };
  }
  const [stayLo, stayHi] = wilson(stay.wins, stay.played)!;
  const [changeLo, changeHi] = wilson(change.wins, change.played)!;
  if (stayHi >= changeLo && changeHi >= stayLo) return { kind: 'overlap' };
  return { kind: 'apart', higher: stayLo > changeHi ? 'stay' : 'switch' };
}

/** The frequency of each strategy in every session that used it enough. */
export function sessionRates(sessions: readonly Session[], strategy: Strategy) {
  const rates: { id: number; rate: number }[] = [];
  let excluded = 0;
  for (const session of sessions) {
    const { played, rate } = summarize(session.rounds)[strategy];
    if (played >= MIN_SESSION_GAMES) rates.push({ id: session.id, rate: rate! });
    else if (played > 0) excluded += 1;
  }
  return { rates, excluded };
}

export const pooledRounds = (sessions: readonly Session[]) => sessions.flatMap((s) => s.rounds);
