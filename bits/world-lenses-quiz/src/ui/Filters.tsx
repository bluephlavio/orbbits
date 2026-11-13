/**
 * Search plus the filters the bank's metadata supports (selection_contract.filters): topic
 * (chapters and keywords), geographic area (large areas and places), and the card's kind and
 * priority. Years are free text in the bank, so they are reached through the search.
 * Shared by Banca and A caso.
 */
import { useMemo } from 'react';
import type { Filters as FilterState } from '../quiz/selection.ts';
import { areasOf, hasFilters, MACRO_AREAS, NO_FILTERS } from '../quiz/selection.ts';
import { BANK } from './data.ts';
import { Icon } from './icons.tsx';

const KIND_LABELS: Record<string, string> = {
  struttura: 'Strutture del presente',
  trasformazione: 'Trasformazioni',
  relazione: 'Relazioni fra società',
};

export default function Filters({
  value,
  onChange,
  idPrefix,
}: {
  value: FilterState;
  onChange: (next: FilterState) => void;
  idPrefix: string;
}) {
  const areaCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of BANK.items) for (const a of areasOf(item)) counts.set(a, (counts.get(a) ?? 0) + 1);
    return counts;
  }, []);
  const places = BANK.regions.filter((r) => !(MACRO_AREAS as readonly string[]).includes(r.name));

  return (
    <div className="filters">
      <label className="search">
        <Icon name="search" />
        <span className="sr-only">Cerca nella banca</span>
        <input
          id={`${idPrefix}-q`}
          type="search"
          placeholder="Cerca: Cina, rifugiati, istruzione, 2024…"
          value={value.query}
          onChange={(e) => onChange({ ...value, query: e.target.value })}
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      <div className="selects">
        <label className="select">
          <span>Argomento</span>
          <select value={value.topic} onChange={(e) => onChange({ ...value, topic: e.target.value })}>
            <option value="">Tutti</option>
            <optgroup label="Nuclei">
              {BANK.chapters.map((c) => (
                <option key={c.id} value={`chapter:${c.id}`}>
                  {c.title} ({c.count})
                </option>
              ))}
            </optgroup>
            <optgroup label="Parole chiave">
              {BANK.topics.map((t) => (
                <option key={t.name} value={`topic:${t.name}`}>
                  {t.name} ({t.count})
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <label className="select">
          <span>Area geografica</span>
          <select value={value.area} onChange={(e) => onChange({ ...value, area: e.target.value })}>
            <option value="">Tutte</option>
            <optgroup label="Grandi aree">
              {MACRO_AREAS.map((a) => (
                <option key={a} value={`area:${a}`}>
                  {a === 'Mondo' ? 'Mondo intero' : a} ({areaCounts.get(a) ?? 0})
                </option>
              ))}
            </optgroup>
            <optgroup label="Paesi e regioni">
              {places.map((p) => (
                <option key={p.name} value={`place:${p.name}`}>
                  {p.name} ({p.count})
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <label className="select">
          <span>Tipo</span>
          <select value={value.card} onChange={(e) => onChange({ ...value, card: e.target.value })}>
            <option value="">Tutti</option>
            <optgroup label="Che cosa mette alla prova">
              {BANK.kinds.map((k) => (
                <option key={k.name} value={`kind:${k.name}`}>
                  {KIND_LABELS[k.name] ?? k.name} ({k.count})
                </option>
              ))}
            </optgroup>
            <optgroup label="Priorità">
              {BANK.priorities.map((p) => (
                <option key={p.name} value={`priority:${p.name}`}>
                  {p.name === 'A' ? 'Principali (A)' : p.name === 'B' ? 'Secondarie (B)' : p.name} ({p.count})
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        {hasFilters(value) && (
          <button type="button" className="link-button" onClick={() => onChange(NO_FILTERS)}>
            Azzera
          </button>
        )}
      </div>
    </div>
  );
}
