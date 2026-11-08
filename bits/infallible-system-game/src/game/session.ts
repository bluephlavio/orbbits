/**
 * The session: the spins of one player from a starting capital until they stop or run out,
 * driven by a pure reducer. "Session" is the unit the whole Bit counts in: one session = one
 * player's run under one setup. A spin is one bet.
 *
 * A spin has two steps, as in house-dice-game. `spin` puts the stake on the table and fixes the
 * pocket (drawn by the caller, so the reducer stays pure); `settle` appends the event once the
 * ball has stopped. Only settled events exist for statistics, so an open chart cannot spoil a
 * spin. Every guard lives here: an extra click, a late animation callback, a mode switch during
 * a spin are no-ops by construction.
 *
 * In system mode the reducer, not the UI, decides the stake (strategy.ts), and it halts the
 * system when the next doubling is not allowed.
 */
import { isPocket, outcomeOf } from './rules.ts';
import type { BetColor, Outcome, Pocket } from './rules.ts';
import { isStakeAllowed, martingaleStake, MIN_STAKE } from './strategy.ts';

export type Mode = 'free' | 'system';

export interface Setup {
  capital: number;
  /** Base stake of the system. */
  base: number;
  /** The table limit: no single stake may exceed it. */
  limit: number;
}

export const DEFAULT_SETUP: Setup = { capital: 63, base: 1, limit: 100 };
export const CAPITAL_PRESETS = [30, 63, 100, 500] as const;
export const BASE_PRESETS = [1, 2, 5] as const;
export const LIMIT_PRESETS = [20, 50, 100, 500] as const;
export const MAX_CAPITAL = 100_000;
/** Oldest sessions are dropped beyond this, to keep the stored state small. */
export const MAX_ARCHIVED = 40;

/** Where a system cycle stands after a spin. */
export type CycleStep = 'won' | 'doubling' | 'halted';

export interface SpinEvent extends Outcome {
  /** 1-based position of the spin in its session. */
  n: number;
  /** Capital after the spin settled. */
  capital: number;
  /** Total staked in the session, this spin included. */
  staked: number;
  mode: Mode;
  /** Martingale level the stake was placed at; null in free play. */
  level: number | null;
  cycle: CycleStep | null;
}

export interface PendingSpin {
  id: number;
  pocket: Pocket;
  bet: BetColor;
  stake: number;
}

export type EndReason = 'broke' | 'stopped';

export interface Game {
  id: number;
  setup: Setup;
  /** The mode the session started in: needed to replay its moves. */
  startMode: Mode;
  mode: Mode;
  /** Current martingale level (0 = base stake). */
  level: number;
  /** The system cannot place its next stake: it waits for a restart or a switch to free play. */
  halted: boolean;
  events: readonly SpinEvent[];
  pending: PendingSpin | null;
  ended: EndReason | null;
  /** The accepted moves, in order: what is stored and replayed. */
  moves: readonly string[];
}

export interface Session {
  game: Game;
  /** Finished sessions, oldest first. The current one is never in here. */
  archive: readonly Game[];
  nextGameId: number;
  /** Never reset: a callback from a spin before `clearAll` can never match a later one. */
  nextSpinId: number;
}

export type Action =
  | { type: 'spin'; pocket: Pocket; bet: BetColor; stake: number }
  | { type: 'settle'; id: number }
  | { type: 'setMode'; mode: Mode }
  | { type: 'restart' }
  | { type: 'stop' }
  | { type: 'newGame' }
  | { type: 'setSetup'; setup: Partial<Setup> }
  | { type: 'clearAll' };

/** Capital from settled spins only: a stake in play is on the table. */
export const capitalOf = (game: Game) => game.events.at(-1)?.capital ?? game.setup.capital;

/** Where every token is. `you + table + house` always equals the starting capital. */
export function ledgerOf(game: Game) {
  const table = game.pending?.stake ?? 0;
  const you = capitalOf(game) - table;
  return { you, table, house: game.setup.capital - you - table };
}

export const stakedOf = (game: Game) => game.events.at(-1)?.staked ?? 0;

const systemBlocked = (game: Game, level: number, capital: number) =>
  !isStakeAllowed(martingaleStake(game.setup.base, level), capital, game.setup.limit);

/** The stake the system will place next, or null when it is off or halted. */
export const systemStake = (game: Game) =>
  game.mode === 'system' && !game.halted ? martingaleStake(game.setup.base, game.level) : null;

