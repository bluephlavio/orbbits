/**
 * The battery: the ordered questions of the next game, whatever entry produced them.
 * Reorder with the arrows (touch, keyboard) or by dragging (mouse); remove, shuffle, empty,
 * save as a personal route. Built-in routes are never overwritten. Questions removed by a new
 * edition are listed with their suggested alternatives, which the teacher may add or ignore.
 * An empty battery can be edited and saved, never played.
 */
import { useState } from 'react';
import { MAX_DESCRIPTION, MAX_TITLE } from '../quiz/presets.ts';
import type { Origin } from '../quiz/presets.ts';
import { addIds, moveId, removeId } from '../quiz/selection.ts';
import { BANK } from './data.ts';
import { Icon } from './icons.tsx';
import type { Library } from './useLibrary.ts';

function originLabel(origin: Origin): string {
  switch (origin.kind) {
    case 'empty':
      return 'Vuota';
    case 'manual':
      return 'Scelta dalla banca';
    case 'random':
      return origin.edited ? 'Estratta a caso, poi modificata' : `Estratta a caso`;
    case 'preset':
      return origin.edited ? `Da «${origin.title}», modificata` : `Percorso «${origin.title}»`;
  }
}

function RetiredBox({ library, notify }: { library: Library; notify: (m: string) => void }) {
  const { retired, ids } = library.draft;
  return (
    <div className="retired" role="region" aria-label="Domande non più attive">
      <p className="retired-head">
        <Icon name="info" />
        <span>
          {retired.length === 1
            ? '1 domanda di questa batteria non è più giocabile ed è stata tolta.'
            : `${retired.length} domande di questa batteria non sono più giocabili e sono state tolte.`}
        </span>
      </p>
      <ul>
        {retired.map((id) => {
          const info = BANK.retired.get(id);
          const alt = info?.suggestion ? BANK.byId.get(info.suggestion) : undefined;
          const present = alt ? ids.includes(alt.id) : false;
          return (
            <li key={id}>
              <span className="retired-id">
                <s>{id}</s> {info?.title ? <span className="retired-title">{info.title}</span> : <span className="retired-title">non presente nella banca</span>}
                {info?.reason === 'review' && <span className="retired-title"> · in revisione editoriale</span>}
              </span>
              {alt && (
                <span className="retired-alt">
                  <span>Alternativa possibile: {alt.id} · {alt.title}</span>
                  {present ? (
                    <span className="retired-in">già in batteria</span>
                  ) : (
                    <button
                      type="button"
                      className="mini"
                      onClick={() => {
                        library.edit(addIds(ids, [alt.id]));
                        notify(`Aggiunta ${alt.id} in fondo alla batteria.`);
                      }}
                    >
                      <Icon name="plus" /> Aggiungi {alt.id}
                    </button>
                  )}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <button type="button" className="link-button" onClick={library.dismissRetired}>
        Chiudi l’elenco
      </button>
    </div>
  );
}

function SaveForm({
  library,
  onDone,
  notify,
}: {
  library: Library;
  onDone: () => void;
  notify: (m: string) => void;
}) {
  const { origin } = library.draft;
  const mine =
    origin.kind === 'preset' ? library.personal.find((p) => p.id === origin.presetId) : undefined;
  const suggested =
    origin.kind === 'preset' ? (mine ? mine.title : `${origin.title} · mia versione`) : 'La mia batteria';
  const [title, setTitle] = useState(suggested);
  const [description, setDescription] = useState(mine?.description ?? '');

  const submit = (event: { preventDefault(): void }) => {
    event.preventDefault();
    const preset = library.saveAsNew(title, description);
    notify(`Salvato «${preset.title}» fra i tuoi percorsi.`);
    onDone();
  };

  return (
    <form className="save-form" onSubmit={submit}>
      <label>
        <span>Nome del percorso</span>
        <input
          value={title}
          maxLength={MAX_TITLE}
          onChange={(e) => setTitle(e.target.value)}
          required
          autoFocus
        />
      </label>
      <label>
        <span>Descrizione (facoltativa)</span>
        <input
          value={description}
          maxLength={MAX_DESCRIPTION}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      <div className="save-actions">
        <button type="submit" className="chip strong">
          <Icon name="save" /> Salva come nuovo
        </button>
        {mine && origin.kind === 'preset' && origin.edited && (
          <button
            type="button"
            className="chip"
            onClick={() => {
              library.overwrite(mine.id);
              notify(`Aggiornato «${mine.title}».`);
              onDone();
            }}
          >
            Aggiorna «{mine.title}»
          </button>
        )}
        <button type="button" className="link-button" onClick={onDone}>
          Annulla
        </button>
      </div>
      {origin.kind === 'preset' && !mine && (
        <p className="fine">I percorsi pronti non cambiano: la tua versione diventa un percorso nuovo.</p>
      )}
    </form>
  );
}

export default function Battery({
  library,
  onShuffle,
  onStart,
  notify,
  shuffleOptions,
  onShuffleOptions,
}: {
  library: Library;
  onShuffle: () => void;
  onStart: () => void;
  notify: (m: string) => void;
  shuffleOptions: boolean;
  onShuffleOptions: (value: boolean) => void;
}) {
  const { ids, origin } = library.draft;
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const move = (from: number, to: number) => library.edit(moveId(ids, from, to));

  return (
    <aside className="battery" aria-label="Batteria">
      <header className="battery-head">
        <div>
          <h3>Batteria</h3>
          <p className="origin">{originLabel(origin)}</p>
        </div>
        <p className="battery-count" aria-live="polite">
          <b>{ids.length}</b>
          <span>{ids.length === 1 ? 'domanda' : 'domande'}</span>
        </p>
      </header>

      {library.draft.retired.length > 0 && <RetiredBox library={library} notify={notify} />}

      {ids.length === 0 ? (
        <div className="battery-empty">
          <svg viewBox="0 0 120 60" aria-hidden="true">
            <circle cx="45" cy="30" r="24" className="lens-cool" />
            <circle cx="75" cy="30" r="24" className="lens-warm" />
          </svg>
          <p>
            {origin.kind === 'preset'
              ? `«${origin.title}» non ha domande attive: aggiungine dalla Banca o A caso, poi salvalo.`
              : 'Scegli un percorso, aggiungi domande dalla banca o estraile a caso.'}
          </p>
        </div>
      ) : (
        <ol className="battery-list">
          {ids.map((id, index) => {
            const item = BANK.byId.get(id);
            if (!item) return null;
            return (
              <li
                key={id}
                draggable
                data-dragging={dragging === index || undefined}
                data-over={over === index && dragging !== index ? (dragging! < index ? 'after' : 'before') : undefined}
                onDragStart={(e) => {
                  setDragging(index);
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', id);
                }}
                onDragOver={(e) => {
                  if (dragging === null) return;
                  e.preventDefault();
                  setOver(index);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragging !== null) move(dragging, index);
                  setDragging(null);
                  setOver(null);
                }}
                onDragEnd={() => {
                  setDragging(null);
                  setOver(null);
                }}
              >
                <span className="pos" aria-hidden="true">
                  <Icon name="grip" className="grip" />
                  <span>{index + 1}</span>
                </span>
                <span className="b-text">
                  <span className="b-title">{item.title}</span>
                  <span className="b-id">{item.id}</span>
                </span>
                <span className="b-tools">
                  <button
                    type="button"
                    className="mini icon-only"
                    disabled={index === 0}
                    onClick={() => move(index, index - 1)}
                    aria-label={`Sposta su ${item.id}`}
                  >
                    <Icon name="up" />
                  </button>
                  <button
                    type="button"
                    className="mini icon-only"
                    disabled={index === ids.length - 1}
                    onClick={() => move(index, index + 1)}
                    aria-label={`Sposta giù ${item.id}`}
                  >
                    <Icon name="down" />
                  </button>
                  <button
                    type="button"
                    className="mini icon-only"
                    onClick={() => library.edit(removeId(ids, id))}
                    aria-label={`Togli ${item.id}`}
                  >
                    <Icon name="cross" />
                  </button>
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {ids.length > 15 && (
        <p className="fine hint">Oltre 15 domande spiegate richiedono spesso più di una lezione.</p>
      )}

      {ids.length > 0 && !saving && (
        <div className="battery-tools">
          <button type="button" className="chip" onClick={onShuffle} disabled={ids.length < 2}>
            <Icon name="shuffle" /> Rimescola
          </button>
          <button type="button" className="chip" onClick={() => setSaving(true)}>
            <Icon name="save" /> Salva
          </button>
          {confirmClear ? (
            <span className="ask-inline">
              <button
                type="button"
                className="chip danger"
                onClick={() => {
                  library.clear();
                  setConfirmClear(false);
                }}
              >
                Svuota
              </button>
              <button type="button" className="link-button" onClick={() => setConfirmClear(false)}>
                No
              </button>
            </span>
          ) : (
            <button type="button" className="chip quiet" onClick={() => setConfirmClear(true)}>
              <Icon name="trash" /> Svuota
            </button>
          )}
        </div>
      )}
      {saving && <SaveForm library={library} onDone={() => setSaving(false)} notify={notify} />}

      {ids.length > 0 && (
        <label className="switch compact">
          <input type="checkbox" checked={shuffleOptions} onChange={(e) => onShuffleOptions(e.target.checked)} />
          <span className="switch-track" aria-hidden="true" />
          <span className="switch-text">
            Alternative in ordine casuale
            <small>utile per rigiocare una batteria già vista</small>
          </span>
        </label>
      )}

      <div className="start-bar">
        <button type="button" className="primary start" disabled={ids.length === 0} onClick={onStart}>
          Inizia
          <span className="start-count">{ids.length > 0 ? `${ids.length} ${ids.length === 1 ? 'domanda' : 'domande'}` : ''}</span>
          <Icon name="next" />
        </button>
      </div>
    </aside>
  );
}
