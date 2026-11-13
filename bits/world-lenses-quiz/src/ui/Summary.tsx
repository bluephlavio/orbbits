/**
 * The end of a game: the result, then every answer with its explanation and open question
 * re-openable, and all the open questions together for a closing discussion. The tone treats
 * wrong answers as the interesting ones. Teacher titles are fine here: all is answered.
 */
import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { LETTERS } from '../quiz/bank.ts';
import type { Game } from '../quiz/play.ts';
import { orderOf, outcomes, positionOf } from '../quiz/play.ts';
import { BANK } from './data.ts';
import Feedback, { OptionList } from './Feedback.tsx';
import { Icon, LensMark } from './icons.tsx';

function headline(right: number, total: number): [string, string] {
  const ratio = total ? right / total : 0;
  if (right === total) {
    return ['Tutte a fuoco', 'Ora prova a spiegare il perché di ciascuna: è lì che si vede la lente.'];
  }
  if (ratio >= 0.67) {
    return ['Lenti quasi a fuoco', 'Le risposte da rivedere sono le più interessanti: riaprile.'];
  }
  if (ratio >= 0.34) {
    return ['Diverse immagini da rimettere a fuoco', 'Ogni risposta da rivedere è un pezzo di mondo che hai appena aggiornato.'];
  }
  return ['Tante lenti cambiate in una partita', 'Il quadro di partenza si è mosso parecchio: è proprio questo lo scopo.'];
}

function Ring({ right, total }: { right: number; total: number }) {
  const r = 52;
  const length = 2 * Math.PI * r;
  const share = total ? right / total : 0;
  return (
    <svg className="ring" viewBox="0 0 128 128" aria-hidden="true">
      <circle cx="64" cy="64" r={r} className="ring-track" />
      <circle
        cx="64"
        cy="64"
        r={r}
        className="ring-value"
        strokeDasharray={`${length * share} ${length}`}
        style={{ '--len': length } as CSSProperties}
      />
    </svg>
  );
}

export default function Summary({
  game,
  onReplay,
  onReplayWrong,
  onSetup,
  tools,
}: {
  game: Game;
  onReplay: () => void;
  onReplayWrong: (ids: string[]) => void;
  onSetup: () => void;
  tools: ReactNode;
}) {
  const list = outcomes(game, BANK.byId);
  const right = list.filter((o) => o.right).length;
  const wrong = list.filter((o) => !o.right).map((o) => o.item.id);
  const [title, sub] = headline(right, list.length);
  const [openId, setOpenId] = useState<string | null>(null);
  const prompts = list.filter((o) => o.item.discussionPrompt);

  return (
    <section className="summary" aria-label="Risultato">
      <header className="bar">
        <button type="button" className="tool" onClick={onSetup}>
          <Icon name="back" />
          <span className="tool-label">Preparazione</span>
        </button>
        <div className="tools">{tools}</div>
      </header>

      <div className="result">
        <div className="score">
          <Ring right={right} total={list.length} />
          <p className="score-text">
            <b>{right}</b>
            <span>su {list.length}</span>
          </p>
        </div>
        <h2>{title}</h2>
        <p className="sub">{sub}</p>
        <div className="result-actions">
          {wrong.length > 0 && (
            <button type="button" className="primary" onClick={() => onReplayWrong(wrong)}>
              <Icon name="restart" />
              {wrong.length === 1 ? 'Rigioca la domanda da rivedere' : `Rigioca le ${wrong.length} da rivedere`}
            </button>
          )}
          <button type="button" className={wrong.length ? 'chip' : 'primary'} onClick={onReplay}>
            <Icon name="restart" /> Rigioca tutto
          </button>
          <button type="button" className="chip" onClick={onSetup}>
            <Icon name="list" /> Nuova batteria
          </button>
        </div>
      </div>

      <ol className="review">
        {list.map(({ item, chosen, right: ok }, i) => {
          const open = openId === item.id;
          return (
            <li key={item.id} data-right={ok} data-open={open || undefined} style={{ '--i': i } as CSSProperties}>
              <button
                type="button"
                className="review-row"
                aria-expanded={open}
                onClick={() => setOpenId(open ? null : item.id)}
              >
                <span className="review-n">{i + 1}</span>
                <span className="review-mark" aria-label={ok ? 'giusta' : 'da rivedere'}>
                  <Icon name={ok ? 'check' : 'cross'} />
                </span>
                <span className="review-text">
                  <span className="review-title">{item.title}</span>
                  <span className="review-answer">
                    {ok
                      ? `Hai risposto ${LETTERS[positionOf(game, item, chosen)]}`
                      : `Hai risposto ${LETTERS[positionOf(game, item, chosen)]} · era ${LETTERS[positionOf(game, item, item.correct)]}`}
                  </span>
                </span>
                <Icon name="chevron" className="chev" />
              </button>
              {open && (
                <div className="review-detail">
                  <p className="review-question">{item.question}</p>
                  <OptionList item={item} order={orderOf(game, item)} chosen={chosen} revealed />
                  <Feedback
                    item={item}
                    chosen={chosen}
                    correctLetter={LETTERS[positionOf(game, item, item.correct)]}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {prompts.length > 0 && (
        <details className="open-questions">
          <summary>
            <span className="discuss-mark" aria-hidden="true">
              <Icon name="question" />
            </span>
            <span>
              Le domande che restano aperte <span className="oq-count">{prompts.length}</span>
            </span>
            <Icon name="chevron" className="chev" />
          </summary>
          <ol>
            {prompts.map(({ item }) => (
              <li key={item.id}>
                <p>{item.discussionPrompt}</p>
                <span className="oq-from">{item.title}</span>
              </li>
            ))}
          </ol>
        </details>
      )}

      <aside className="reflect">
        <LensMark />
        <p>
          <span>Prima immaginavo…</span> <span>ora posso sostenere…</span>{' '}
          <span>il dato che me lo permette è…</span>
        </p>
      </aside>
    </section>
  );
}
