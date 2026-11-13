/**
 * Fullscreen on the Bit's own root, so that nothing outside the component is involved.
 * Absent on iPhone Safari and in iframes without permission: `supported` is then false and
 * the caller hides the control.
 */
import { useCallback, useEffect, useState } from 'react';
import type { RefObject } from 'react';

interface WebkitDocument extends Document {
  webkitFullscreenEnabled?: boolean;
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => void;
}

interface WebkitElement extends HTMLElement {
  webkitRequestFullscreen?: () => void;
}

const doc = () => document as WebkitDocument;
const currentElement = () => doc().fullscreenElement ?? doc().webkitFullscreenElement ?? null;

export function useFullscreen(ref: RefObject<HTMLElement | null>) {
  const [active, setActive] = useState(false);
  const [supported] = useState(
    () => Boolean(doc().fullscreenEnabled || doc().webkitFullscreenEnabled),
  );

  useEffect(() => {
    const sync = () => setActive(Boolean(ref.current) && currentElement() === ref.current);
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
    };
  }, [ref]);

  const toggle = useCallback(() => {
    const element = ref.current as WebkitElement | null;
    if (!element) return;
    if (currentElement()) {
      if (doc().exitFullscreen) void doc().exitFullscreen().catch(() => {});
      else doc().webkitExitFullscreen?.();
    } else if (element.requestFullscreen) {
      // A refusal (permissions policy, no user gesture) leaves the page as it is.
      void element.requestFullscreen().catch(() => {});
    } else {
      element.webkitRequestFullscreen?.();
    }
  }, [ref]);

  return { supported, active, toggle };
}
