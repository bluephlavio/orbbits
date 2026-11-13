/** The content-box size of an element, kept current with a ResizeObserver. */
import { useLayoutEffect, useState } from 'react';
import type { RefObject } from 'react';

export function useSize(ref: RefObject<HTMLElement | null>): { width: number; height: number } {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => {
      const r = element.getBoundingClientRect();
      const width = Math.round(r.width);
      const height = Math.round(r.height);
      setSize((s) => (s.width === width && s.height === height ? s : { width, height }));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}
