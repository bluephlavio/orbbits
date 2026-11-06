/** Statistics and chart series derived from settled rolls. Pure functions of the log. */
import { THEORY, totalSpread } from './rules.ts';
import type { Outcome } from './rules.ts';

export interface Summary {
  rolls: number;
  wins: number;
  losses: number;
  /** wins / rolls, or null with no rolls: an undefined rate is not a rate of zero. */
  sixRate: number | null;
  /** Total net gain in tokens. */
  net: number;
  /** net / rolls, or null with no rolls. */
  meanNet: number | null;
}

export function summarize(outcomes: readonly Outcome[]): Summary {
  let wins = 0;
  let net = 0;
  for (const outcome of outcomes) {
    if (outcome.win) wins += 1;
    net += outcome.net;
  }
  const rolls = outcomes.length;
  return {
    rolls,
    wins,
    losses: rolls - wins,
    sixRate: rolls ? wins / rolls : null,
    net,
    meanNet: rolls ? net / rolls : null,
  };
}

export interface Point {
  x: number;
  y: number;
}

/** Cumulative net gain, from (0, 0). */
export function netSeries(outcomes: readonly Outcome[]): Point[] {
  const points: Point[] = [{ x: 0, y: 0 }];
  let net = 0;
  outcomes.forEach((outcome, i) => {
    net += outcome.net;
    points.push({ x: i + 1, y: net });
  });
  return points;
}

/** Balance after each roll, from (0, initialBalance). */
export const balanceSeries = (initialBalance: number, outcomes: readonly Outcome[]): Point[] =>
  netSeries(outcomes).map(({ x, y }) => ({ x, y: initialBalance + y }));

/** Relative frequency of the winning face after each roll; undefined at n = 0, so omitted. */
export function sixRateSeries(outcomes: readonly Outcome[]): Point[] {
  let wins = 0;
  return outcomes.map((outcome, i) => {
    if (outcome.win) wins += 1;
    return { x: i + 1, y: wins / (i + 1) };
  });
}

export const expectedNetAfter = (n: number) => n * THEORY.expectedNet;

/** The expected value and its typical spread: the band drawn around the theoretical line. */
export const expectedBand = (n: number, start = 0) => {
  const centre = start + expectedNetAfter(n);
  const spread = totalSpread(n);
  return { x: n, lo: centre - spread, hi: centre + spread };
};

/** Evenly spaced x values from `from` to `to`, enough to draw √n curves smoothly. */
export function grid(from: number, to: number, steps = 60): number[] {
  if (to <= from) return [from];
  const values: number[] = [];
  for (let i = 0; i <= steps; i += 1) values.push(from + ((to - from) * i) / steps);
  return values;
}
