/**
 * Mounts an interactive Bit by id.
 *
 * bits/<id>/src/index.tsx must default-export a React component that renders the whole
 * interactive content and depends on nothing from the surrounding page. Each Bit becomes
 * its own lazily loaded chunk, so the catalog can grow without bloating any single page.
 *
 * Standalone pages use this today; Orbits will use the very same mount later.
 */
import { Suspense, lazy, useMemo, type ComponentType } from 'react';

const loaders = import.meta.glob<{ default: ComponentType }>('../../../bits/*/src/index.tsx');

export default function BitHost({ id }: { id: string }) {
  const Component = useMemo(() => {
    const load = loaders[`../../../bits/${id}/src/index.tsx`];
    return load ? lazy(load) : null;
  }, [id]);

  if (!Component) {
    return (
      <p className="orb-bit-missing">
        No interactive Bit named <code>{id}</code> (expected bits/{id}/src/index.tsx).
      </p>
    );
  }
  return (
    <Suspense fallback={<p className="orb-bit-loading">Loading…</p>}>
      <Component />
    </Suspense>
  );
}
