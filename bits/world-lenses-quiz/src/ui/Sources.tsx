/**
 * The three entries of the preparation, each feeding the same battery:
 * ready routes (presets), manual choice from the bank, random draw.
 * Teacher titles and notes may appear here, never during play.
 */
import { useRef, useState } from 'react';
import type { Item, Preset } from '../quiz/bank.ts';
import { LETTERS } from '../quiz/bank.ts';
import type { Origin } from '../quiz/presets.ts';
import type { Filters as FilterState } from '../quiz/selection.ts';
import { BANK } from './data.ts';
import { TeacherNotes } from './Feedback.tsx';
import Filters from './Filters.tsx';
import { Icon } from './icons.tsx';
import type { Library } from './useLibrary.ts';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/* Presets -------------------------------------------------------------------------------- */

function PresetCard({
  preset,
  active,
  onLoad,
  onExport,
  onDelete,
}: {
  preset: Preset;
  active: boolean;
  onLoad: () => void;
  onExport?: () => void;
  onDelete?: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <li className="preset" data-active={active || undefined} data-mine={!preset.builtIn || undefined}>
      <button type="button" className="preset-main" onClick={onLoad} aria-pressed={active}>
        <span className="preset-title">{preset.title}</span>
        {preset.description && <span className="preset-desc">{preset.description}</span>}
        <span className="preset-count">
          {preset.itemIds.length === 0 ? 'vuoto · da ricomporre' : plural(preset.itemIds.length, 'domanda', 'domande')}
          {preset.held && preset.held.length > 0 && (
            <span className="preset-retired">{preset.held.length === 1 ? '1 in revisione' : `${preset.held.length} in revisione`}</span>
          )}
          {preset.retired.length > 0 && (
            <span className="preset-retired">
              {preset.retired.length === 1 ? '1 tolta' : `${preset.retired.length} tolte`} dalla nuova edizione
            </span>
          )}
        </span>
      </button>
      {(onExport || onDelete) && (
        <div className="preset-tools">
          {confirming ? (
            <>
              <span className="preset-ask">Eliminare?</span>
              <button type="button" className="mini danger" onClick={onDelete}>
                Elimina
              </button>
              <button type="button" className="mini" onClick={() => setConfirming(false)}>
                No
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="mini icon-only"
                onClick={onExport}
                aria-label={`Esporta «${preset.title}»`}
                title="Esporta come JSON"
              >
                <Icon name="download" />
              </button>
              <button
                type="button"
                className="mini icon-only"
                onClick={() => setConfirming(true)}
                aria-label={`Elimina «${preset.title}»`}
                title="Elimina"
              >
                <Icon name="trash" />
              </button>
            </>
          )}
        </div>
      )}
    </li>
  );
}

