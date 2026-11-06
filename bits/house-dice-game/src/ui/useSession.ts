/**
 * The session in React: the pure reducer, the die, and persistence on this device only.
 * Storage can be missing or refuse writes (private mode, full quota): the game then simply
 * lasts as long as the page.
 */
import { useCallback, useEffect, useReducer, useRef } from 'react';
import { createDie } from '../game/rules.ts';
import { createSession, deserialize, reduce, serialize } from '../game/session.ts';
import type { Session } from '../game/session.ts';

const STORAGE_KEY = 'orbbits.house-dice-game.session';

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
  const die = useRef(createDie());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, serialize(session));
    } catch {
      /* the session stays in memory */
    }
  }, [session]);

  // Drawn here, outside the reducer; a refused roll just discards an independent draw.
  const roll = useCallback(() => dispatch({ type: 'roll', face: die.current() }), []);

  return { session, dispatch, roll };
}
