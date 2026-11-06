/** The side panel, shared by Analysis and Reasoning: it docks, takes the centre, or closes. */
import type { ReactNode } from 'react';

interface Props {
  label: string;
  head: ReactNode;
  focused: boolean;
  onFocusToggle: () => void;
  onClose: () => void;
  children: ReactNode;
  tabbed?: boolean;
}

export default function Panel({ label, head, focused, onFocusToggle, onClose, children, tabbed }: Props) {
  const toggle = focused ? 'Affianca al gioco' : 'Porta al centro';
  return (
    <aside className="panel" aria-label={label}>
      <header className="panel-head">
        {head}
        <div className="panel-tools">
          <button
            type="button"
            className="icon focus-toggle"
            aria-pressed={focused}
            aria-label={toggle}
            title={toggle}
            onClick={onFocusToggle}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              {focused ? <path d="M1.5 3v10M14.5 3v10M12 8H6.5M9 5.5 6.5 8 9 10.5" /> : <path d="M1.5 3v10M14.5 3v10M4 8h8M6 5.5 3.75 8 6 10.5M10 5.5 12.25 8 10 10.5" />}
            </svg>
          </button>
          <button type="button" className="icon" aria-label={`Chiudi: ${label}`} title="Chiudi" onClick={onClose}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>
      </header>
      <div className="panel-body" role={tabbed ? 'tabpanel' : undefined}>
        {children}
      </div>
    </aside>
  );
}