export function PresetsPanel({
  library,
  notify,
}: {
  library: Library;
  notify: (message: string) => void;
}) {
  const file = useRef<HTMLInputElement>(null);
  const { origin } = library.draft;
  const isActive = (p: Preset) => origin.kind === 'preset' && origin.presetId === p.id && !origin.edited;

  const onFile = async (input: HTMLInputElement) => {
    const chosen = input.files?.[0];
    input.value = '';
    if (!chosen) return;
    if (chosen.size > 2_000_000) {
      notify('Il file è troppo grande per essere un elenco di percorsi.');
      return;
    }
    notify(library.importText(await chosen.text()).message);
  };

  return (
    <div className="panel-presets">
      <ul className="preset-grid">
        {BANK.presets.map((p) => (
          <PresetCard
            key={p.id}
            preset={p}
            active={isActive(p)}
            onLoad={() => {
              library.loadPreset(p);
              notify(`Caricato «${p.title}».`);
            }}
          />
        ))}
      </ul>

      <div className="mine-head">
        <h3>I tuoi percorsi</h3>
        <div className="mine-tools">
          <button type="button" className="chip" onClick={() => file.current?.click()}>
            <Icon name="upload" /> Importa
          </button>
          {library.personal.length > 0 && (
            <button
              type="button"
              className="chip"
              onClick={() => library.exportPresets(library.personal, 'cambiare-le-lenti-percorsi.json')}
            >
              <Icon name="download" /> Esporta tutti
            </button>
          )}
          <input
            ref={file}
            type="file"
            accept=".json,application/json"
            className="sr-only"
            tabIndex={-1}
            aria-label="File JSON con i percorsi da importare"
            onChange={(e) => void onFile(e.currentTarget)}
          />
        </div>
      </div>
      {library.personal.length === 0 ? (
        <p className="empty-note">
          Componi una batteria e salvala: la ritroverai qui, su questo dispositivo. Per portarla
          altrove, esportala come file JSON.
        </p>
      ) : (
        <ul className="preset-grid">
          {library.personal.map((p) => (
            <PresetCard
              key={p.id}
              preset={p}
              active={isActive(p)}
              onLoad={() => {
                library.loadPreset(p);
                notify(`Caricato «${p.title}».`);
              }}
              onExport={() => library.exportPresets([p], `${p.id}.json`)}
              onDelete={() => {
                library.remove(p.id);
                notify(`Eliminato «${p.title}».`);
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/* Bank ----------------------------------------------------------------------------------- */

/** What the teacher sees about an item while preparing; it includes the answer. */
export function ItemDetail({ item }: { item: Item }) {
  return (
    <div className="item-detail">
      <p className="detail-question">{item.question}</p>
      <ol className="detail-options">
        {item.options.map((option, i) => (
          <li key={i} data-correct={i === item.correct || undefined}>
            <span className="letter">{LETTERS[i]}</span>
            <span>{option}</span>
            {i === item.correct && <Icon name="check" className="ok" />}
          </li>
        ))}
      </ol>
      <p className="detail-answer">{item.answer}</p>
      {item.discussionPrompt && (
        <p className="detail-discuss">
          <span className="eyebrow">{BANK.discussionLabel}</span>
          {item.discussionPrompt}
        </p>
      )}
      <div className="teacher-note">
        <span className="eyebrow">Per il docente</span>
        <TeacherNotes item={item} />
      </div>
      <dl className="detail-meta">
        <div>
          <dt>Dati</dt>
          <dd>{item.year}</dd>
        </div>
        <div>
          <dt>Nucleo</dt>
          <dd>{item.chapterTitle}</dd>
        </div>
        <div>
          <dt>Luoghi</dt>
          <dd>{item.regions.join(', ')}</dd>
        </div>
        <div>
          <dt>Parole chiave</dt>
          <dd>{item.topics.join(', ')}</dd>
        </div>
        <div>
          <dt>Scheda</dt>
          <dd>
            {item.id} · priorità {item.priority} · {item.kind} · {plural(item.sources.length, 'fonte', 'fonti')}
            {item.revision ? ` · ${item.revision.toLowerCase()}` : ''}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function BankRow({
  item,
  selected,
  open,
  onToggle,
  onOpen,
}: {
  item: Item;
  selected: boolean;
  open: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  return (
    <li className="bank-row" data-selected={selected || undefined} data-open={open || undefined}>
      <button
        type="button"
        className="pick"
        aria-pressed={selected}
        aria-label={`${selected ? 'Togli dalla' : 'Aggiungi alla'} batteria: ${item.id}`}
        title={selected ? 'Togli dalla batteria' : 'Aggiungi alla batteria'}
        onClick={onToggle}
      >
        <Icon name={selected ? 'check' : 'plus'} />
      </button>
      <button type="button" className="row-main" aria-expanded={open} onClick={onOpen}>
        <span className="row-title">{item.title}</span>
        <span className="row-question">{item.question}</span>
      </button>
      <span className="row-id" aria-hidden="true">
        {item.id}
      </span>
      {open && <ItemDetail item={item} />}
    </li>
  );
}

export function BankPanel({
  filters,
  onFilters,
  visible,
  battery,
  onToggle,
  onAddAll,
}: {
  filters: FilterState;
  onFilters: (f: FilterState) => void;
  visible: Item[];
  battery: string[];
  onToggle: (id: string) => void;
  onAddAll: (ids: string[]) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const inBattery = new Set(battery);
  const missing = visible.filter((i) => !inBattery.has(i.id));
  const filtered = visible.length !== BANK.items.length;

  return (
    <div className="panel-bank">
      <Filters value={filters} onChange={onFilters} idPrefix="bank" />
      <div className="count-line" aria-live="polite">
        <span>
          <b>{visible.length}</b> {filtered ? `di ${BANK.items.length} ` : ''}
          {visible.length === 1 ? 'domanda' : 'domande'}
        </span>
        {filtered && missing.length > 0 && (
          <button type="button" className="link-button" onClick={() => onAddAll(missing.map((i) => i.id))}>
            Aggiungi {missing.length === 1 ? 'questa' : `queste ${missing.length}`}
          </button>
        )}
      </div>
      {visible.length === 0 ? (
        <p className="empty-note">Nessuna domanda con questi criteri.</p>
      ) : (
        <ul className="bank-list">
          {visible.map((item) => (
            <BankRow
              key={item.id}
              item={item}
              selected={inBattery.has(item.id)}
              open={openId === item.id}
              onToggle={() => onToggle(item.id)}
              onOpen={() => setOpenId(openId === item.id ? null : item.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/* Random draw ---------------------------------------------------------------------------- */

export function RandomPanel({
  filters,
  onFilters,
  pool,
  useDefaults,
  onUseDefaults,
  count,
  onCount,
  onDraw,
  origin,
}: {
  filters: FilterState;
  onFilters: (f: FilterState) => void;
  pool: Item[];
  useDefaults: boolean;
  onUseDefaults: (v: boolean) => void;
  count: number;
  onCount: (n: number) => void;
  onDraw: () => void;
  origin: Origin;
}) {
  const available = pool.length;
  const short = available > 0 && count > available;
  const drawn = Math.min(count, available);
  const clamp = (n: number) => Math.max(1, Math.min(60, Math.round(n) || 1));
  const { priority, excludeKinds } = BANK.randomDefaults;
  const defaultsLabel = [
    priority.length ? `priorità ${priority.join(', ')}` : '',
    excludeKinds.length ? `senza ${excludeKinds.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="panel-random">
      <Filters value={filters} onChange={onFilters} idPrefix="draw" />
      <label className="switch">
        <input type="checkbox" checked={useDefaults} onChange={(e) => onUseDefaults(e.target.checked)} />
        <span className="switch-track" aria-hidden="true" />
        <span className="switch-text">
          Solo domande principali
          <small>{defaultsLabel}</small>
        </span>
      </label>

      <div className="draw-box">
        <div className="stepper" role="group" aria-label="Numero di domande da estrarre">
          <button type="button" onClick={() => onCount(clamp(count - 1))} aria-label="Una domanda in meno" disabled={count <= 1}>
            −
          </button>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={60}
            value={count}
            aria-label="Domande da estrarre"
            onChange={(e) => onCount(clamp(Number(e.target.value)))}
          />
          <button type="button" onClick={() => onCount(clamp(count + 1))} aria-label="Una domanda in più" disabled={count >= 60}>
            +
          </button>
        </div>
        <p className="available" aria-live="polite">
          <b>{available}</b> {available === 1 ? 'disponibile' : 'disponibili'} con questi criteri
        </p>
        {short && (
          <p className="warn" role="status">
            Ne {available === 1 ? 'è disponibile' : 'sono disponibili'} solo {available}: verranno estratte
            tutte. Per averne {count}, allarga i filtri
            {useDefaults ? ' o includi anche le domande secondarie' : ''}.
          </p>
        )}
        {available === 0 && (
          <p className="warn" role="status">
            Nessuna domanda con questi criteri: allarga i filtri.
          </p>
        )}
        <button type="button" className="primary" disabled={available === 0} onClick={onDraw}>
          <Icon name="dice" />
          {available === 0 ? 'Estrai' : `Estrai ${drawn} ${drawn === 1 ? 'domanda' : 'domande'}`}
        </button>
        <p className="fine">
          Senza ripetizioni, evitando di insistere su un solo Paese.
          {origin.kind !== 'empty' ? ' La batteria attuale verrà sostituita.' : ''}
        </p>
      </div>
    </div>
  );
}
