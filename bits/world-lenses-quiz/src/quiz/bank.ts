/**
 * The question bank: the shipped JSON (src/data/bank.json, schema "world-lenses-bank-1.1",
 * 5th edition) turned into typed, validated items and presets. Pure; no React, no DOM.
 *
 * Only `items` with `status: "active"` become playable. `archived_items` and
 * `migration.archived_ids` are read for one purpose only: to name the questions a saved route
 * loses when the bank changes edition (`retired`), with the suggested equivalents of
 * `migration.suggested_equivalents`. They never enter the bank, a preset or a draw.
 * Field values are kept as they are in the bank (ids, wording, years, sources, the 0-based
 * `correct` index); only the names change to camelCase.
 *
 * Editorial review (src/data/review.json, the Bit's own file, never the bank): the bank is a
 * provisional prototype. Items listed as `held` are not played, drawn or offered in presets
 * until they are verified; they stay in the bank file and are named, with the reason, wherever
 * a route loses them. `suppressed_sources` drops unofficial copies of documents whose official
 * link the item also cites.
 */

export interface Source {
  label: string;
  url: string;
}

export interface Item {
  id: string;
  question: string;
  options: string[];
  /** Index into `options`, from 0. */
  correct: number;
  /** The fact, shown after the answer. */
  answer: string;
  /** The representation the item puts to the test, as a hypothesis (teacher only). */
  lensBefore: string;
  /** The relation the fact establishes (teacher only; the feedback says it to students). */
  lensAfter: string;
  /** The explanation for students: the heart of the Bit. */
  feedback: string;
  /** An open question for discussion, shown after the explanation; never scored. */
  discussionPrompt: string;
  /** Technical caution for the teacher: never part of the student feedback. */
  teacherNote: string;
  /** How the item was checked (teacher only). */
  verification: string;
  /** Why the item is in the bank (teacher only). */
  editorialRationale: string;
  /** "Nuovo / Rielaborato nella quinta edizione" (teacher only). */
  revision: string;
  /** Teacher title: often gives the answer away, so never shown before the answer. */
  title: string;
  sources: Source[];
  year: string;
  priority: string;
  kind: string;
  chapter: string;
  chapterTitle: string;
  topics: string[];
  regions: string[];
  evidenceNote: string;
}

export interface Preset {
  id: string;
  title: string;
  description: string;
  itemIds: string[];
  builtIn: boolean;
  /** Ids of a built-in preset held back by the editorial review (not played, not lost). */
  held?: string[];
  /**
   * Ids this preset listed that are no longer active (retired by a new edition, or unknown),
   * kept so the teacher can see what was removed and pick alternatives. Never played.
   */
  retired: string[];
}

export interface Chapter {
  id: string;
  title: string;
  count: number;
}

export interface Retired {
  id: string;
  /** The teacher title it had, or '' if the bank does not record one. */
  title: string;
  /** A possible active alternative: a suggestion for the teacher, never applied silently. */
  suggestion: string | null;
  /** Why it is not playable: archived by an edition, or held back by the editorial review. */
  reason: 'archived' | 'review';
}

/** The editorial state of the bank (src/data/review.json). */
export interface Review {
  status: string;
  updated: string;
  held: { id: string; reason: string }[];
  suppressedSources: { item: string; url: string }[];
}

export const NO_REVIEW: Review = { status: '', updated: '', held: [], suppressedSources: [] };

/** Reads review.json as untrusted input: anything malformed is ignored. */
export function readReview(raw: unknown): Review {
  if (!isObject(raw)) return NO_REVIEW;
  const list = (v: unknown) => (Array.isArray(v) ? v.filter(isObject) : []);
  return {
    status: str(raw.status),
    updated: str(raw.updated),
    held: list(raw.held)
      .map((h) => ({ id: str(h.id), reason: str(h.reason) }))
      .filter((h) => h.id !== ''),
    suppressedSources: list(raw.suppressed_sources)
      .map((s) => ({ item: str(s.item), url: str(s.url) }))
      .filter((s) => s.item !== '' && s.url !== ''),
  };
}

export interface RandomDefaults {
  priority: string[];
  excludeKinds: string[];
}

export interface Bank {
  title: string;
  edition: number | null;
  schema: string;
  date: string;
  /** Label of the open question after the explanation. */
  discussionLabel: string;
  items: Item[];
  byId: Map<string, Item>;
  presets: Preset[];
  chapters: Chapter[];
  topics: { name: string; count: number }[];
  regions: { name: string; count: number }[];
  kinds: { name: string; count: number }[];
  priorities: { name: string; count: number }[];
  /** Questions that are not playable (archived, or held back by the review), by id. */
  retired: Map<string, Retired>;
  /** Active questions of the bank held back by the editorial review, with the reason. */
  held: Map<string, { title: string; reason: string }>;
  /** 'provisional' while the bank is an unapproved prototype ('' without a review file). */
  status: string;
  randomDefaults: RandomDefaults;
  /** Entries that could not be used, with the reason; empty for a healthy bank. */
  problems: string[];
}

type Raw = Record<string, unknown>;

const isObject = (value: unknown): value is Raw =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const str = (value: unknown) => (typeof value === 'string' ? value : '');
const strings = (value: unknown) =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && v !== '') : [];