export const isOpen = (game: Game) => !game.pending && !game.ended;

export function canSpin(game: Game, stake: number) {
  if (!isOpen(game) || !isStakeAllowed(stake, capitalOf(game), game.setup.limit)) return false;
  return game.mode === 'free' || stake === systemStake(game);
}

export const canStop = (game: Game) => isOpen(game) && game.events.length > 0;

export const canRestart = (game: Game) =>
  isOpen(game) && game.mode === 'system' && game.halted && !systemBlocked(game, 0, capitalOf(game));

export const isValidSetup = ({ capital, base, limit }: Setup) =>
  [capital, base, limit].every(Number.isInteger) &&
  capital >= MIN_STAKE &&
  capital <= MAX_CAPITAL &&
  base >= MIN_STAKE &&
  limit >= MIN_STAKE;

function freshGame(id: number, setup: Setup, mode: Mode): Game {
  const game: Game = { id, setup, startMode: mode, mode, level: 0, halted: false, events: [], pending: null, ended: null, moves: [] };
  return mode === 'system' ? { ...game, halted: systemBlocked(game, 0, setup.capital) } : game;
}

export const createSession = (setup: Setup = DEFAULT_SETUP, mode: Mode = 'free'): Session => ({
  game: freshGame(1, setup, mode),
  archive: [],
  nextGameId: 2,
  nextSpinId: 1,
});

const spinMove = ({ pocket, bet, stake }: { pocket: Pocket; bet: BetColor; stake: number }) =>
  `${pocket}${bet === 'red' ? 'r' : 'b'}${stake}`;

function settle(game: Game, pending: PendingSpin): Game {
  const outcome = outcomeOf(pending.pocket, pending.bet, pending.stake);
  const capital = capitalOf(game) + outcome.net;
  const system = game.mode === 'system';
  const level = system ? (outcome.win ? 0 : game.level + 1) : game.level;
  const halted = system && systemBlocked(game, level, capital);
  const event: SpinEvent = {
    ...outcome,
    n: game.events.length + 1,
    capital,
    staked: stakedOf(game) + outcome.stake,
    mode: game.mode,
    level: system ? game.level : null,
    cycle: system ? (outcome.win ? 'won' : halted ? 'halted' : 'doubling') : null,
  };
  return {
    ...game,
    level,
    halted,
    events: [...game.events, event],
    pending: null,
    ended: capital < MIN_STAKE ? 'broke' : null,
  };
}

function reduceGame(game: Game, action: Action, spinId: number): Game {
  switch (action.type) {
    case 'spin': {
      if (!isPocket(action.pocket) || (action.bet !== 'red' && action.bet !== 'black')) return game;
      if (!canSpin(game, action.stake)) return game;
      const { pocket, bet, stake } = action;
      return { ...game, pending: { id: spinId, pocket, bet, stake }, moves: [...game.moves, spinMove(action)] };
    }

    case 'settle':
      if (game.pending?.id !== action.id) return game;
      return settle(game, game.pending);

    case 'setMode': {
      if (!isOpen(game) || game.mode === action.mode) return game;
      const moves = [...game.moves, action.mode === 'system' ? 'S' : 'F'];
      if (action.mode === 'free') return { ...game, mode: 'free', level: 0, halted: false, moves };
      // Entering the system always starts a new cycle: an abandoned one keeps its losses.
      return { ...game, mode: 'system', level: 0, halted: systemBlocked(game, 0, capitalOf(game)), moves };
    }

    case 'restart':
      if (!canRestart(game)) return game;
      return { ...game, level: 0, halted: false, moves: [...game.moves, 'R'] };

    case 'stop':
      if (!canStop(game)) return game;
      return { ...game, ended: 'stopped', moves: [...game.moves, 'X'] };

    case 'setSetup': {
      if (game.events.length > 0 || game.pending) return game;
      const setup = { ...game.setup, ...action.setup };
      if (!isValidSetup(setup)) return game;
      return freshGame(game.id, setup, game.mode);
    }

    default:
      return game;
  }
}

