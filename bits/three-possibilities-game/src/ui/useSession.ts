/**
 * The session in React: the pure reducer, the draws, the two timed transitions, and persistence
 * on this device only. Storage can be missing or refuse writes (private mode, full quota): the
 * games then simply last as long as the page.
 *
 * The transitions are timers rather than animation callbacks: they keep working in a hidden tab,
 * and a repeated or late one is refused by the reducer, which checks the id of the game.
 */
import { useCallback, useEffect, useReducer, useRef } from 'react';
import { createRandom } from '../game/rules.ts';
import type { Option } from '../game/rules.ts';
import { createState, deserialize, reduce, serialize } from '../game/session.ts';
import type { State } from '../game/session.ts';

const STORAGE_KEY = 'orbbits.three-possibilities-game.session';

/** Milliseconds; short enough that playing twenty games is not a chore. */
export const TIMING = { opening: 950, revealing: 1000 } as const;
const REDUCED = { opening: 120, revealing: 120 } as const;

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function load(): State {
  const fresh = () => createState(createRandom().option());
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored && deserialize(stored)) || fresh();
  } catch {
    return fresh();
  }
}

export function useSession() {
  const [state, dispatch] = useReducer(reduce, undefined, load);
  const random = useRef(createRandom());
  const { phase, id } = state.live;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, serialize(state));
    } catch {
      /* the session stays in memory */
    }
  }, [state]);

  useEffect(() => {
    if (phase !== 'opening' && phase !== 'revealing') return;
    const timing = reducedMotion() ? REDUCED : TIMING;
    const timer = setTimeout(
      () => dispatch(phase === 'opening' ? { type: 'opened', id } : { type: 'settle', id }),
      timing[phase],
    );
    return () => clearTimeout(timer);
  }, [phase, id]);

  // Drawn here, outside the reducer; a refused action just discards an independent draw.
  const pick = useCallback(
    (option: Option) => dispatch({ type: 'pick', option, coin: random.current.coin() }),
    [],
  );
  const decide = useCallback((option: Option) => dispatch({ type: 'decide', option }), []);
  const deal = useCallback(() => dispatch({ type: 'deal', prize: random.current.option() }), []);
  const newSession = useCallback(
    () => dispatch({ type: 'newSession', prize: random.current.option() }),
    [],
  );
  const clearAll = useCallback(
    () => dispatch({ type: 'clearAll', prize: random.current.option() }),
    [],
  );

  return { state, pick, decide, deal, newSession, clearAll };
}

export type Game = ReturnType<typeof useSession>;
