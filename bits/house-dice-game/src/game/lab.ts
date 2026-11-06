/**
 * The simulator: independent players, kept apart from the session on purpose. It shares the
 * rules and nothing else, and imports no session state.
 *
 * Simulated players have no balance. They record net gain, which may go negative, as if they
 * had unlimited credit. The balance constraint of the real game is reported on the side:
 * `ruinedAt` is the roll on which a player starting from `referenceBalance` would have run out.
 */
import { outcomeOf } from './rules.ts';
import type { Face } from './rules.ts';

export interface LabConfig {
  rolls: number;
  players: number;
  referenceBalance: number;
}

export interface LabSample {
  n: number;
  net: number;
  sixes: number;
}

export interface Trajectory {
  rolled: number;
  sixes: number;
  net: number;
  ruinedAt: number | null;
  samples: LabSample[];
}

export interface LabRun {
  id: number;
  config: LabConfig;
  /** One sample every `stride` rolls: exact values, thinned for drawing. */
  stride: number;
  trajectories: Trajectory[];
}

export const MAX_SAMPLES = 200;

export function createRun(id: number, config: LabConfig): LabRun {
  return {
    id,
    config,
    stride: Math.max(1, Math.ceil(config.rolls / MAX_SAMPLES)),
    trajectories: Array.from({ length: config.players }, () => ({
      rolled: 0,
      sixes: 0,
      net: 0,
      ruinedAt: null,
      samples: [],
    })),
  };
}

/**
 * Rolls up to `steps` more times for every player, so all trajectories grow in step. Mutates
 * the run, which belongs to the simulator alone. Returns true once the run is complete.
 */
export function advanceRun(run: LabRun, steps: number, roll: () => Face): boolean {
  const { rolls, referenceBalance } = run.config;
  for (const t of run.trajectories) {
    const target = Math.min(rolls, t.rolled + steps);
    while (t.rolled < target) {
      const outcome = outcomeOf(roll());
      t.rolled += 1;
      t.net += outcome.net;
      if (outcome.win) t.sixes += 1;
      if (t.ruinedAt === null && t.net <= -referenceBalance) t.ruinedAt = t.rolled;
      if (t.rolled % run.stride === 0 || t.rolled === rolls) {
        t.samples.push({ n: t.rolled, net: t.net, sixes: t.sixes });
      }
    }
  }
  return run.trajectories.every((t) => t.rolled === rolls);
}

export interface RunSummary {
  rolls: number;
  sixes: number;
  sixRate: number | null;
  net: number;
  meanNet: number | null;
  /** Players with a positive total. */
  ahead: number;
  /** Players who would have run out of `referenceBalance` tokens. */
  ruined: number;
  /** Mean roll of ruin, among those players. */
  meanRuinRoll: number | null;
}

export function summarizeRun(run: LabRun): RunSummary {
  let rolls = 0;
  let sixes = 0;
  let net = 0;
  let ahead = 0;
  let ruined = 0;
  let ruinTotal = 0;
  for (const t of run.trajectories) {
    rolls += t.rolled;
    sixes += t.sixes;
    net += t.net;
    if (t.net > 0) ahead += 1;
    if (t.ruinedAt !== null) {
      ruined += 1;
      ruinTotal += t.ruinedAt;
    }
  }
  return {
    rolls,
    sixes,
    sixRate: rolls ? sixes / rolls : null,
    net,
    meanNet: rolls ? net / rolls : null,
    ahead,
    ruined,
    meanRuinRoll: ruined ? ruinTotal / ruined : null,
  };
}
