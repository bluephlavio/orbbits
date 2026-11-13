/**
 * Preparation: three entries (Percorsi, Banca, A caso) on one side, the battery they all feed
 * on the other. Filters are shared by Banca and A caso, so a draw happens "within the filters".
 */
import { useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import type { Rng } from '../quiz/selection.ts';
import { addIds, drawPool, drawRandom, filterItems, NO_FILTERS, shuffleIds, toggleId } from '../quiz/selection.ts';
import type { Filters } from '../quiz/selection.ts';
import Battery from './Battery.tsx';
import MigrationNotice from './MigrationNotice.tsx';
import { BANK } from './data.ts';
import { Icon, LensMark } from './icons.tsx';
import { BankPanel, PresetsPanel, RandomPanel } from './Sources.tsx';
import type { Library } from './useLibrary.ts';

type Tab = 'presets' | 'bank' | 'random';

const TABS: { id: Tab; label: string; icon: 'route' | 'list' | 'dice' }[] = [
  { id: 'presets', label: 'Percorsi', icon: 'route' },
  { id: 'bank', label: 'Banca', icon: 'list' },
  { id: 'random', label: 'A caso', icon: 'dice' },
];

export default function Setup({
  library,
  rng,
  onStart,
  resume,
  notice,
  onDismissNotice,
  shuffleOptions,
  onShuffleOptions,
  tools,
}: {
  library: Library;
  rng: Rng;
  onStart: () => void;
  resume: { index: number; total: number; onResume: () => void } | null;
  /** A short explanation to show once (an interrupted game that cannot resume). */
  notice: string | null;
  onDismissNotice: () => void;
  shuffleOptions: boolean;
  onShuffleOptions: (value: boolean) => void;
  tools: ReactNode;
}) {
  const [tab, setTab] = useState<Tab>('presets');
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [useDefaults, setUseDefaults] = useState(true);
  const [count, setCount] = useState(10);
  const [toast, setToast] = useState<{ text: string; key: number } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const notify = (text: string) => {
    clearTimeout(toastTimer.current);
    setToast({ text, key: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), 3800);
  };

  const visible = useMemo(() => filterItems(BANK.items, filters), [filters]);
  const pool = useMemo(
    () => drawPool(BANK.items, filters, BANK.randomDefaults, useDefaults),
    [filters, useDefaults],
  );
  const { ids } = library.draft;

  const draw = () => {
    const drawn = drawRandom(pool, count, rng).map((i) => i.id);
    library.setDrawn(drawn);
    notify(
      drawn.length < count
        ? `Estratte tutte le ${drawn.length} disponibili.`
        : `Estratte ${drawn.length} domande.`,
    );
  };

  const onTabKey = (event: KeyboardEvent, index: number) => {
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = (index + delta + TABS.length) % TABS.length;
    setTab(TABS[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <section className="setup" aria-label="Preparazione">
      <header className="bar setup-bar">
        <span className="bank-meta">
          {BANK.items.length} domande · {BANK.presets.length} percorsi pronti
          {BANK.edition ? ` · ${BANK.edition}ª edizione` : ''}
        </span>
        <div className="tools">{tools}</div>
      </header>

      <div className="hero">
        <LensMark className="hero-mark" />
        <h2>Cambiare le lenti</h2>
        <p>
          Domande sul mondo presente per mettere alla prova le immagini che abbiamo di società e
          aree geografiche. Dopo ogni risposta, la spiegazione e una domanda che resta aperta.
        </p>
        {BANK.status === 'provisional' && (
          <p className="provisional">
            <Icon name="info" />
            <span>
              Prototipo: le domande sono materiale provvisorio, in revisione editoriale, non una
              raccolta verificata. Ogni risposta indica anno e fonti da controllare.
            </span>
          </p>
        )}
      </div>

      {notice && (
        <div className="notice" role="status">
          <Icon name="info" />
          <p>{notice}</p>
          <button type="button" className="link-button" onClick={onDismissNotice}>
            Chiudi
          </button>
        </div>
      )}

      {library.migration && <MigrationNotice library={library} />}

      {resume && (
        <div className="resume" role="status">
          <span>
            Partita in corso · domanda <b>{resume.index + 1}</b> di {resume.total}
          </span>
          <button type="button" className="chip strong" onClick={resume.onResume}>
            Riprendi <Icon name="next" />
          </button>
        </div>
      )}

      <div className="setup-grid">
        <div className="sources">
          <div className="tabs" role="tablist" aria-label="Come comporre la batteria">
            {TABS.map((t, i) => (
              <button
                key={t.id}
                ref={(node) => {
                  tabRefs.current[i] = node;
                }}
                type="button"
                role="tab"
                id={`wlq-tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls={`wlq-panel-${t.id}`}
                tabIndex={tab === t.id ? 0 : -1}
                onClick={() => setTab(t.id)}
                onKeyDown={(e) => onTabKey(e, i)}
              >
                <Icon name={t.icon} />
                {t.label}
                {t.id === 'bank' && <span className="tab-count">{BANK.items.length}</span>}
              </button>
            ))}
          </div>

          <div
            className="tab-panel"
            role="tabpanel"
            id={`wlq-panel-${tab}`}
            aria-labelledby={`wlq-tab-${tab}`}
            key={tab}
          >
            {tab === 'presets' && <PresetsPanel library={library} notify={notify} />}
            {tab === 'bank' && (
              <BankPanel
                filters={filters}
                onFilters={setFilters}
                visible={visible}
                battery={ids}
                onToggle={(id) => library.edit(toggleId(ids, id))}
                onAddAll={(more) => {
                  library.edit(addIds(ids, more));
                  notify(more.length === 1 ? 'Aggiunta 1 domanda.' : `Aggiunte ${more.length} domande.`);
                }}
              />
            )}
            {tab === 'random' && (
              <RandomPanel
                filters={filters}
                onFilters={setFilters}
                pool={pool}
                useDefaults={useDefaults}
                onUseDefaults={setUseDefaults}
                count={count}
                onCount={setCount}
                onDraw={draw}
                origin={library.draft.origin}
              />
            )}
          </div>
        </div>

        <Battery
          library={library}
          notify={notify}
          onShuffle={() => library.edit(shuffleIds(ids, BANK.byId, rng))}
          onStart={onStart}
          shuffleOptions={shuffleOptions}
          onShuffleOptions={onShuffleOptions}
        />
      </div>

      <div className="dock">
        <div aria-live="polite">
          {toast && (
            <p className="toast" key={toast.key}>
              {toast.text}
            </p>
          )}
        </div>
        {ids.length > 0 && (
          <button type="button" className="primary start" onClick={onStart}>
            Inizia
            <span className="start-count">
              {ids.length} {ids.length === 1 ? 'domanda' : 'domande'}
            </span>
            <Icon name="next" />
          </button>
        )}
      </div>
    </section>
  );
}
