/**
 * Composing a battery: search and filters over the bank, the random draw, and the edits a
 * battery accepts before a game (add, remove, move, shuffle). Pure and deterministic given
 * the random source, so that tests can seed it.
 *
 * A battery is an ordered list of item ids without repetitions. Every entry point (preset,
 * manual choice, random draw) produces one, and every edit keeps those two properties.
 */
import type { Item } from './bank.ts';

export type Rng = () => number;

/** Uniform in [0, 1) from the platform's cryptographic source. */
export function cryptoRng(): Rng {
  const buffer = new Uint32Array(64);
  let next = buffer.length;
  return () => {
    if (next >= buffer.length) {
      crypto.getRandomValues(buffer);
      next = 0;
    }
    return buffer[next++] / 2 ** 32;
  };
}

/** A small seeded generator (mulberry32) for tests and reproducible draws. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
  };
}

const randomIndex = (n: number, rng: Rng) => Math.min(n - 1, Math.floor(rng() * n));

export function shuffled<T>(values: readonly T[], rng: Rng): T[] {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = randomIndex(i + 1, rng);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/* Geography ---------------------------------------------------------------------------- */

export const MACRO_AREAS = ['Mondo', 'Africa', 'Americhe', 'Asia', 'Europa', 'Oceania'] as const;
export type MacroArea = (typeof MACRO_AREAS)[number];

/**
 * The large area of each place named in the bank. A place on two continents lists both.
 * tests/selection.test.ts fails when the bank names a place missing here.
 */
export const PLACE_AREAS: Record<string, MacroArea[]> = {
  Mondo: ['Mondo'],
  'Sud globale': ['Mondo'],
  'Mondo islamico': ['Mondo'],
  Africa: ['Africa'],
  'Africa occidentale': ['Africa'],
  'Africa orientale': ['Africa'],
  'Africa settentrionale': ['Africa'],
  'Africa subsahariana': ['Africa'],
  Algeria: ['Africa'],
  'Burkina Faso': ['Africa'],
  'Costa d’Avorio': ['Africa'],
  Egitto: ['Africa'],
  Etiopia: ['Africa'],
  Kenya: ['Africa'],
  Lesotho: ['Africa'],
  Marocco: ['Africa'],
  'Repubblica Democratica del Congo': ['Africa'],
  Ruanda: ['Africa'],
  'Sahara Occidentale': ['Africa'],
  Sudafrica: ['Africa'],
  Americhe: ['Americhe'],
  'America latina': ['Americhe'],
  'America meridionale': ['Americhe'],
  'America settentrionale': ['Americhe'],
  Argentina: ['Americhe'],
  Bolivia: ['Americhe'],
  Brasile: ['Americhe'],
  Caraibi: ['Americhe'],
  'Costa Rica': ['Americhe'],
  Cuba: ['Americhe'],
  Haiti: ['Americhe'],
  'Stati Uniti': ['Americhe'],
  Groenlandia: ['Americhe', 'Europa'],
  Asia: ['Asia'],
  'Asia centrale': ['Asia'],
  'Asia occidentale': ['Asia'],
  'Sud-est asiatico': ['Asia'],
  'Medio Oriente': ['Asia'],
  Golfo: ['Asia'],
  Afghanistan: ['Asia'],
  'Arabia Saudita': ['Asia'],
  'Emirati Arabi Uniti': ['Asia'],
  Qatar: ['Asia'],
  Uzbekistan: ['Asia'],
  Bangladesh: ['Asia'],
  Cina: ['Asia'],
  Filippine: ['Asia'],
  India: ['Asia'],
  Indonesia: ['Asia'],
  Iran: ['Asia'],
  Kazakistan: ['Asia'],
  Libano: ['Asia'],
  Malaysia: ['Asia'],
  Nepal: ['Asia'],
  Pakistan: ['Asia'],
  Tagikistan: ['Asia'],
  Thailandia: ['Asia'],
  Vietnam: ['Asia'],
  Turchia: ['Asia', 'Europa'],
  Russia: ['Europa', 'Asia'],
  Europa: ['Europa'],
  Francia: ['Europa'],
  Italia: ['Europa'],
  'Regno Unito': ['Europa'],
  Svizzera: ['Europa'],
  Ucraina: ['Europa'],
  Oceania: ['Oceania'],
  Australia: ['Oceania'],
  Kiribati: ['Oceania'],
  'Papua Nuova Guinea': ['Oceania'],
};

export const areasOf = (item: Item): Set<string> =>
  new Set(item.regions.flatMap((place) => PLACE_AREAS[place] ?? []));

/** Places precise enough that a run of them reads as "one country": not the large areas. */
const BROAD = new Set<string>(['Mondo', 'Sud globale', 'Mondo islamico', ...MACRO_AREAS]);
export const placesOf = (item: Item) => item.regions.filter((r) => !BROAD.has(r));

/* Search and filters ------------------------------------------------------------------- */

