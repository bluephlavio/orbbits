/**
 * The stage: the words on one side, the three vessels on the other, the register. It draws the
 * views of the game and sends actions; it holds no game state of its own.
 *
 * Confirming and switching look the same and weigh the same. The outcome is said in words, in a
 * shape and in a colour, and shown on the objects: a win is clear and pleasant, a loss is as clear
 * and carries no penalty. Nothing invites another game except the button that starts one.
 */
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { Option as OptionId } from '../game/rules.ts';
import type { Round, State } from '../game/session.ts';
import { summarize } from '../game/stats.ts';
import { viewOf } from '../game/view.ts';
import { promptOf, RULE, TITLE } from './copy.ts';
import { integer } from './format.ts';
import { METEORITE_ART, STONE_ART } from './specimens.ts';
import Vessel, { VesselDefs } from './Vessel.tsx';

const TRAIL_LENGTH = 14;

/** Very few stars, always in the same places. */
const STARS = [
  [4, 16, 1.2],
  [15, 7, 1],
  [33, 11, 1.4],
  [47, 5, 1],
  [71, 8, 1.3],
  [93, 13, 1],
  [58, 19, 1],
] as const;

function Stars() {
  return (
    <div className="stars" aria-hidden="true">
      {STARS.map(([x, y, size]) => (
        <i key={`${x}-${y}`} style={{ left: `${x}%`, top: `${y}%`, width: `${size * 2}px`, height: `${size * 2}px` }} />
      ))}
    </div>
  );
}

function RoundMark({ round }: { round: Round }) {
  const strategy = round.strategy === 'stay' ? 'confermato' : 'cambiato';
  const text = `Partita ${round.n}: hai ${strategy}, ${round.win ? 'trovato' : 'non trovato'}`;
  return (
    <li data-win={round.win || undefined} title={text}>
      <svg viewBox="0 0 16 16" aria-hidden="true">
        {round.strategy === 'stay' ? <circle cx="8" cy="8" r="2.4" /> : <path d="M3 5.5h9M9.5 3 12 5.5 9.5 8M13 10.5H4M6.5 8 4 10.5 6.5 13" />}
      </svg>
      <span className="sr-only">{text}</span>
    </li>
  );
}

interface Props {
  state: State;
  onPick: (option: OptionId) => void;
  onDecide: (option: OptionId) => void;
  onDeal: () => void;
  compact: boolean;
  tools: ReactNode;
}

export default function Stage({ state, onPick, onDecide, onDeal, compact, tools }: Props) {
  const { live, session } = state;
  const views = viewOf(live);
  const prompt = promptOf(live);
  const { all } = summarize(session.rounds);
  const result = live.phase === 'done' ? (live.final === live.prize ? 'win' : 'loss') : undefined;

  // Loaded ahead, all alike: the first reveal must not wait, and it must work offline.
  useEffect(() => {
    for (const art of [METEORITE_ART, ...STONE_ART]) new Image().src = art;
  }, []);

  // Keyboard players keep their place: a phase can remove the control that had the focus.
  const root = useRef<HTMLElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const element = root.current;
    const active = document.activeElement;
    if (!element || (active !== document.body && !element.contains(active))) return;
    // A option that can still be pressed keeps the focus: moving it from the first choice to the
    // other option would be a nudge.
    if (active instanceof HTMLElement && active.matches('.vessel[data-action]')) return;
    const target =
      live.phase === 'done'
        ? element.querySelector<HTMLElement>('.next')
        : element.querySelector<HTMLElement>('.vessel[data-action]');
    target?.focus({ preventScroll: true });
  }, [live.phase, live.id]);

  const press = (option: OptionId) => {
    if (live.phase === 'choose') onPick(option);
    else onDecide(option);
  };

  return (
    <section
      ref={root}
      className="stage"
      data-phase={live.phase}
      data-result={result}
      data-compact={compact || undefined}
      aria-label={TITLE}
    >
      <VesselDefs />
      <Stars />
      <div className="stage-grid">
        <header className="topbar">
          <span className="wordmark">{TITLE}</span>
          <div className="tools">{tools}</div>
        </header>

        <div className="prompt" key={`${live.id}-${live.phase}`} aria-hidden="true">
          <h3>
            {result && <i className="outcome-mark" />}
            {prompt.title}
          </h3>
          <p>{prompt.detail}</p>
        </div>
        <p className="sr-only" aria-live="polite">
          {prompt.title} {prompt.detail}
        </p>

        <div className="display">
          <div className="vessels" role="group" aria-label="Le tre possibilità">
            {views.map((view) => (
              <Vessel key={view.option} view={view} onPress={() => press(view.option)} />
            ))}
          </div>
        </div>

        <div className="actions">
          {live.phase === 'done' ? (
            <button type="button" className="next" onClick={onDeal}>
              Nuova partita
            </button>
          ) : (
            <p className="rule">{RULE}</p>
          )}
        </div>

        <footer className="trail">
          <span className="trail-count">
            <b>{integer(all.played)}</b> {all.played === 1 ? 'partita' : 'partite'}
          </span>
          <span className="trail-count">
            <b>{integer(all.wins)}</b> {all.wins === 1 ? 'meteorite trovato' : 'meteoriti trovati'}
          </span>
          <ol className="trail-rounds" aria-label="Ultime partite, dalla più recente">
            {session.rounds.slice(-TRAIL_LENGTH).reverse().map((round) => (
              <RoundMark key={round.n} round={round} />
            ))}
          </ol>
        </footer>
      </div>
    </section>
  );
}

