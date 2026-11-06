/**
 * The session: an append-only log of finished games, plus the game in progress, driven by a pure
 * reducer.
 *
 * A game goes through five phases:
 *
 *   choose → (pick) → opening → (opened) → decide → (decide) → revealing → (settle) → done
 *
 * Two of them are animations. `opened` and `settle` carry the id of the game they belong to, so a
 * late or repeated callback is a no-op, and ids never restart. Random draws come in with the
 * action, which keeps the reducer pure. Only settled games exist for statistics, which is what
 * stops an open chart from spoiling the reveal. Every guard lives here rather than in the UI:
 * repeated clicks, clicks during a transition, an attempt to take the opened option are no-ops by
 * construction.
 *
 * Words: on screen a `partita` is one game, a `sessione` is a run of them by one player.
 */
import { OPTIONS, hostOpens, openable, strategyOf, switchTarget } from './rules.ts';
import type { Option, Coin, Strategy } from './rules.ts';

/** Oldest sessions are dropped beyond this, to keep the stored data small. */
export const MAX_ARCHIVED = 60;

export interface Round {
  /** 1-based position of the game in its session. */
  n: number;
  prize: Option;
  pick: Option;
  opened: Option;
  final: Option;
  strategy: Strategy;
  win: boolean;
}

export type Phase = 'choose' | 'opening' | 'decide' | 'revealing' | 'done';

export interface Live {
  id: number;
  phase: Phase;
  prize: Option;
  pick: Option | null;
  opened: Option | null;
  final: Option | null;
}

export interface Session {
  id: number;
  rounds: readonly Round[];
}

export interface State {
  live: Live;
  session: Session;
  /** Closed sessions, oldest first. The current session is never in here. */
  archive: readonly Session[];
  nextSessionId: number;
  /** Never reset: an animation from before `clearAll` can never match a later game. */
  nextGameId: number;
}

export type Action =
  | { type: 'pick'; option: Option; coin: Coin }
  | { type: 'opened'; id: number }
  | { type: 'decide'; option: Option }
  | { type: 'settle'; id: number }
  | { type: 'deal'; prize: Option }
  | { type: 'newSession'; prize: Option }
  | { type: 'clearAll'; prize: Option };

const dealt = (id: number, prize: Option): Live => ({
  id,
  phase: 'choose',
  prize,
  pick: null,
  opened: null,
  final: null,
});

export const createState = (prize: Option): State => ({
  live: dealt(1, prize),
  session: { id: 1, rounds: [] },
  archive: [],
  nextSessionId: 2,
  nextGameId: 2,
});

function roundOf(n: number, prize: Option, pick: Option, opened: Option, final: Option): Round {
  return { n, prize, pick, opened, final, strategy: strategyOf(pick, final), win: final === prize };
}

/** Whether the rules allow this game. */
const isLegal = (prize: Option, pick: Option, opened: Option, final: Option) =>
  openable(prize, pick).includes(opened) && final !== opened;

/** A new session can start between games, not while one is being decided. */
export const canCloseSession = ({ live, session }: State) =>
  (live.phase === 'choose' || live.phase === 'done') && session.rounds.length > 0;

export function reduce(state: State, action: Action): State {
  const { live, session } = state;
  switch (action.type) {
    case 'pick':
      if (live.phase !== 'choose') return state;
      return {
        ...state,
        live: {
          ...live,
          phase: 'opening',
          pick: action.option,
          opened: hostOpens(live.prize, action.option, action.coin),
        },
      };

    case 'opened':
      if (live.phase !== 'opening' || live.id !== action.id) return state;
      return { ...state, live: { ...live, phase: 'decide' } };

    case 'decide':
      if (live.phase !== 'decide') return state;
      if (action.option !== live.pick && action.option !== switchTarget(live.pick!, live.opened!)) {
        return state;
      }
      return { ...state, live: { ...live, phase: 'revealing', final: action.option } };

    case 'settle': {
      if (live.phase !== 'revealing' || live.id !== action.id) return state;
      const round = roundOf(session.rounds.length + 1, live.prize, live.pick!, live.opened!, live.final!);
      return {
        ...state,
        live: { ...live, phase: 'done' },
        session: { ...session, rounds: [...session.rounds, round] },
      };
    }

    case 'deal':
      if (live.phase !== 'done') return state;
      return { ...state, live: dealt(state.nextGameId, action.prize), nextGameId: state.nextGameId + 1 };

    case 'newSession':
      if (!canCloseSession(state)) return state;
      return {
        ...state,
        live: dealt(state.nextGameId, action.prize),
        session: { id: state.nextSessionId, rounds: [] },
        archive: [...state.archive, session].slice(-MAX_ARCHIVED),
        nextSessionId: state.nextSessionId + 1,
        nextGameId: state.nextGameId + 1,
      };

    case 'clearAll':
      return {
        live: dealt(state.nextGameId, action.prize),
        session: { id: 1, rounds: [] },
        archive: [],
        nextSessionId: 2,
        nextGameId: state.nextGameId + 1,
      };
  }
}

