/**
 * The session: an append-only log of settled rolls, driven by a pure reducer.
 *
 * A roll has two steps. `roll` takes the stake and fixes the face (drawn once, by the caller,
 * so the reducer stays pure); `settle` appends the event once the die has stopped. Only
 * settled events exist for statistics, which is what stops open charts from spoiling a throw.
 * Every guard lives here rather than in the UI: extra clicks, a late animation callback or a
 * reset during a throw are no-ops by construction.
 */
import { outcomeOf, RULES } from './rules.ts';
import type { Face, Outcome } from './rules.ts';

export const DEFAULT_BALANCE = 20;
export const BALANCE_PRESETS = [10, 20, 50, 100] as const;
export const MAX_BALANCE = 1000;
/** Oldest games are dropped beyond this, to keep the stored session small. */
export const MAX_ARCHIVED = 60;

export interface RollEvent extends Outcome {
  /** 1-based position of the roll in its game. */
  n: number;
  /** Balance after the roll settled. */
  balance: number;
}

export type EndReason = 'broke' | 'stopped';

export interface PendingRoll {
  id: number;
  face: Face;
}

export interface Game {
  id: number;
  initialBalance: number;
  events: readonly RollEvent[];
  pending: PendingRoll | null;
  ended: EndReason | null;
}

export interface Session {
  game: Game;
  /** Finished games, oldest first. The current game is never in here. */
  archive: readonly Game[];
  nextGameId: number;
  /** Never reset: a callback from a throw before `clearAll` can never match a later roll. */
  nextRollId: number;
}

export type Action =
  | { type: 'roll'; face: Face }
  | { type: 'settle'; id: number }
  | { type: 'stop' }
  | { type: 'newGame' }
  | { type: 'setInitialBalance'; value: number }
  | { type: 'clearAll' };

const freshGame = (id: number, initialBalance: number): Game => ({
  id,
  initialBalance,
  events: [],
  pending: null,
  ended: null,
});

export const createSession = (initialBalance = DEFAULT_BALANCE): Session => ({
  game: freshGame(1, initialBalance),
  archive: [],
  nextGameId: 2,
  nextRollId: 1,
});

/** Balance from settled rolls only: the stake of a throw in progress is on the table. */
export const settledBalance = (game: Game) =>
  game.events.at(-1)?.balance ?? game.initialBalance;

/** Where every token is. `you + table + house` always equals the initial balance. */
export function ledgerOf(game: Game) {
  const table = game.pending ? RULES.stake : 0;
  const you = settledBalance(game) - table;
  return { you, table, house: game.initialBalance - you - table };
}

export const canRoll = (game: Game) =>
  !game.pending && !game.ended && settledBalance(game) >= RULES.stake;

export const canStop = (game: Game) =>
  !game.pending && !game.ended && game.events.length > 0;

export const isValidBalance = (value: number) =>
  Number.isInteger(value) && value >= RULES.stake && value <= MAX_BALANCE;

export function reduce(session: Session, action: Action): Session {
  const { game } = session;
  switch (action.type) {
    case 'roll':
      if (!canRoll(game)) return session;
      return {
        ...session,
        game: { ...game, pending: { id: session.nextRollId, face: action.face } },
        nextRollId: session.nextRollId + 1,
      };

    case 'settle': {
      if (game.pending?.id !== action.id) return session;
      const outcome = outcomeOf(game.pending.face);
      const balance = settledBalance(game) + outcome.net;
      const event: RollEvent = { ...outcome, n: game.events.length + 1, balance };
      return {
        ...session,
        game: {
          ...game,
          events: [...game.events, event],
          pending: null,
          ended: balance < RULES.stake ? 'broke' : null,
        },
      };
    }

    case 'stop':
      if (!canStop(game)) return session;
      return { ...session, game: { ...game, ended: 'stopped' } };

    case 'setInitialBalance':
      if (game.events.length > 0 || game.pending || !isValidBalance(action.value)) return session;
      return { ...session, game: { ...game, initialBalance: action.value } };

    case 'newGame': {
      if (game.pending || game.events.length === 0) return session;
      const finished: Game = { ...game, ended: game.ended ?? 'stopped' };
      return {
        ...session,
        game: freshGame(session.nextGameId, game.initialBalance),
        archive: [...session.archive, finished].slice(-MAX_ARCHIVED),
        nextGameId: session.nextGameId + 1,
      };
    }

    case 'clearAll':
      return {
        game: freshGame(1, game.initialBalance),
        archive: [],
        nextGameId: 2,
        nextRollId: session.nextRollId,
      };
  }
}

/** Every game with at least one roll: the archive, then the current one. */
export const playedGames = (session: Session): readonly Game[] =>
  session.game.events.length > 0 ? [...session.archive, session.game] : session.archive;

// Persistence. Only faces are stored: events and balances are always recomputed by replaying
// them through the reducer, so a stored session cannot hold inconsistent accounting.

interface StoredGame {
  i: number;
  b: number;
  f: string;
  e: EndReason | null;
}

const VERSION = 1;

const storeGame = (game: Game): StoredGame => ({
  i: game.id,
  b: game.initialBalance,
  // A throw in progress counts as played: reloading must not refund a stake.
  f: game.events.map((e) => e.face).join('') + (game.pending?.face ?? ''),
  e: game.ended,
});

export const serialize = (session: Session) =>
  JSON.stringify({
    v: VERSION,
    game: storeGame(session.game),
    archive: session.archive.map(storeGame),
    next: session.nextGameId,
  });

function replay(stored: StoredGame): Game | null {
  if (!Number.isInteger(stored?.i) || !isValidBalance(stored?.b)) return null;
  if (typeof stored.f !== 'string' || !/^[1-6]*$/.test(stored.f)) return null;
  let session: Session = { ...createSession(stored.b), game: freshGame(stored.i, stored.b) };
  for (const char of stored.f) {
    const before = session;
    session = reduce(session, { type: 'roll', face: Number(char) as Face });
    if (session === before) return null; // a roll the rules would have refused
    session = reduce(session, { type: 'settle', id: session.game.pending!.id });
  }
  if (stored.e === 'stopped') session = reduce(session, { type: 'stop' });
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
    const nextGameId = Math.max(data.next, Math.max(...ids) + 1);
    if (!Number.isInteger(nextGameId)) return null;
    return {
      game,
      archive: (archive as Game[]).map((g) => ({ ...g, ended: g.ended ?? 'stopped' })),
      nextGameId,
      nextRollId: 1,
    };
  } catch {
    return null;
  }
}