function toItem(raw: unknown): Item | string {
  if (!isObject(raw)) return 'not an object';
  const id = str(raw.id);
  if (!id) return 'missing id';
  const options = strings(raw.options);
  const correct = raw.correct;
  if (!str(raw.question)) return `${id}: missing question`;
  if (options.length < 2 || options.length !== (raw.options as unknown[]).length) {
    return `${id}: invalid options`;
  }
  if (typeof correct !== 'number' || !Number.isInteger(correct) || correct < 0 || correct >= options.length) {
    return `${id}: correct index out of range`;
  }
  const sources = Array.isArray(raw.sources)
    ? raw.sources
        .filter(isObject)
        .map((s) => ({ label: str(s.label), url: str(s.url) }))
        .filter((s) => s.label !== '')
    : [];
  return {
    id,
    question: str(raw.question),
    options,
    correct,
    answer: str(raw.answer),
    lensBefore: str(raw.lens_before),
    lensAfter: str(raw.lens_after),
    feedback: str(raw.feedback),
    discussionPrompt: str(raw.discussion_prompt),
    teacherNote: str(raw.teacher_note),
    verification: str(raw.verification),
    editorialRationale: str(raw.editorial_rationale),
    revision: str(raw.origin),
    title: str(raw.title_teacher) || id,
    sources,
    year: str(raw.year),
    priority: str(raw.priority),
    kind: str(raw.kind),
    chapter: str(raw.chapter),
    chapterTitle: str(raw.chapter_title),
    topics: strings(raw.topics),
    regions: strings(raw.regions),
    evidenceNote: str(raw.evidence_note),
  };
}

const counted = (values: string[]) => {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name, 'it'));
};

export function loadBank(raw: unknown, review: Review = NO_REVIEW): Bank {
  const data = isObject(raw) ? raw : {};
  const problems: string[] = [];
  const items: Item[] = [];
  const byId = new Map<string, Item>();
  const heldReasons = new Map(review.held.map((h) => [h.id, h.reason]));
  const held = new Map<string, { title: string; reason: string }>();
  const suppressed = new Set(review.suppressedSources.map((s) => `${s.item} ${s.url}`));

  for (const entry of Array.isArray(data.items) ? data.items : []) {
    if (isObject(entry) && entry.status !== 'active') continue;
    const item = toItem(entry);
    if (typeof item === 'string') problems.push(item);
    else if (byId.has(item.id) || held.has(item.id)) problems.push(`${item.id}: duplicate id`);
    else if (heldReasons.has(item.id)) held.set(item.id, { title: item.title, reason: heldReasons.get(item.id)! });
    else {
      item.sources = item.sources.filter((s) => !suppressed.has(`${item.id} ${s.url}`));
      items.push(item);
      byId.set(item.id, item);
    }
  }

  const presets: Preset[] = [];
  for (const entry of Array.isArray(data.presets) ? data.presets : []) {
    if (!isObject(entry) || !str(entry.id)) continue;
    const ids = strings(entry.item_ids);
    const unknown = ids.filter((id) => !byId.has(id) && !held.has(id));
    if (unknown.length) problems.push(`preset ${str(entry.id)}: unknown ${unknown.join(', ')}`);
    presets.push({
      id: str(entry.id),
      title: str(entry.title) || str(entry.id),
      description: str(entry.description),
      itemIds: [...new Set(ids.filter((id) => byId.has(id)))],
      builtIn: true,
      held: [...new Set(ids.filter((id) => held.has(id)))],
      retired: [],
    });
  }

  const chapters: Chapter[] = [];
  for (const item of items) {
    const chapter = chapters.find((c) => c.id === item.chapter);
    if (chapter) chapter.count += 1;
    else chapters.push({ id: item.chapter, title: item.chapterTitle || item.chapter, count: 1 });
  }

  const migration = isObject(data.migration) ? data.migration : {};
  const equivalents = isObject(migration.suggested_equivalents) ? migration.suggested_equivalents : {};
  const retired = new Map<string, Retired>();
  const retire = (id: string, title: string, reason: Retired['reason'] = 'archived') => {
    if (!id || byId.has(id) || retired.has(id)) return;
    const suggestion = str(equivalents[id]);
    retired.set(id, { id, title, suggestion: byId.has(suggestion) ? suggestion : null, reason });
  };
  for (const [id, h] of held) retire(id, h.title, 'review');
  for (const entry of Array.isArray(data.archived_items) ? data.archived_items : []) {
    if (isObject(entry)) retire(str(entry.id), str(entry.title_teacher));
  }
  for (const id of strings(migration.archived_ids)) retire(id, '');

  const guidance = isObject(data.interface_guidance) ? data.interface_guidance : {};
  const contract = isObject(data.selection_contract) ? data.selection_contract : {};
  const defaults = isObject(contract.random_defaults) ? contract.random_defaults : {};

  return {
    title: str(data.title),
    edition: typeof data.edition === 'number' ? data.edition : null,
    schema: str(data.schema_version),
    date: str(data.date),
    discussionLabel: str(guidance.discussion_label) || 'Una domanda che resta aperta',
    items,
    byId,
    presets,
    chapters,
    topics: counted(items.flatMap((i) => i.topics)),
    regions: counted(items.flatMap((i) => i.regions)),
    kinds: counted(items.map((i) => i.kind).filter(Boolean)),
    priorities: counted(items.map((i) => i.priority).filter(Boolean)),
    retired,
    held,
    status: review.status,
    randomDefaults: {
      priority: strings(defaults.priority),
      excludeKinds: strings(defaults.exclude_kinds),
    },
    problems,
  };
}

export const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
