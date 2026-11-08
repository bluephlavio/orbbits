/** Statistics and chart series derived from settled spins. Pure functions of the log. */
import { THEORY } from './rules.ts';
import type { Game, SpinEvent } from './session.ts';
import { capitalOf } from './session.ts';

export interface Point {
  x: number;
  y: number;
}

export interface Summary {
  spins: number;
  wins: number;
  losses: number;
  /** Spins that landed on zero: lost whichever colour was chosen. */
  zeros: number;
  staked: number;
  net: number;
  /** net / staked, or null before the first spin. */
  netPerStaked: number | null;
}

export function summarize(events: readonly SpinEvent[]): Summary {
  let wins = 0;
  let zeros = 0;
  let staked = 0;
  let net = 0;
  for (const e of events) {
    if (e.win) wins += 1;
    if (e.pocket === 0) zeros += 1;
    staked += e.stake;
    net += e.net;
  }
  return {
    spins: events.length,
    wins,
    losses: events.length - wins,
    zeros,
    staked,
    net,
    netPerStaked: staked ? net / staked : null,
  };
}

/** Capital after each spin, from (0, starting capital). */
export const capitalSeries = (game: Game): Point[] => [
  { x: 0, y: game.setup.capital },
  ...game.events.map((e) => ({ x: e.n, y: e.capital })),
];

export const stakedSeries = (events: readonly SpinEvent[]): Point[] => [
  { x: 0, y: 0 },
  ...events.map((e) => ({ x: e.n, y: e.staked })),
];

export const netSeries = (game: Game): Point[] =>
  capitalSeries(game).map(({ x, y }) => ({ x, y: y - game.setup.capital }));

/** The average loss that the staked total implies: −staked/37. A reference, not a forecast. */
export const expectedNetSeries = (events: readonly SpinEvent[]): Point[] =>
  stakedSeries(events).map(({ x, y }) => ({ x, y: y * THEORY.expectedPerToken }));

export type CycleEnd = 'won' | 'halted' | 'abandoned' | 'open';

export interface Cycle {
  /** First spin of the cycle. */
  from: number;
  spins: number;
  maxStake: number;
  net: number;
  end: CycleEnd;
}

/**
 * The system's cycles, in order. A cycle starts with a base stake and ends with a win, a halt, or
 * when the player leaves the system before either (abandoned, losses kept).
 */
export function cyclesOf(game: Game): Cycle[] {
  const cycles: Cycle[] = [];
  let open: Cycle | null = null;
  const close = (end: CycleEnd) => {
    if (open) cycles.push({ ...open, end });
    open = null;
  };
  for (const e of game.events) {
    if (e.mode !== 'system') {
      close('abandoned');
      continue;
    }
    if (e.level === 0) close('abandoned');
    open ??= { from: e.n, spins: 0, maxStake: 0, net: 0, end: 'open' };
    open.spins += 1;
    open.maxStake = Math.max(open.maxStake, e.stake);
    open.net += e.net;
    if (e.cycle === 'won' || e.cycle === 'halted') close(e.cycle);
  }
  if (open) {
    // Still running if the system is on and has not been left since; otherwise abandoned.
    const running = game.mode === 'system' && game.events.at(-1)?.mode === 'system' && game.level > 0;
    close(running ? 'open' : 'abandoned');
  }
  return cycles;
}

export interface GameResult {
  id: number;
  spins: number;
  staked: number;
  net: number;
  capital: number;
}

export const resultOf = (game: Game): GameResult => ({
  id: game.id,
  spins: game.events.length,
  staked: game.events.at(-1)?.staked ?? 0,
  net: capitalOf(game) - game.setup.capital,
  capital: capitalOf(game),
});

/** Evenly spaced x values from `from` to `to`. */
export function grid(from: number, to: number, steps = 60): number[] {
  if (to <= from) return [from];
  return Array.from({ length: steps + 1 }, (_, i) => from + ((to - from) * i) / steps);
}