export function reduce(session: Session, action: Action): Session {
  const { game } = session;
  switch (action.type) {
    case 'newGame': {
      if (game.pending || game.events.length === 0) return session;
      const finished: Game = { ...game, ended: game.ended ?? 'stopped' };
      return {
        ...session,
        game: freshGame(session.nextGameId, game.setup, game.mode),
        archive: [...session.archive, finished].slice(-MAX_ARCHIVED),
        nextGameId: session.nextGameId + 1,
      };
    }

    case 'clearAll':
      return {
        game: freshGame(1, game.setup, game.mode),
        archive: [],
        nextGameId: 2,
        nextSpinId: session.nextSpinId,
      };

    default: {
      const next = reduceGame(game, action, session.nextSpinId);
      if (next === game) return session;
      return {
        ...session,
        game: next,
        nextSpinId: action.type === 'spin' ? session.nextSpinId + 1 : session.nextSpinId,
      };
    }
  }
}

/** Every session with at least one spin: the archive, then the current one. */
export const playedGames = (session: Session): readonly Game[] =>
  session.game.events.length > 0 ? [...session.archive, session.game] : session.archive;

/** Which modes a session used. */
export function modesOf(game: Game): 'free' | 'system' | 'mixed' | null {
  const free = game.events.some((e) => e.mode === 'free');
  const system = game.events.some((e) => e.mode === 'system');
  return free && system ? 'mixed' : system ? 'system' : free ? 'free' : null;
}

// Persistence. Only moves are stored: events, capitals and the system's state are recomputed by
// replaying them through the reducer, so a stored session cannot hold inconsistent accounting.

interface StoredGame {
  i: number;
  c: number;
  b: number;
  l: number;
  m: 'f' | 's';
  x: string;
  e: EndReason | null;
}

const VERSION = 1;

const storeGame = (game: Game): StoredGame => ({
  i: game.id,
  c: game.setup.capital,
  b: game.setup.base,
  l: game.setup.limit,
  m: game.startMode === 'system' ? 's' : 'f',
  // A spin in progress is already a move: reloading settles it, it never refunds the stake.
  x: game.moves.join(','),
  e: game.ended,
});

export const serialize = (session: Session) =>
  JSON.stringify({
    v: VERSION,
    game: storeGame(session.game),
    archive: session.archive.map(storeGame),
    next: session.nextGameId,
  });

const SPIN_MOVE = /^(\d{1,2})([rb])(\d{1,7})$/;

export function replay(stored: StoredGame): Game | null {
  if (!Number.isInteger(stored?.i) || typeof stored.x !== 'string') return null;
  const setup = { capital: stored.c, base: stored.b, limit: stored.l };
  if (!isValidSetup(setup) || (stored.m !== 'f' && stored.m !== 's')) return null;
  let session = createSession(setup, stored.m === 's' ? 'system' : 'free');
  session = { ...session, game: { ...session.game, id: stored.i } };
  for (const move of stored.x ? stored.x.split(',') : []) {
    const before = session;
    const spin = SPIN_MOVE.exec(move);
    if (spin) {
      session = reduce(session, {
        type: 'spin',
        pocket: Number(spin[1]),
        bet: spin[2] === 'r' ? 'red' : 'black',
        stake: Number(spin[3]),
      });
      if (session === before) return null; // a stake the rules would have refused
      session = reduce(session, { type: 'settle', id: session.game.pending!.id });
      continue;
    }
    if (move === 'S' || move === 'F') session = reduce(session, { type: 'setMode', mode: move === 'S' ? 'system' : 'free' });
    else if (move === 'R') session = reduce(session, { type: 'restart' });
    else if (move === 'X') session = reduce(session, { type: 'stop' });
    if (session === before) return null;
  }
  return session.game;
}

/** The stored session, or null when it is unreadable or does not respect the rules. */
export function deserialize(text: string): Session | null {
  try {
    const data = JSON.parse(text);
    if (data?.v !== VERSION || !Array.isArray(data.archive)) return null;
    const game = replay(data.game);
    const archive = data.archive.map(replay) as (Game | null)[];
    if (!game || archive.some((g) => !g || g.events.length === 0)) return null;
    const ids = [game, ...(archive as Game[])].map((g) => g.id);
    const nextGameId = Math.max(Number(data.next) || 0, Math.max(...ids) + 1);
    return {
      game,
      archive: (archive as Game[]).map((g) => ({ ...g, ended: g.ended ?? 'stopped' })),
      nextGameId,
      nextSpinId: 1,
    };
  } catch {
    return null;
  }
}
