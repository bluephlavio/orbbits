/**
 * Il sistema infallibile: a simplified European roulette, and the doubling system that "cannot
 * lose". See brief.md for the intent and README.md for the structure.
 *
 *   game/  wheel, strategies, the session reducer, statistics, the simulator: pure and tested;
 *   ui/    what the learner sees; it reads the session and sends actions.
 *
 * This component only composes them and owns what is purely about layout: whether the laboratory
 * is closed, docked or at the centre, and whether the table rules are open. Conventions:
 * docs/style/interactive.md.
 */
import { useCallback, useRef, useState } from 'react';
import './styles.css';
import Analytics from './ui/Analytics.tsx';
import type { Tab } from './ui/Analytics.tsx';
import Settings from './ui/Settings.tsx';
import Stage from './ui/Stage.tsx';
import { useFullscreen } from './ui/useFullscreen.ts';
import { useLab } from './ui/useLab.ts';
import { useSession } from './ui/useSession.ts';

type Panel = 'closed' | 'docked' | 'focus';

export default function InfallibleSystemGame() {
  const root = useRef<HTMLDivElement>(null);
  const { session, dispatch, spin } = useSession();
  const lab = useLab();
  const fullscreen = useFullscreen(root);
  const [panel, setPanel] = useState<Panel>('closed');
  const [tab, setTab] = useState<Tab>('session');
  const [settings, setSettings] = useState(false);

  const onSettled = useCallback((id: number) => dispatch({ type: 'settle', id }), [dispatch]);
  const closeSettings = useCallback(() => setSettings(false), []);

  const tools = (
    <>
      <button
        type="button"
        className="tool"
        aria-label="Laboratorio"
        title="Laboratorio"
        aria-expanded={panel !== 'closed'}
        onClick={() => setPanel(panel === 'closed' ? 'docked' : 'closed')}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M1.5 14.5h13M3 11l3.5-4 3 2.5L14 3.5" />
        </svg>
        <span className="tool-label">Laboratorio</span>
      </button>
      <button
        type="button"
        className="tool tool-icon"
        aria-label="Regole del tavolo"
        title="Regole del tavolo"
        aria-expanded={settings}
        onClick={() => setSettings(true)}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M2 4.5h7M12 4.5h2M2 11.5h2M7 11.5h7" />
          <circle cx="10.5" cy="4.5" r="1.5" />
          <circle cx="5.5" cy="11.5" r="1.5" />
        </svg>
      </button>
      {fullscreen.supported && (
        <button
          type="button"
          className="tool tool-icon"
          aria-pressed={fullscreen.active}
          aria-label={fullscreen.active ? 'Esci da schermo intero' : 'Schermo intero'}
          title={fullscreen.active ? 'Esci da schermo intero' : 'Schermo intero'}
          onClick={fullscreen.toggle}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            {fullscreen.active ? (
              <path d="M6 1.5V6H1.5M10 1.5V6h4.5M6 14.5V10H1.5M10 14.5V10h4.5" />
            ) : (
              <path d="M1.5 6V1.5H6M10 1.5h4.5V6M1.5 10v4.5H6M10 14.5h4.5V10" />
            )}
          </svg>
        </button>
      )}
    </>
  );

  return (
    <div className="infallible-system-game" ref={root}>
      <div className="shell" data-panel={panel}>
        <Stage
          game={session.game}
          dispatch={dispatch}
          spin={spin}
          onSettled={onSettled}
          onReview={() => {
            setTab('session');
            setPanel(panel === 'closed' ? 'docked' : panel);
          }}
          onSettings={() => setSettings(true)}
          compact={panel === 'focus'}
          tools={tools}
        />
        {panel !== 'closed' && (
          <Analytics
            session={session}
            dispatch={dispatch}
            lab={lab}
            tab={tab}
            onTab={setTab}
            focused={panel === 'focus'}
            onFocusToggle={() => setPanel(panel === 'focus' ? 'docked' : 'focus')}
            onClose={() => setPanel('closed')}
          />
        )}
      </div>
      {settings && <Settings game={session.game} dispatch={dispatch} onClose={closeSettings} />}
    </div>
  );
}
