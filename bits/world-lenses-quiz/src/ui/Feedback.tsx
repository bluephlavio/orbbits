/**
 * What follows a confirmed answer, in reading order (the bank's `interface_guidance`):
 *   outcome and `answer` → `feedback`, the heart of the Bit, in reading type →
 *   `discussion_prompt` under "Una domanda che resta aperta" (never scored) →
 *   a secondary zone with `year` and the sources (links) →
 *   a closed "Approfondimento per il docente" with the teacher-only fields.
 * The alternatives are shown in the game's display order; letters follow that order.
 */
import type { CSSProperties } from 'react';
import type { Item } from '../quiz/bank.ts';
import { LETTERS } from '../quiz/bank.ts';
import { BANK } from './data.ts';
import { Icon } from './icons.tsx';

const identity = (item: Item) => item.options.map((_, i) => i);

export function OptionList({
  item,
  order = identity(item),
  chosen,
  revealed,
  onSelect,
}: {
  item: Item;
  /** Option indices in display order. */
  order?: number[];
  /** The chosen option index (not a position). */
  chosen: number | null;
  revealed: boolean;
  onSelect?: (option: number) => void;
}) {
  return (
    <ol className="options" data-revealed={revealed || undefined}>
      {order.map((option, position) => {
        const state = !revealed
          ? chosen === option
            ? 'chosen'
            : 'idle'
          : option === item.correct
            ? 'correct'
            : chosen === option
              ? 'wrong'
              : 'other';
        return (
          <li key={option} style={{ '--i': position } as CSSProperties}>
            <button
              type="button"
              className="option"
              data-state={state}
              data-position={position}
              aria-pressed={chosen === option}
              disabled={revealed || !onSelect}
              onClick={() => onSelect?.(option)}
            >
              <span className="letter" aria-hidden="true">
                {state === 'correct' ? <Icon name="check" /> : state === 'wrong' ? <Icon name="cross" /> : LETTERS[position]}
              </span>
              <span className="option-text">
                <span className="sr-only">{LETTERS[position]}. </span>
                {item.options[option]}
              </span>
              {revealed && (state === 'correct' || state === 'wrong') && (
                <span className="sr-only">
                  {state === 'correct' ? ' (risposta corretta)' : ' (la tua risposta)'}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** The teacher-only fields of an item; shared by the preparation and the feedback. */
export function TeacherNotes({ item }: { item: Item }) {
  const rows: [string, string][] = [
    ['Rappresentazione da mettere alla prova', item.lensBefore],
    ['Che cosa la domanda stabilisce', item.editorialRationale],
    ...(item.lensAfter && item.lensAfter !== item.editorialRationale
      ? ([['Relazione proposta', item.lensAfter]] as [string, string][])
      : []),
    ['Nota per il docente', item.teacherNote],
    ['Verifica', item.verification],
    ['Valore delle fonti', item.evidenceNote],
  ];
  return (
    <dl className="teacher-notes">
      {rows
        .filter(([, value]) => value)
        .map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
    </dl>
  );
}

export function SourceList({ item }: { item: Item }) {
  return (
    <ol className="source-list">
      {item.sources.map((s, i) => (
        <li key={i}>
          {s.url ? (
            <a href={s.url} target="_blank" rel="noopener noreferrer">
              {s.label}
              <Icon name="link" />
            </a>
          ) : (
            s.label
          )}
        </li>
      ))}
    </ol>
  );
}

export default function Feedback({
  item,
  chosen,
  correctLetter,
  headingId,
}: {
  item: Item;
  chosen: number;
  /** Letter of the correct alternative as it was displayed. */
  correctLetter: string;
  headingId?: string;
}) {
  const right = chosen === item.correct;
  return (
    <article className="feedback" data-right={right} aria-labelledby={headingId}>
      <div className="feedback-main">
        <p className="verdict" id={headingId}>
          <span className="verdict-dot" aria-hidden="true">
            <Icon name={right ? 'check' : 'cross'} />
          </span>
          {right ? 'Esatto' : `La risposta è ${correctLetter}`}
        </p>
        <p className="fact">{item.answer}</p>
        <p className="explain">{item.feedback}</p>
      </div>

      {item.discussionPrompt && (
        <details className="discuss">
          <summary>
            <span className="discuss-mark" aria-hidden="true">
              <Icon name="question" />
            </span>
            <span className="discuss-label">{BANK.discussionLabel}</span>
            <span className="discuss-hint">
              <span className="when-closed">Apri</span>
              <span className="when-open">Chiudi</span>
              <Icon name="chevron" className="chev" />
            </span>
          </summary>
          <p className="discuss-text">{item.discussionPrompt}</p>
        </details>
      )}

      <footer className="feedback-foot">
        {item.year && (
          <p className="year">
            <Icon name="calendar" />
            <span>
              <span className="foot-label">Dati</span> {item.year}
            </span>
          </p>
        )}
        {item.sources.length > 0 && (
          <details className="fb-sources">
            <summary>
              <Icon name="book" />
              Fonti ({item.sources.length})
              <Icon name="chevron" className="chev" />
            </summary>
            <SourceList item={item} />
          </details>
        )}
      </footer>

      <details className="teacher-more">
        <summary>
          <Icon name="note" />
          Approfondimento per il docente
          <Icon name="chevron" className="chev" />
        </summary>
        <TeacherNotes item={item} />
      </details>
    </article>
  );
}
