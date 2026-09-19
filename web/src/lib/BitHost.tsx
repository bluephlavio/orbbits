/**
 * Mounts an interactive Bit by id.
 *
 * bits/<id>/src/index.tsx must default-export a React component that renders the whole
 * interactive content and depends on nothing from the surrounding page. Each Bit becomes
 * its own lazily loaded chunk, so the catalog can grow without bloating any single page.
 *
 * The only thing the page tells the component is the language to render (`locale`, a tag
 * from the Bit's own `locales`); a single-language Bit ignores it (docs/localization.md).
 *
 * Standalone pages use this today; Orbits will use the very same mount later.
 */
import { Suspense, lazy, useMemo, type ComponentType } from 'react';

/** What a Bit's default export receives. Every prop is optional: a Bit works with none. */
export interface BitProps {
  locale?: string;
}

const loaders = import.meta.glob<{ default: ComponentType<BitProps> }>(
  '../../../bits/*/src/index.tsx',
);

export default function BitHost({ id, locale }: { id: string; locale?: string }) {
  const Component = useMemo(() => {
    const load = loaders[`../../../bits/${id}/src/index.tsx`];
    return load ? lazy(load) : null;
  }, [id]);

  if (!Component) {
    return (
      <p className="orb-bit-missing">
        Nessun Bit interattivo <code>{id}</code> (atteso bits/{id}/src/index.tsx).
      </p>
    );
  }
  return (
    <Suspense fallback={<p className="orb-bit-loading">Caricamento…</p>}>
      <Component locale={locale} />
    </Suspense>
  );
}
