/**
 * Tre possibilità: the Monty Hall problem as a game. See brief.md for the intent and README.md for
 * the structure.
 *
 *   game/  rules, the session reducer, statistics, the views, the simulator: pure, tested in Node;
 *   ui/    what the learner sees; it draws the views and sends actions.
 *
 * This component only composes them and owns what is purely about layout and disclosure: which
 * panel is open, and whether the theory is shown. Both start closed at every page load, on
 * purpose: at the LIM the next class starts from the same place. Conventions:
 * docs/style/interactive.md.
 */
import { useRef, useState } from 'react';
import './styles.css';
import Analytics from './ui/Analytics.tsx';
import type { Tab } from './ui/Analytics.tsx';
import Reasoning from './ui/Reasoning.tsx';
import Stage from './ui/Stage.tsx';
import { useFullscreen } from './ui/useFullscreen.ts';
import { useLab } from './ui/useLab.ts';
import { useSession } from './ui/useSession.ts';

type Layout = 'closed' | 'docked' | 'focus';
type View = 'analysis' | 'reasoning';

export default function ThreePossibilitiesGame() {
  const root = useRef<HTMLDivElement>(null);
  const game = useSession();
  const lab = useLab();
  const fullscreen = useFullscreen(root);
  const [layout, setLayout] = useState<Layout>('closed');
  const [view, setView] = useState<View>('analysis');
  const [tab, setTab] = useState<Tab>('session');
  const [theory, setTheory] = useState(false);

  const toggle = (next: View) => {
    if (layout !== 'closed' && view === next) {
      setLayout('closed');
      return;
    }
    setView(next);
    setLayout(layout === 'closed' ? 'docked' : layout);
  };

  const panel = {
    focused: layout === 'focus',
    onFocusToggle: () => setLayout(layout === 'focus' ? 'docked' : 'focus'),
    onClose: () => setLayout('closed'),
  };

  const tools = (
    <>
      <button type="button" className="tool" aria-expanded={layout !== 'closed' && view === 'analysis'} onClick={() => toggle('analysis')}>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M1.5 14.5h13M3 11l3.5-4 3 2.5L14 3.5" />
        </svg>
        Analisi
      </button>
      <button
        type="button"
        className="tool"
        title="Il ragionamento matematico"
        aria-expanded={layout !== 'closed' && view === 'reasoning'}
        onClick={() => toggle('reasoning')}
      >
        Perché?
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
    <div className="three-possibilities-game" ref={root}>
      <div className="shell" data-panel={layout}>
        <Stage
          state={game.state}
          onPick={game.pick}
          onDecide={game.decide}
          onDeal={game.deal}
          compact={layout === 'focus'}
          tools={tools}
        />
        {layout !== 'closed' &&
          (view === 'analysis' ? (
            <Analytics game={game} lab={lab} tab={tab} onTab={setTab} theory={theory} onTheory={setTheory} {...panel} />
          ) : (
            <Reasoning {...panel} />
          ))}
      </div>
    </div>
  );
}
