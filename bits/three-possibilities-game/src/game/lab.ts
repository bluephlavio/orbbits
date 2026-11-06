/**
 * The simulator, kept apart from the session on purpose: it shares the rules and nothing else.
 *
 * Its experiment is paired. Each simulated configuration (meteorite, first choice, option opened)
 * is resolved with both strategies, so what is compared is the same games played two ways. That
 * is what makes complementarity observable: "both win" and "both lose" are counted, not assumed.
 *
 * The opening goes through `hostOpens`, as in the game. No shortcut such as "switching wins
 * when the first choice is wrong": that is the conclusion, and the simulator must not assume it.
 */
import { finalOption, hostOpens } from './rules.ts';
import type { Option, Random } from './rules.ts';

export interface LabConfig {
  /** Games in each series. */
  games: number;
  /** Independent series. */
  series: number;
}

export interface PairedGame {
  prize: Option;
  pick: Option;
  opened: Option;
  stayWins: boolean;
  switchWins: boolean;
}

export function playPaired(random: Random): PairedGame {
  const prize = random.option();
  const pick = random.option();
  const opened = hostOpens(prize, pick, random.coin());
  return {
    prize,
    pick,
    opened,
    stayWins: finalOption('stay', pick, opened) === prize,
    switchWins: finalOption('switch', pick, opened) === prize,
  };
}

export interface LabSample {
  n: number;
  stay: number;
  change: number;
}

export interface SeriesRun {
  played: number;
  stayWins: number;
  switchWins: number;
  bothWin: number;
  bothLose: number;
  firstRight: number;
  samples: LabSample[];
}

export interface LabRun {
  id: number;
  config: LabConfig;
  /** One sample every `stride` games: exact values, thinned for drawing. */
  stride: number;
  series: SeriesRun[];
  /** The first games of the first series, shown one by one. */
  firstGames: PairedGame[];
}

export const MAX_SAMPLES = 200;
export const FIRST_GAMES = 8;

export function createRun(id: number, config: LabConfig): LabRun {
  return {
    id,
    config,
    stride: Math.max(1, Math.ceil(config.games / MAX_SAMPLES)),
    series: Array.from({ length: config.series }, () => ({
      played: 0,
      stayWins: 0,
      switchWins: 0,
      bothWin: 0,
      bothLose: 0,
      firstRight: 0,
      samples: [],
    })),
    firstGames: [],
  };
}

/**
 * Plays up to `steps` more games in every series, so all trajectories grow in step. Mutates the
 * run, which belongs to the simulator alone. Returns true once the run is complete.
 */
export function advanceRun(run: LabRun, steps: number, random: Random): boolean {
  const { games } = run.config;
  run.series.forEach((s, index) => {
    const target = Math.min(games, s.played + steps);
    while (s.played < target) {
      const game = playPaired(random);
      s.played += 1;
      if (game.stayWins) s.stayWins += 1;
      if (game.switchWins) s.switchWins += 1;
      if (game.stayWins && game.switchWins) s.bothWin += 1;
      if (!game.stayWins && !game.switchWins) s.bothLose += 1;
      if (game.pick === game.prize) s.firstRight += 1;
      if (index === 0 && run.firstGames.length < FIRST_GAMES) run.firstGames.push(game);
      if (s.played % run.stride === 0 || s.played === games) {
        s.samples.push({ n: s.played, stay: s.stayWins / s.played, change: s.switchWins / s.played });
      }
    }
  });
  return run.series.every((s) => s.played === games);
}

export interface RunSummary {
  played: number;
  stayWins: number;
  switchWins: number;
  stayRate: number | null;
  switchRate: number | null;
  bothWin: number;
  bothLose: number;
  firstRight: number;
  firstRightRate: number | null;
  /** Series in which switching did at least as badly as staying. */
  seriesAgainst: number;
}

export function summarizeRun(run: LabRun): RunSummary {
  const total = { played: 0, stayWins: 0, switchWins: 0, bothWin: 0, bothLose: 0, firstRight: 0 };
  let seriesAgainst = 0;
  for (const s of run.series) {
    total.played += s.played;
    total.stayWins += s.stayWins;
    total.switchWins += s.switchWins;
    total.bothWin += s.bothWin;
    total.bothLose += s.bothLose;
    total.firstRight += s.firstRight;
    if (s.played > 0 && s.switchWins <= s.stayWins) seriesAgainst += 1;
  }
  const rate = (wins: number) => (total.played ? wins / total.played : null);
  return {
    ...total,
    stayRate: rate(total.stayWins),
    switchRate: rate(total.switchWins),
    firstRightRate: rate(total.firstRight),
    seriesAgainst,
  };
}