/** Every session with at least one game: the archive, then the current one. */
export const playedSessions = (state: State): readonly Session[] =>
  state.session.rounds.length > 0 ? [...state.archive, state.session] : state.archive;

// Persistence. A game is stored as four digits (prize, pick, opened, final); everything else is
// recomputed, and a game the rules would not allow discards the whole store, so a stored session
// cannot hold inconsistent statistics.

interface StoredSession {
  i: number;
  r: string;
}

/** The game in progress; null when the last game is finished and shown. */
interface StoredLive {
  p: number;
  k?: number;
  o?: number;
}

const VERSION = 1;

const storeSession = (session: Session): StoredSession => ({
  i: session.id,
  r: session.rounds.map((r) => `${r.prize}${r.pick}${r.opened}${r.final}`).join(''),
});

function storeLive(live: Live): StoredLive | null {
  if (live.phase === 'done') return null;
  if (live.phase === 'choose') return { p: live.prize };
  return { p: live.prize, k: live.pick!, o: live.opened! };
}

export function serialize(state: State) {
  // A decision being revealed counts as taken: reloading must not undo a choice.
  const settled =
    state.live.phase === 'revealing' ? reduce(state, { type: 'settle', id: state.live.id }) : state;
  return JSON.stringify({
    v: VERSION,
    live: storeLive(settled.live),
    session: storeSession(settled.session),
    archive: settled.archive.map(storeSession),
    next: settled.nextSessionId,
  });
}

const isOption = (value: unknown): value is Option => OPTIONS.includes(value as Option);

function loadSession(stored: StoredSession): Session | null {
  if (!Number.isInteger(stored?.i) || typeof stored.r !== 'string') return null;
  if (!/^([0-2]{4})*$/.test(stored.r)) return null;
  const rounds: Round[] = [];
  for (let i = 0; i < stored.r.length; i += 4) {
    const [prize, pick, opened, final] = [...stored.r.slice(i, i + 4)].map(Number) as Option[];
    if (!isLegal(prize, pick, opened, final)) return null;
    rounds.push(roundOf(rounds.length + 1, prize, pick, opened, final));
  }
  return { id: stored.i, rounds };
}

function loadLive(stored: StoredLive | null, session: Session): Live | null {
  const id = 1;
  if (stored === null) {
    const last = session.rounds.at(-1);
    if (!last) return null;
    const { prize, pick, opened, final } = last;
    return { id, phase: 'done', prize, pick, opened, final };
  }
  if (!isOption(stored?.p)) return null;
  if (stored.k === undefined && stored.o === undefined) return dealt(id, stored.p);
  const { p: prize, k: pick, o: opened } = stored;
  if (!isOption(pick) || !isOption(opened) || !openable(prize, pick).includes(opened)) return null;
  // An opening animation is not resumed: the option stays open and the decision is waiting.
  return { id, phase: 'decide', prize, pick, opened, final: null };
}

/** The stored state, or null when it is unreadable or does not respect the rules. */
export function deserialize(text: string): State | null {
  try {
    const data = JSON.parse(text);
    if (data?.v !== VERSION || !Array.isArray(data.archive)) return null;
    const session = loadSession(data.session);
    const archive = data.archive.map(loadSession) as (Session | null)[];
    if (!session || archive.some((s) => !s || s.rounds.length === 0)) return null;
    const live = loadLive(data.live, session);
    if (!live) return null;
    const ids = [session, ...(archive as Session[])].map((s) => s.id);
    const nextSessionId = Math.max(data.next, Math.max(...ids) + 1);
    if (!Number.isInteger(nextSessionId)) return null;
    return { live, session, archive: archive as Session[], nextSessionId, nextGameId: 2 };
  } catch {
    return null;
  }
}
