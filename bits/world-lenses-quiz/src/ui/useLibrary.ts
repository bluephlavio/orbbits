/**
 * The preparation state in React: the battery being composed (with where it came from) and the
 * personal presets, both kept in this browser's localStorage. Storage may be missing or refuse
 * writes (private mode, quota): everything then lasts as long as the page.
 *
 * On the first reading after a change of bank edition, presets and battery are migrated (see
 * quiz/presets.ts) and the changes are kept in `migration` for the notice in the preparation.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Preset } from '../quiz/bank.ts';
import {
  createPreset,
  DRAFT_KEY,
  EMPTY_DRAFT,
  entriesOf,
  exportFile,
  mergePresets,
  readDraft,
  readStored,
  serializeDraft,
  STORAGE_KEY,
} from '../quiz/presets.ts';
import type { Draft, PresetChange } from '../quiz/presets.ts';
import { BANK } from './data.ts';

export function readKey(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeKey(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* kept in memory only */
  }
}

/** Starts a download of `text` as a file, without leaving anything in the page. */
export function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export interface Migration {
  /** Edition the stored presets were written for, null if unknown (older format). */
  fromEdition: number | null;
  presets: PresetChange[];
  /** Ids the battery being composed lost. */
  draftRemoved: string[];
  /** A ready route reloaded in its new edition. */
  draftRefreshed: string | null;
}

function restore() {
  const stored = readStored(readKey(STORAGE_KEY), BANK);
  const restored = readDraft(readKey(DRAFT_KEY), BANK, stored.presets);
  const migration: Migration = {
    fromEdition: stored.edition,
    presets: stored.changes,
    draftRemoved: restored?.removed ?? [],
    draftRefreshed: restored?.refreshed ?? null,
  };
  const changed = migration.presets.length > 0 || migration.draftRemoved.length > 0 || migration.draftRefreshed;
  return {
    personal: stored.presets,
    draft: restored?.draft ?? EMPTY_DRAFT,
    migration: changed ? migration : null,
  };
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many.replace('#', String(n)));

export function useLibrary() {
  const [initial] = useState(restore);
  const [personal, setPersonal] = useState<Preset[]>(initial.personal);
  const [draft, setDraft] = useState<Draft>(initial.draft);
  const [migration, setMigration] = useState<Migration | null>(initial.migration);

  useEffect(() => writeKey(STORAGE_KEY, exportFile(personal, BANK)), [personal]);
  useEffect(() => writeKey(DRAFT_KEY, serializeDraft(draft)), [draft]);

  const presets = useMemo(() => [...BANK.presets, ...personal], [personal]);

  /** Any edit of the ids: the origin is kept but marked as edited. */
  const edit = useCallback((ids: string[]) => {
    setDraft((current) => {
      const { origin } = current;
      if (origin.kind === 'preset' || origin.kind === 'random') {
        return { ...current, ids, origin: { ...origin, edited: true } };
      }
      return { ...current, ids, origin: ids.length ? { kind: 'manual' } : { kind: 'empty' } };
    });
  }, []);

  /** "Svuota": a new, empty battery. */
  const clear = useCallback(() => setDraft(EMPTY_DRAFT), []);

  const loadPreset = useCallback((preset: Preset) => {
    setDraft({
      ids: [...preset.itemIds],
      origin: { kind: 'preset', presetId: preset.id, title: preset.title, edited: false },
      retired: [...preset.retired],
    });
  }, []);

  const setDrawn = useCallback((ids: string[]) => {
    setDraft(ids.length ? { ids, origin: { kind: 'random', count: ids.length, edited: false }, retired: [] } : EMPTY_DRAFT);
  }, []);

  /**
   * The teacher has seen the removed questions: forget them for this battery and, when it is a
   * personal preset, for the preset too.
   */
  const dismissRetired = useCallback(() => {
    const { origin } = draft;
    if (origin.kind === 'preset') {
      setPersonal((list) => list.map((p) => (p.id === origin.presetId ? { ...p, retired: [] } : p)));
    }
    setDraft((current) => ({ ...current, retired: [] }));
  }, [draft]);

  /**
   * Hides the migration notice ("Ho capito"). The removed ids stay recorded on each route
   * until the teacher closes them in the battery or saves the route again.
   */
  const acknowledgeMigration = useCallback(() => setMigration(null), []);

  const saveAsNew = useCallback(
    (title: string, description: string) => {
      const preset = createPreset(
        title,
        description,
        draft.ids,
        [...BANK.presets, ...personal].map((p) => p.id),
      );
      setPersonal((list) => [...list, preset]);
      setDraft({
        ids: draft.ids,
        origin: { kind: 'preset', presetId: preset.id, title: preset.title, edited: false },
        retired: [],
      });
      return preset;
    },
    [draft.ids, personal],
  );

  /** Only personal presets can be overwritten; the new list is fully playable. */
  const overwrite = useCallback(
    (id: string, title?: string, description?: string) => {
      const target = personal.find((p) => p.id === id);
      if (!target) return;
      const next = {
        ...target,
        title: title?.trim() ? title.trim() : target.title,
        description: description !== undefined ? description.trim() : target.description,
        itemIds: [...draft.ids],
        retired: [],
      };
      setPersonal((list) => list.map((p) => (p.id === id ? next : p)));
      setDraft({ ids: draft.ids, origin: { kind: 'preset', presetId: id, title: next.title, edited: false }, retired: [] });
      return next;
    },
    [draft.ids, personal],
  );

  const remove = useCallback((id: string) => {
    setPersonal((list) => list.filter((p) => p.id !== id));
    setDraft((current) =>
      current.origin.kind === 'preset' && current.origin.presetId === id
        ? { ...current, origin: current.ids.length ? { kind: 'manual' } : { kind: 'empty' } }
        : current,
    );
  }, []);

  /** Imports a file's text; returns the message to show. */
  const importText = useCallback(
    (text: string): { ok: boolean; message: string } => {
      const entries = entriesOf(text);
      if (typeof entries === 'string') return { ok: false, message: entries };
      const merged = mergePresets(personal, entries, BANK);
      setPersonal(merged.presets);
      const parts: string[] = [];
      if (merged.added) parts.push(plural(merged.added, '1 percorso importato', '# percorsi importati'));
      if (merged.duplicates) parts.push(plural(merged.duplicates, '1 già presente, saltato', '# già presenti, saltati'));
      if (merged.invalid) parts.push(plural(merged.invalid, '1 voce non valida', '# voci non valide'));
      if (merged.retired.length) {
        parts.push(
          `${plural(merged.retired.length, '1 domanda non più attiva esclusa', '# domande non più attive escluse')} (${merged.retired.join(', ')})`,
        );
      }
      if (merged.repeats) parts.push(plural(merged.repeats, '1 ID ripetuto ignorato', '# ID ripetuti ignorati'));
      return {
        ok: merged.added > 0 || merged.duplicates > 0,
        message: parts.length ? `${parts.join(' · ')}.` : 'Nessun percorso nel file.',
      };
    },
    [personal],
  );

  const exportPresets = useCallback((list: Preset[], name: string) => {
    download(name, exportFile(list, BANK));
  }, []);

  return {
    presets,
    personal,
    draft,
    migration,
    edit,
    clear,
    loadPreset,
    setDrawn,
    dismissRetired,
    acknowledgeMigration,
    saveAsNew,
    overwrite,
    remove,
    importText,
    exportPresets,
  };
}

export type Library = ReturnType<typeof useLibrary>;
