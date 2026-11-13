/**
 * Personal presets: what is kept in the browser and what travels as a JSON file, and how both
 * cross a change of bank edition. Built-in presets come from the bank and are never changed; a
 * personalisation is saved as a new preset. Anything read back (storage, an imported file) is
 * untrusted and validated here.
 *
 * File format, version 2 (version 1 files, and a bare array of presets, a single preset, or
 * any object with a `presets` array such as the bank itself, are also accepted):
 *
 *   { "format": "orbbits.world-lenses-quiz.presets", "version": 2,
 *     "bank": "world-lenses-bank-1.1", "edition": 5,
 *     "presets": [{ "id", "title", "description", "item_ids": [...], "retired_ids": [...],
 *                   "order": "as_listed" }] }
 *
 * Migration: an id that is no longer active is moved from `item_ids` to `retired_ids`, in its
 * order; everything else (id, title, description, order of the remaining questions) is kept,
 * and a preset left with no playable question is kept too, to be edited. Suggested
 * equivalents are offered to the teacher, never substituted here.
 */
import type { Bank, Preset } from './bank.ts';
import { fold } from './selection.ts';

export const FILE_FORMAT = 'orbbits.world-lenses-quiz.presets';
export const FILE_VERSION = 2;
export const MAX_TITLE = 80;
export const MAX_DESCRIPTION = 280;
const MAX_IDS = 400;

/** What the readers need to know about the bank. */
export type BankIndex = Pick<Bank, 'byId' | 'retired' | 'presets' | 'edition' | 'schema'>;

type Raw = Record<string, unknown>;
const isObject = (value: unknown): value is Raw =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown, max: number) =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';

const slug = (title: string) =>
  fold(title)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'batteria';

