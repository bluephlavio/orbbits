/**
 * The session in React: the pure reducer, the wheel, and persistence on this device only.
 * Storage can be missing or refuse writes (private mode, full quota): the session then simply
 * lasts as long as the page.
 */
import { useCallback, useEffect, useReducer, useRef } from 'react';
import { createWheel } from '../game/rules.ts';
import type { BetColor } from '../game/rules.ts';
import { createSession, deserialize, reduce, serialize } from '../game/session.ts';
import type { Session } from '../game/session.ts';

const STORAGE_KEY = 'orbbits.infallible-system-game.session';

function load(): Session {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored && deserialize(stored)) || createSession();
  } catch {
    return createSession();
  }
}

export function useSession() {
  const [session, dispatch] = useReducer(reduce, undefined, load);
  const wheel = useRef(createWheel());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, serialize(session));
    } catch {
      /* the session stays in memory */
    }
  }, [session]);

  // Drawn here, outside the reducer; a refused spin just discards an independent draw.
  const spin = useCallback(
    (bet: BetColor, stake: number) => dispatch({ type: 'spin', pocket: wheel.current(), bet, stake }),
    [],
  );

  return { session, dispatch, spin };
}
