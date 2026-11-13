/**
 * A state that can jump (while dragging) or glide (after a button): the transitions that show
 * a construction moving, about 0.4 s, eased, and instant under prefers-reduced-motion.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

export function useTween<T>(initial: T | (() => T), mix: (a: T, b: T, t: number) => T) {
  const [value, setValue] = useState<T>(initial);
  const current = useRef(value);
  current.current = value;
  const frame = useRef(0);
  const target = useRef<T>(value);
  const mixRef = useRef(mix);
  mixRef.current = mix;

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  /** Sets the state; `duration` > 0 glides there from what is on screen now. */
  const set = useCallback((next: T | ((previous: T) => T), duration = 0) => {
    cancelAnimationFrame(frame.current);
    const resolved =
      typeof next === 'function' ? (next as (p: T) => T)(target.current) : (next as T);
    target.current = resolved;
    if (duration <= 0 || reducedMotion()) {
      setValue(resolved);
      return;
    }
    const from = current.current;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(t >= 1 ? resolved : mixRef.current(from, resolved, ease(t)));
      if (t < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
  }, []);

  /** Where the state is going (equal to `value` unless a transition is running). */
  return [value, set, target] as const;
}