/** A fresh id for a personal preset, distinct from every id in `taken`. */
export function uniqueId(title: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const base = `mio-${slug(title)}`;
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export function createPreset(
  title: string,
  description: string,
  ids: readonly string[],
  taken: Iterable<string>,
): Preset {
  const clean = text(title, MAX_TITLE) || 'La mia batteria';
  return {
    id: uniqueId(clean, taken),
    title: clean,
    description: text(description, MAX_DESCRIPTION),
    itemIds: [...new Set(ids)],
    builtIn: false,
    retired: [],
  };
}

/* Ids from untrusted lists ---------------------------------------------------------------- */

export interface Sorted {
  /** Active ids, once each, in the given order: the playable part. */
  active: string[];
  /** Other string ids, once each, in order: retired by an edition or unknown. */
  inactive: string[];
  /** How many entries repeated an id already listed. */
  repeats: number;
  /** Entries that were not ids at all (numbers, objects…). */
  junk: number;
}

/** Splits a list of ids into the playable ones and the rest, keeping the order of each. */
export function sortIds(listed: readonly unknown[], byId: ReadonlyMap<string, unknown>): Sorted {
  const seen = new Set<string>();
  const out: Sorted = { active: [], inactive: [], repeats: 0, junk: 0 };
  for (const entry of listed.slice(0, MAX_IDS)) {
    const id = typeof entry === 'string' ? entry.trim().slice(0, 40) : '';
    if (!id) {
      out.junk += 1;
    } else if (seen.has(id)) {
      out.repeats += 1;
    } else {
      seen.add(id);
      (byId.has(id) ? out.active : out.inactive).push(id);
    }
  }
  return out;
}

/** One preset from untrusted data, or null when it is not a preset at all. */
function readPreset(raw: unknown, bank: BankIndex) {
  if (!isObject(raw)) return null;
  const listed = Array.isArray(raw.item_ids) ? raw.item_ids : Array.isArray(raw.itemIds) ? raw.itemIds : null;
  if (!listed) return null;
  const sorted = sortIds(listed, bank.byId);
  const before = Array.isArray(raw.retired_ids) ? sortIds(raw.retired_ids, bank.byId) : null;
  // Ids retired earlier stay retired unless they became active again (then they are back).
  const back = before ? before.active.filter((id) => !sorted.active.includes(id)) : [];
  const retired = [...new Set([...(before?.inactive ?? []), ...sorted.inactive])];
  const preset: Preset = {
    id: text(raw.id, 60),
    title: text(raw.title, MAX_TITLE) || 'Batteria importata',
    description: text(raw.description, MAX_DESCRIPTION),
    itemIds: [...sorted.active, ...back],
    builtIn: false,
    retired,
  };
  return { preset, sorted };
}

/** The pair "same title, same playable questions in the same order" means the same preset. */
const sameContent = (a: Preset, b: Preset) =>
  fold(a.title) === fold(b.title) &&
  a.itemIds.length === b.itemIds.length &&
  a.itemIds.every((id, i) => id === b.itemIds[i]);

/* Import ----------------------------------------------------------------------------------- */

export interface Merge {
  presets: Preset[];
  added: number;
  /** Presets identical to one already there (same title and questions), skipped. */
  duplicates: number;
  /** Entries that are not presets, or name no question at all. */
  invalid: number;
  /** Ids no longer active found in the added presets, in order (shown to the teacher). */
  retired: string[];
  /** Repeated ids inside a preset, and entries that are not ids: ignored. */
  repeats: number;
}

/**
 * Adds presets from untrusted entries to `personal`. An entry identical to an existing preset
 * (same title, same playable ids in the same order) is skipped, so importing twice changes
 * nothing; an id already in use is replaced by a fresh one. A bad entry never blocks the
 * others. A preset whose questions were all retired is still added, empty, to be edited.
 */
export function mergePresets(personal: readonly Preset[], entries: readonly unknown[], bank: BankIndex): Merge {
  const presets = [...personal];
  const merge: Merge = { presets, added: 0, duplicates: 0, invalid: 0, retired: [], repeats: 0 };
  for (const entry of entries) {
    const read = readPreset(entry, bank);
    if (!read || (read.preset.itemIds.length === 0 && read.preset.retired.length === 0)) {
      merge.invalid += 1;
      continue;
    }
    const { preset: candidate, sorted } = read;
    merge.repeats += sorted.repeats + sorted.junk;
    if ([...bank.presets, ...presets].some((p) => sameContent(p, candidate))) {
      merge.duplicates += 1;
      continue;
    }
    const taken = [...bank.presets, ...presets].map((p) => p.id);
    const id =
      candidate.id.startsWith('mio-') && !taken.includes(candidate.id)
        ? candidate.id
        : uniqueId(candidate.title, taken);
    presets.push({ ...candidate, id });
    merge.added += 1;
    for (const r of candidate.retired) if (!merge.retired.includes(r)) merge.retired.push(r);
  }
  return merge;
}

/** The entries of an imported file, or an error message for the person importing it. */
export function entriesOf(fileText: string): unknown[] | string {
  let data: unknown;
  try {
    data = JSON.parse(fileText);
  } catch {
    return 'Il file non è un JSON valido.';
  }
  if (Array.isArray(data)) return data;
  if (isObject(data) && Array.isArray(data.presets)) return data.presets;
  if (isObject(data) && (Array.isArray(data.item_ids) || Array.isArray(data.itemIds))) return [data];
  return 'Il file non contiene percorsi riconoscibili.';
}

export function exportFile(presets: readonly Preset[], bank: Pick<Bank, 'edition' | 'schema'>, now = new Date()): string {
  return `${JSON.stringify(
    {
      format: FILE_FORMAT,
      version: FILE_VERSION,
      bank: bank.schema,
      edition: bank.edition,
      exported: now.toISOString(),
      presets: presets.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        item_ids: p.itemIds,
        ...(p.retired.length ? { retired_ids: p.retired } : {}),
        order: 'as_listed',
      })),
    },
    null,
    2,
  )}\n`;
}

/* Storage and migration ------------------------------------------------------------------ */

export const STORAGE_KEY = 'orbbits.world-lenses-quiz.presets';
export const DRAFT_KEY = 'orbbits.world-lenses-quiz.battery';

export interface PresetChange {
  id: string;
  title: string;
  /** Ids removed from the playable list by this reading, in their old order. */
  removed: string[];
  empty: boolean;
}

export interface StoredPresets {
  presets: Preset[];
  /** The edition the stored list was written for; null for files without one (version 1). */
  edition: number | null;
  /** Presets that lost questions on this reading: what the migration notice reports. */
  changes: PresetChange[];
}

/**
 * Personal presets from storage, as saved (no de-duplication by content, ids and order kept).
 * Ids no longer active move to `retired`; a preset left empty is kept. Entries that are not
 * presets are left out; an id clash gets a fresh id.
 */
export function readStored(stored: string | null, bank: BankIndex): StoredPresets {
  const none: StoredPresets = { presets: [], edition: null, changes: [] };
  if (!stored) return none;
  const entries = entriesOf(stored);
  if (typeof entries === 'string') return none;
  let edition: number | null = null;
  try {
    const data: unknown = JSON.parse(stored);
    if (isObject(data) && typeof data.edition === 'number') edition = data.edition;
  } catch {
    /* entriesOf already parsed it */
  }
  const out: Preset[] = [];
  const changes: PresetChange[] = [];
  for (const entry of entries) {
    const read = readPreset(entry, bank);
    if (!read) continue;
    const taken = [...bank.presets, ...out].map((p) => p.id);
    const { preset, sorted } = read;
    const kept =
      preset.id.startsWith('mio-') && !taken.includes(preset.id)
        ? preset
        : { ...preset, id: uniqueId(preset.title, taken) };
    out.push(kept);
    if (sorted.inactive.length) {
      changes.push({ id: kept.id, title: kept.title, removed: sorted.inactive, empty: kept.itemIds.length === 0 });
    }
  }
  return { presets: out, edition, changes };
}

export interface Draft {
  ids: string[];
  /** Where the battery came from, for the label above it. */
  origin: Origin;
  /** Ids this battery lost to a new edition, shown with suggestions until dismissed. */
  retired: string[];
}

export type Origin =
  | { kind: 'empty' }
  | { kind: 'preset'; presetId: string; title: string; edited: boolean }
  | { kind: 'manual' }
  | { kind: 'random'; count: number; edited: boolean };

export const EMPTY_DRAFT: Draft = { ids: [], origin: { kind: 'empty' }, retired: [] };

export const serializeDraft = (draft: Draft) => JSON.stringify(draft);

export interface RestoredDraft {
  draft: Draft;
  /** Ids removed from the battery on this reading. */
  removed: string[];
  /** Title of a ready route whose new edition replaced the battery, if that happened. */
  refreshed: string | null;
}

/**
 * The battery being composed, from storage. Unknown ids are removed and listed. A battery that
 * was an unedited ready route is replaced by that route as the current bank defines it (the
 * new edition's presets replace the old ones with the same id).
 */
export function readDraft(stored: string | null, bank: BankIndex, personal: readonly Preset[] = []): RestoredDraft | null {
  if (!stored) return null;
  let data: unknown;
  try {
    data = JSON.parse(stored);
  } catch {
    return null;
  }
  if (!isObject(data) || !Array.isArray(data.ids)) return null;
  const sorted = sortIds(data.ids, bank.byId);
  const before = Array.isArray(data.retired) ? sortIds(data.retired, bank.byId).inactive : [];
  const retired = [...new Set([...before, ...sorted.inactive])];
  const origin = isObject(data.origin) ? data.origin : {};
  const ids = sorted.active;

  if (origin.kind === 'preset' && typeof origin.presetId === 'string') {
    const builtIn = bank.presets.find((p) => p.id === origin.presetId);
    const mine = personal.find((p) => p.id === origin.presetId);
    const edited = origin.edited === true;
    if (builtIn && !edited) {
      const changed = builtIn.itemIds.join() !== data.ids.join();
      return {
        draft: { ids: [...builtIn.itemIds], origin: { kind: 'preset', presetId: builtIn.id, title: builtIn.title, edited: false }, retired: [] },
        removed: [],
        refreshed: changed ? builtIn.title : null,
      };
    }
    if (builtIn || mine) {
      const title = (builtIn ?? mine)!.title;
      return {
        draft: { ids, origin: { kind: 'preset', presetId: origin.presetId, title, edited }, retired },
        removed: sorted.inactive,
        refreshed: null,
      };
    }
  }
  let parsed: Origin = ids.length ? { kind: 'manual' } : { kind: 'empty' };
  if (ids.length && origin.kind === 'random') {
    parsed = { kind: 'random', count: ids.length, edited: origin.edited === true || sorted.inactive.length > 0 };
  }
  return { draft: { ids, origin: parsed, retired }, removed: sorted.inactive, refreshed: null };
}
