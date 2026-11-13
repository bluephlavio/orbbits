/**
 * One question at a time: choose, confirm, read, go on. Before the confirmation the page holds
 * only the question and its alternatives — no teacher title, no answer, no explanation, no
 * metadata. Keys: 1–3 or A–C choose (by displayed position), Enter confirms and then advances.
 * From 60rem of width the explanation docks beside the question, which stays in view with
 * the "Avanti" button while the explanation is read.
 */
import { useEffect, useRef, useState } from 'react';
import type { Dispatch, KeyboardEvent, ReactNode } from 'react';
import { LETTERS } from '../quiz/bank.ts';
import type { Action, Game } from '../quiz/play.ts';
import { currentId, isAnswered, orderOf, positionOf } from '../quiz/play.ts';
import { BANK } from './data.ts';
import Feedback, { OptionList } from './Feedback.tsx';
import { Icon } from './icons.tsx';

function Progress({ game }: { game: Game }) {
  return (
    <ol className="progress" aria-hidden="true">
      {game.ids.map((id, i) => {
        const item = BANK.byId.get(id);
        const answered = Object.hasOwn(game.answers, id);
        const state = answered
          ? game.answers[id] === item?.correct
            ? 'right'
            : 'wrong'
          : i === game.index
            ? 'current'
            : 'todo';
        return <li key={id} data-state={state} />;
      })}
    </ol>
  );
}

/** A button that asks once more before acting; it resets itself after a few seconds. */
export function TwoStepButton({
  label,
  confirmLabel,
  onConfirm,
  icon,
}: {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  icon: ReactNode;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 3500);
    return () => clearTimeout(timer);
  }, [armed]);
  return (
    <button
      type="button"
      className="tool"
      data-armed={armed || undefined}
      aria-label={armed ? confirmLabel : label}
      title={armed ? confirmLabel : label}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else setArmed(true);
      }}
    >
      {icon}
      <span className="tool-label">{armed ? confirmLabel : label}</span>
    </button>
  );
}

export default function Play({
  game,
  dispatch,
  onBack,
  onRestart,
  onFinish,
  tools,
}: {
  game: Game;
  dispatch: Dispatch<Action>;
  onBack: () => void;
  onRestart: () => void;
  onFinish: () => void;
  tools: ReactNode;
}) {
  const id = currentId(game);
  const item = id ? BANK.byId.get(id) : undefined;
  const answered = isAnswered(game);
  const last = game.index === game.ids.length - 1;
  const heading = useRef<HTMLHeadingElement>(null);
  const feedback = useRef<HTMLDivElement>(null);
  const nextButton = useRef<HTMLButtonElement>(null);

  // A new question takes the focus (screen readers announce it; keys keep working).
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [id]);

  // After the confirmation: bring the explanation into view where it sits below the options.
  useEffect(() => {
    if (!answered) return;
    nextButton.current?.focus({ preventScroll: true });
    const node = feedback.current;
    if (!node) return;
    const ask = node.parentElement?.querySelector('.ask');
    const stacked = node.getBoundingClientRect().top >= (ask?.getBoundingClientRect().bottom ?? 0) - 1;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const below = node.getBoundingClientRect().top > window.innerHeight * 0.7;
    if (stacked && below) node.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }, [answered]);

  if (!item) return null;
  const order = orderOf(game, item);

  const advance = () => {
    if (last) onFinish();
    dispatch({ type: 'next' });
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target as HTMLElement;
    if (target.closest('input, textarea, select, summary, a')) return;
    const key = event.key.toLowerCase();
    const position = ['1', '2', '3', '4'].indexOf(key) >= 0 ? Number(key) - 1 : ['a', 'b', 'c', 'd'].indexOf(key);
    if (position >= 0 && position < order.length && !answered) {
      event.preventDefault();
      dispatch({ type: 'select', choice: order[position] });
    } else if (key === 'enter') {
      // Enter on an alternative chooses it, and a second Enter confirms; other buttons click.
      const option = target.closest<HTMLElement>('.option');
      if (target.tagName === 'BUTTON' && !option) return;
      event.preventDefault();
      if (answered) advance();
      else if (option && order[Number(option.dataset.position)] !== game.choice) {
        dispatch({ type: 'select', choice: order[Number(option.dataset.position)] });
      } else dispatch({ type: 'confirm' });
    }
  };

  const action = answered ? (
    <button type="button" className="primary next" ref={nextButton} onClick={advance}>
      {last ? 'Vedi il risultato' : 'Avanti'}
      <Icon name="next" />
    </button>
  ) : (
    <button
      type="button"
      className="primary confirm"
      disabled={game.choice === null}
      onClick={() => dispatch({ type: 'confirm' })}
    >
      {game.choice === null ? 'Scegli una risposta' : `Conferma ${LETTERS[positionOf(game, item, game.choice)]}`}
    </button>
  );

  return (
    <section className="play" onKeyDown={onKeyDown} aria-label="Partita">
      <header className="bar">
        <button type="button" className="tool" onClick={onBack} aria-label="Torna alla preparazione" title="Torna alla preparazione">
          <Icon name="back" />
          <span className="tool-label">Preparazione</span>
        </button>
        <div className="progress-wrap">
          <Progress game={game} />
          <span className="counter" aria-live="polite">
            <span className="sr-only">Domanda </span>
            <b>{game.index + 1}</b>
            <span className="of"> di {game.ids.length}</span>
          </span>
        </div>
        <div className="tools">
          <TwoStepButton
            label="Ricomincia"
            confirmLabel="Sicuro?"
            onConfirm={onRestart}
            icon={<Icon name="restart" />}
          />
          {tools}
        </div>
      </header>

      <div className="play-body" data-revealed={answered || undefined}>
        <div className="stage">
          <div className="ask" key={id}>
            <h2 className="question" ref={heading} tabIndex={-1}>
              {item.question}
            </h2>
            <OptionList
              item={item}
              order={order}
              chosen={answered ? game.answers[item.id] : game.choice}
              revealed={answered}
              onSelect={(choice) => dispatch({ type: 'select', choice })}
            />
          </div>
          <div className="act">{action}</div>
        </div>
        {answered && (
          <div className="feedback-slot" ref={feedback} key={`f-${id}`}>
            <Feedback
              item={item}
              chosen={game.answers[item.id]}
              correctLetter={LETTERS[positionOf(game, item, item.correct)]}
            />
          </div>
        )}
      </div>
    </section>
  );
}