/** Lower case, no accents, typographic apostrophes folded: "Città d’Avorio" ~ "citta d'avorio". */
export const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’‘`´]/g, "'")
    .toLowerCase();

export interface Filters {
  query: string;
  /** '' | 'chapter:<id>' | 'topic:<name>' */
  topic: string;
  /** '' | 'area:<macro>' | 'place:<name>' */
  area: string;
  /** '' | 'kind:<struttura|trasformazione|relazione>' | 'priority:<A|B>' */
  card: string;
}

export const NO_FILTERS: Filters = { query: '', topic: '', area: '', card: '' };

export const hasFilters = (f: Filters) =>
  f.query.trim() !== '' || f.topic !== '' || f.area !== '' || f.card !== '';

const haystacks = new WeakMap<Item, string>();
const haystack = (item: Item) => {
  let text = haystacks.get(item);
  if (text === undefined) {
    text = fold(
      [
        item.id,
        item.title,
        item.question,
        ...item.options,
        item.answer,
        item.year,
        item.chapterTitle,
        ...item.topics,
        ...item.regions,
      ].join(' \u0001 '),
    );
    haystacks.set(item, text);
  }
  return text;
};

export function matches(item: Item, filters: Filters): boolean {
  const terms = fold(filters.query).split(/\s+/).filter(Boolean);
  if (terms.length && !terms.every((term) => haystack(item).includes(term))) return false;

  const [topicKind, topicValue] = splitFilter(filters.topic);
  if (topicKind === 'chapter' && item.chapter !== topicValue) return false;
  if (topicKind === 'topic' && !item.topics.includes(topicValue)) return false;

  const [areaKind, areaValue] = splitFilter(filters.area);
  if (areaKind === 'area' && !areasOf(item).has(areaValue)) return false;
  if (areaKind === 'place' && !item.regions.includes(areaValue)) return false;

  const [cardKind, cardValue] = splitFilter(filters.card ?? '');
  if (cardKind === 'kind' && item.kind !== cardValue) return false;
  if (cardKind === 'priority' && item.priority !== cardValue) return false;
  return true;
}

function splitFilter(value: string): [string, string] {
  const at = value.indexOf(':');
  return at < 0 ? ['', ''] : [value.slice(0, at), value.slice(at + 1)];
}

export const filterItems = (items: readonly Item[], filters: Filters) =>
  items.filter((item) => matches(item, filters));

/** The pool of the random draw: the bank's defaults (priority, excluded kinds), if asked. */
export function drawPool(
  items: readonly Item[],
  filters: Filters,
  defaults: { priority: string[]; excludeKinds: string[] },
  useDefaults: boolean,
): Item[] {
  return filterItems(items, filters).filter(
    (item) =>
      !useDefaults ||
      ((defaults.priority.length === 0 || defaults.priority.includes(item.priority)) &&
        !defaults.excludeKinds.includes(item.kind)),
  );
}

/* Random draw ---------------------------------------------------------------------------- */

/**
 * Draws `count` distinct items (or the whole pool, if smaller), without replacement.
 * To give an overview, a single place may appear in at most about a fifth of the draw (two at
 * least) while other candidates remain; then the order is spread so that two consecutive
 * questions avoid the same place when possible.
 */
export function drawRandom(pool: readonly Item[], count: number, rng: Rng): Item[] {
  const unique = [...new Map(pool.map((item) => [item.id, item])).values()];
  const want = Math.max(0, Math.min(Math.floor(count), unique.length));
  const cap = Math.max(2, Math.ceil(want / 5));
  const perPlace = new Map<string, number>();
  const chosen: Item[] = [];
  const deferred: Item[] = [];

  for (const item of shuffled(unique, rng)) {
    if (chosen.length === want) break;
    const places = placesOf(item);
    if (places.some((p) => (perPlace.get(p) ?? 0) >= cap)) {
      deferred.push(item);
      continue;
    }
    chosen.push(item);
    for (const p of places) perPlace.set(p, (perPlace.get(p) ?? 0) + 1);
  }
  for (const item of deferred) {
    if (chosen.length === want) break;
    chosen.push(item);
  }
  return spreadOrder(chosen);
}

/**
 * Reorders so that consecutive items share no specific place when another choice exists.
 * Greedy and stable: it keeps the given order wherever it can.
 */
export function spreadOrder(items: readonly Item[]): Item[] {
  const rest = [...items];
  const out: Item[] = [];
  while (rest.length) {
    const previous = out.length ? new Set(placesOf(out[out.length - 1])) : new Set<string>();
    let index = rest.findIndex((item) => !placesOf(item).some((p) => previous.has(p)));
    if (index < 0) index = 0;
    out.push(rest.splice(index, 1)[0]);
  }
  return out;
}

/* Battery edits -------------------------------------------------------------------------- */

export const addIds = (battery: readonly string[], ids: readonly string[]) => {
  const present = new Set(battery);
  const out = [...battery];
  for (const id of ids) {
    if (!present.has(id)) {
      present.add(id);
      out.push(id);
    }
  }
  return out;
};

export const removeId = (battery: readonly string[], id: string) => battery.filter((x) => x !== id);

export const toggleId = (battery: readonly string[], id: string) =>
  battery.includes(id) ? removeId(battery, id) : addIds(battery, [id]);

/** Moves the entry at `from` to position `to` (both clamped); other entries keep their order. */
export function moveId(battery: readonly string[], from: number, to: number): string[] {
  const out = [...battery];
  if (from < 0 || from >= out.length) return out;
  const target = Math.max(0, Math.min(out.length - 1, to));
  const [moved] = out.splice(from, 1);
  out.splice(target, 0, moved);
  return out;
}

/** A new random order, spread like a draw; ids unknown to `byId` stay at the end. */
export function shuffleIds(
  battery: readonly string[],
  byId: ReadonlyMap<string, Item>,
  rng: Rng,
): string[] {
  const known = battery.map((id) => byId.get(id)).filter((i): i is Item => Boolean(i));
  const unknown = battery.filter((id) => !byId.has(id));
  return [...spreadOrder(shuffled(known, rng)).map((i) => i.id), ...unknown];
}
