import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { loadBank, readReview } from '../src/quiz/bank.ts';
import {
  optionOrders,
  orderOf,
  outcomes,
  positionOf,
  reduce,
  restoreGame,
  score,
  serializeGame,
  startGame,
} from '../src/quiz/play.ts';
import {
  createPreset,
  entriesOf,
  exportFile,
  mergePresets,
  readDraft,
  readStored,
  serializeDraft,
  sortIds,
} from '../src/quiz/presets.ts';
import {
  addIds,
  areasOf,
  drawPool,
  drawRandom,
  filterItems,
  moveId,
  NO_FILTERS,
  PLACE_AREAS,
  placesOf,
  removeId,
  seededRng,
  shuffleIds,
  spreadOrder,
  toggleId,
} from '../src/quiz/selection.ts';

const raw = JSON.parse(readFileSync(new URL('../src/data/bank.json', import.meta.url), 'utf8'));
const bank = loadBank(raw);
const { items, byId, presets: builtIn } = bank;

/* The bank ------------------------------------------------------------------------------ */

test('the shipped bank loads without problems: 5th edition, 67 active items, 8 presets', () => {
  assert.deepEqual(bank.problems, []);
  assert.equal(bank.edition, 5);
  assert.equal(bank.schema, 'world-lenses-bank-1.1');
  assert.equal(items.length, 67);
  assert.equal(items.length, raw.counts.active_items);
  assert.equal(builtIn.length, 8);
  assert.equal(bank.discussionLabel, 'Una domanda che resta aperta');
});

test('archived items are never playable, only named as retired', () => {
  assert.equal(raw.archived_items.length, 56);
  for (const archived of raw.archived_items) {
    assert.ok(!byId.has(archived.id), archived.id);
    assert.equal(bank.retired.get(archived.id)?.title, archived.title_teacher);
  }
  for (const id of raw.migration.archived_ids) assert.ok(bank.retired.has(id), id);
  for (const preset of builtIn) for (const id of preset.itemIds) assert.ok(byId.has(id));
});

test('suggested equivalents are offered for retired ids and point to active items', () => {
  for (const [from, to] of Object.entries(raw.migration.suggested_equivalents)) {
    assert.equal(bank.retired.get(from)?.suggestion, to);
    assert.ok(byId.has(to as string));
  }
  assert.equal(bank.retired.get('D41')?.suggestion, null);
});

test('ids, wording, alternatives and the 0-based answer are kept as in the bank', () => {
  for (const source of raw.items) {
    const item = byId.get(source.id);
    assert.ok(item, source.id);
    assert.equal(item.question, source.question);
    assert.deepEqual(item.options, source.options);
    assert.equal(item.correct, source.correct);
    assert.equal(item.options[item.correct], source.options[source.correct]);
    assert.equal(item.answer, source.answer);
    assert.equal(item.feedback, source.feedback);
    assert.equal(item.year, source.year);
    assert.deepEqual(item.sources, source.sources);
    assert.equal(item.title, source.title_teacher);
    assert.equal(item.teacherNote, source.teacher_note);
    assert.equal(item.discussionPrompt, source.discussion_prompt);
    assert.equal(item.verification, source.verification);
    assert.equal(item.editorialRationale, source.editorial_rationale);
    assert.equal(item.lensBefore, source.lens_before);
  }
});

test('D64 and D45 keep their full wording', () => {
  const d64 = byId.get('D64')!;
  assert.match(d64.answer, /nel 2026 vi è una forte ripresa/);
  assert.match(d64.feedback, /priorità contrastanti/);
  assert.match(d64.feedback, /Resta aperto quanto i diversi interessi/);
  assert.match(d64.discussionPrompt, /priorità militari, alleanze locali e interessi economici/);
  const d45 = byId.get('D45')!;
  assert.match(d45.question, /scienze di base/);
  assert.equal(d45.options[d45.correct], 'La maggioranza, circa due terzi.');
  assert.match(d45.feedback, /espansione educativa/);
  assert.match(d45.teacherNote, /non intero aggregato STEM/);
});

test('the correct index is spread over the alternatives (A, B and C all occur)', () => {
  const positions = new Set(items.map((i) => i.correct));
  assert.deepEqual([...positions].sort(), [0, 1, 2]);
});

test('built-in presets keep their ids, titles and order', () => {
  for (const source of raw.presets) {
    const preset = builtIn.find((p) => p.id === source.id);
    assert.ok(preset?.builtIn);
    assert.equal(preset.title, source.title);
    assert.deepEqual(preset.itemIds, source.item_ids);
  }
});

test('a broken entry is reported, not played', () => {
  const broken = loadBank({
    items: [
      { id: 'X1', status: 'active', question: 'q', options: ['a', 'b', 'c'], correct: 3 },
      { id: 'X2', status: 'active', question: 'q', options: ['a', 'b'], correct: 1 },
      { id: 'X3', status: 'archived', question: 'q', options: ['a', 'b'], correct: 0 },
    ],
    presets: [{ id: 'p', item_ids: ['X2', 'X9'] }],
  });
  assert.deepEqual(broken.items.map((i) => i.id), ['X2']);
  assert.equal(broken.problems.length, 2);
  assert.deepEqual(broken.presets[0].itemIds, ['X2']);
});

/* Filters ------------------------------------------------------------------------------ */

test('every place named in the bank belongs to a large area', () => {
  for (const { name } of bank.regions) assert.ok(PLACE_AREAS[name]?.length, name);
});

test('search ignores case, accents and apostrophe style', () => {
  const plain = filterItems(items, { ...NO_FILTERS, query: "costa d'avorio" });
  const typographic = filterItems(items, { ...NO_FILTERS, query: 'COSTA D’AVORIO' });
  assert.ok(plain.length > 0);
  assert.deepEqual(plain, typographic);
  assert.ok(filterItems(items, { ...NO_FILTERS, query: 'groenlandia africa' }).some((i) => i.id === 'D31'));
  assert.ok(filterItems(items, { ...NO_FILTERS, query: '1402' }).some((i) => i.id === 'D45'));
  assert.equal(filterItems(items, { ...NO_FILTERS, query: 'zzzz-nessuna' }).length, 0);
});

test('topic and area filters', () => {
  const chapter = filterItems(items, { ...NO_FILTERS, topic: 'chapter:migrazioni' });
  assert.equal(chapter.length, 11);
  const topic = filterItems(items, { ...NO_FILTERS, topic: 'topic:migrazioni' });
  assert.ok(topic.length > 0 && topic.every((i) => i.topics.includes('migrazioni')));
  const asia = filterItems(items, { ...NO_FILTERS, area: 'area:Asia' });
  assert.ok(asia.some((i) => i.regions.includes('Cina') && !i.regions.includes('Asia')));
  assert.ok(asia.every((i) => areasOf(i).has('Asia')));
  const china = filterItems(items, { ...NO_FILTERS, area: 'place:Cina' });
  assert.ok(china.length > 0 && china.every((i) => i.regions.includes('Cina')));
  assert.equal(filterItems(items, { ...NO_FILTERS, card: 'kind:relazione' }).length, 3);
  assert.equal(filterItems(items, { ...NO_FILTERS, card: 'priority:B' }).length, 8);
  const both = filterItems(items, { ...NO_FILTERS, card: 'priority:A', area: 'place:Iran' });
  assert.ok(both.length > 0 && both.every((i) => i.priority === 'A' && i.regions.includes('Iran')));
});

test('the draw pool follows the bank defaults: priority A', () => {
  const pool = drawPool(items, NO_FILTERS, bank.randomDefaults, true);
  assert.deepEqual(bank.randomDefaults, { priority: ['A'], excludeKinds: [] });
  assert.equal(pool.length, 59);
  for (const item of pool) assert.equal(item.priority, 'A');
  assert.equal(drawPool(items, NO_FILTERS, bank.randomDefaults, false).length, items.length);
});

/* Editorial review ------------------------------------------------------------------------ */

const reviewRaw = JSON.parse(readFileSync(new URL('../src/data/review.json', import.meta.url), 'utf8'));
const review = readReview(reviewRaw);
const playable = loadBank(raw, review);

test('the review file is about this bank and names only items and sources that exist', () => {
  assert.equal(reviewRaw.bank, raw.schema_version);
  assert.equal(reviewRaw.edition, raw.edition);
  assert.equal(review.status, 'provisional');
  assert.ok(review.held.length > 0);
  for (const h of review.held) {
    assert.ok(byId.has(h.id), `${h.id} is an active item of the bank`);
    assert.ok(h.reason.length > 20, `${h.id} has a reason`);
  }
  for (const s of review.suppressedSources) {
    const item = byId.get(s.item)!;
    assert.ok(item.sources.some((x) => x.url === s.url), `${s.item} cites ${s.url}`);
  }
});

test('held items are kept in the bank file but never played, drawn or offered in a preset', () => {
  assert.deepEqual(playable.problems, []);
  assert.equal(playable.status, 'provisional');
  assert.equal(playable.items.length, items.length - review.held.length);
  for (const h of review.held) {
    assert.ok(!playable.byId.has(h.id));
    assert.equal(playable.held.get(h.id)?.reason, h.reason);
    assert.equal(playable.retired.get(h.id)?.reason, 'review', 'named where a route loses it');
  }
  for (const preset of playable.presets) {
    for (const id of preset.itemIds) assert.ok(playable.byId.has(id));
    const source = raw.presets.find((p: { id: string }) => p.id === preset.id);
    const lost = source.item_ids.filter((id: string) => !playable.byId.has(id));
    assert.deepEqual(preset.held, lost, `${preset.id}: what it lost is held, nothing else`);
  }
  const pool = drawPool(playable.items, NO_FILTERS, playable.randomDefaults, false);
  for (const h of review.held) assert.ok(!pool.some((i) => i.id === h.id));
  // Without the review the archive is whole: nothing is deleted.
  assert.equal(items.length, 67);
});

test('unofficial copies are dropped from the sources, official links stay', () => {
  for (const s of review.suppressedSources) {
    const item = playable.byId.get(s.item)!;
    assert.ok(!item.sources.some((x) => x.url === s.url));
    assert.ok(item.sources.some((x) => /iom\.int/.test(x.url)), 'the official IOM link stays');
  }
});

test('a malformed review file holds nothing back', () => {
  assert.equal(loadBank(raw, readReview(null)).items.length, 67);
  assert.equal(loadBank(raw, readReview({ held: [{ reason: 'x' }, 'D31'] })).items.length, 67);
});

/* Random draw ---------------------------------------------------------------------------- */

test('a draw has no repetitions and comes from the pool, for many seeds and sizes', () => {
  const pool = drawPool(items, NO_FILTERS, bank.randomDefaults, true);
  const inPool = new Set(pool.map((i) => i.id));
  for (let seed = 1; seed <= 300; seed += 1) {
    const count = 1 + (seed % 30);
    const drawn = drawRandom(pool, count, seededRng(seed));
    assert.equal(drawn.length, count);
    assert.equal(new Set(drawn.map((i) => i.id)).size, count);
    assert.ok(drawn.every((i) => inPool.has(i.id)));
  }
});

test('asking for more than available returns the whole pool, once each', () => {
  const pool = filterItems(items, { ...NO_FILTERS, area: 'area:Europa' });
  assert.ok(pool.length > 0 && pool.length < 20);
  const drawn = drawRandom(pool, pool.length + 10, seededRng(7));
  assert.equal(drawn.length, pool.length);
  assert.deepEqual(new Set(drawn.map((i) => i.id)), new Set(pool.map((i) => i.id)));
  assert.deepEqual(drawRandom([], 5, seededRng(1)), []);
  assert.deepEqual(drawRandom(pool, 0, seededRng(1)), []);
});

test('every item of the pool can be drawn', () => {
  const pool = drawPool(items, NO_FILTERS, bank.randomDefaults, true);
  const seen = new Set<string>();
  for (let seed = 1; seed <= 400; seed += 1) {
    for (const item of drawRandom(pool, 10, seededRng(seed))) seen.add(item.id);
  }
  assert.equal(seen.size, pool.length);
});

test('an overview draw does not pile up on one place', () => {
  const pool = drawPool(items, NO_FILTERS, bank.randomDefaults, true);
  for (let seed = 1; seed <= 200; seed += 1) {
    const drawn = drawRandom(pool, 10, seededRng(seed));
    const counts = new Map<string, number>();
    for (const item of drawn) for (const p of placesOf(item)) counts.set(p, (counts.get(p) ?? 0) + 1);
    assert.ok(Math.max(0, ...counts.values()) <= 2, `seed ${seed}: ${[...counts]}`);
  }
});

test('spreadOrder keeps the items and avoids neighbours on the same place when it can', () => {
  const iran = items.filter((i) => i.regions.includes('Iran')).slice(0, 3);
  const others = items.filter((i) => placesOf(i).length === 0).slice(0, 3);
  const spread = spreadOrder([...iran, ...others]);
  assert.equal(spread.length, 6);
  for (let k = 1; k < spread.length; k += 1) {
    const before = new Set(placesOf(spread[k - 1]));
    assert.ok(!placesOf(spread[k]).some((p) => before.has(p)), `position ${k}`);
  }
});

/* Battery edits -------------------------------------------------------------------------- */

test('battery edits keep order and never repeat an id', () => {
  let battery = addIds([], ['D31', 'D21', 'D31']);
  assert.deepEqual(battery, ['D31', 'D21']);
  battery = addIds(battery, ['D45', 'D21']);
  assert.deepEqual(battery, ['D31', 'D21', 'D45']);
  assert.deepEqual(moveId(battery, 2, 0), ['D45', 'D31', 'D21']);
  assert.deepEqual(moveId(battery, 0, 99), ['D21', 'D45', 'D31']);
  assert.deepEqual(moveId(battery, 5, 0), battery);
  assert.deepEqual(removeId(battery, 'D21'), ['D31', 'D45']);
  assert.deepEqual(toggleId(battery, 'D21'), ['D31', 'D45']);
  assert.deepEqual(toggleId(battery, 'D64'), ['D31', 'D21', 'D45', 'D64']);
});

test('shuffling is a permutation', () => {
  const ids = builtIn[0].itemIds;
  for (let seed = 1; seed <= 50; seed += 1) {
    const out = shuffleIds(ids, byId, seededRng(seed));
    assert.deepEqual([...out].sort(), [...ids].sort());
  }
  assert.notDeepEqual(shuffleIds(ids, byId, seededRng(3)), ids);
});

/* Presets -------------------------------------------------------------------------------- */

test('a personalised preset is a new preset; built-ins stay as they were', () => {
  const original = structuredClone(builtIn[0]);
  const ids = moveId(builtIn[0].itemIds, 0, 3);
  const mine = createPreset('Cambiare le lenti · 12 (mia)', '', ids, builtIn.map((p) => p.id));
  assert.equal(mine.builtIn, false);
  assert.notEqual(mine.id, builtIn[0].id);
  assert.deepEqual(builtIn[0], original);
  const again = createPreset('Cambiare le lenti · 12 (mia)', '', ids, [mine.id]);
  assert.notEqual(again.id, mine.id);
});

test('ids from untrusted lists: active, inactive, repeats and junk, each in order', () => {
  assert.deepEqual(sortIds(['D31', 'D41', 'D31', 7, 'ZZ', '', 'D21', 'D41'], byId), {
    active: ['D31', 'D21'],
    inactive: ['D41', 'ZZ'],
    repeats: 2,
    junk: 2,
  });
});

test('export and import round-trip, and importing twice adds nothing', () => {
  const a = createPreset('Migrazioni', 'una prova', ['D21', 'D48', 'D22'], []);
  const b = createPreset('Energia', '', ['D16', 'D17'], [a.id]);
  const file = exportFile([a, b], bank);
  const parsed = JSON.parse(file);
  assert.equal(parsed.version, 2);
  assert.equal(parsed.edition, 5);
  const entries = entriesOf(file);
  assert.ok(Array.isArray(entries));
  const first = mergePresets([], entries, bank);
  assert.equal(first.added, 2);
  assert.deepEqual(first.presets, [a, b]);
  const second = mergePresets(first.presets, entries, bank);
  assert.equal(second.added, 0);
  assert.equal(second.duplicates, 2);
  assert.equal(second.presets.length, 2);
});

test('import tolerates retired ids, detects duplicates and bad entries without blocking the rest', () => {
  const entries = entriesOf(
    JSON.stringify({
      format: 'orbbits.world-lenses-quiz.presets',
      version: 1,
      bank: 'world-lenses-bank-1.0',
      presets: [
        { id: 'mio-misto', title: 'Misto', item_ids: ['D31', 'D41', 'D31', 42, 'D03', 'D21'] },
        { id: 'mio-ritirato', title: 'Tutto ritirato', item_ids: ['D41', 'D47'] },
        { id: 'mio-misto-bis', title: 'misto', item_ids: ['D31', 'D21'] },
        { title: 'no ids' },
        'string',
        { title: 'nothing', item_ids: [] },
        { id: 'mondo-12', title: 'clash', item_ids: ['D45'] },
      ],
    }),
  );
  assert.ok(Array.isArray(entries));
  const merged = mergePresets([], entries, bank);
  assert.equal(merged.added, 3);
  assert.equal(merged.duplicates, 1, 'same title (case aside) and same playable ids');
  assert.equal(merged.invalid, 3);
  assert.equal(merged.repeats, 2);
  assert.deepEqual(merged.retired, ['D41', 'D03', 'D47']);
  const [mixed, empty, clash] = merged.presets;
  assert.deepEqual([mixed.id, mixed.itemIds, mixed.retired], ['mio-misto', ['D31', 'D21'], ['D41', 'D03']]);
  assert.deepEqual([empty.id, empty.itemIds, empty.retired], ['mio-ritirato', [], ['D41', 'D47']]);
  assert.notEqual(clash.id, 'mondo-12');
  assert.ok(clash.id.startsWith('mio-'));
});

test('the bank file itself imports as presets that duplicate the built-ins', () => {
  const entries = entriesOf(JSON.stringify(raw));
  assert.ok(Array.isArray(entries));
  const merged = mergePresets([], entries, bank);
  assert.equal(merged.added, 0);
  assert.equal(merged.duplicates, builtIn.length);
});

/* Migration of stored presets and battery ------------------------------------------------ */

/** What the previous version of the Bit wrote (file format 1, bank 1.0, 4th edition ids). */
const OLD_STORAGE = JSON.stringify({
  format: 'orbbits.world-lenses-quiz.presets',
  version: 1,
  bank: 'world-lenses-bank-1.0',
  exported: '2026-11-08T10:00:00.000Z',
  presets: [
    { id: 'mio-misto', title: 'Il mio misto', description: 'd', item_ids: ['D41', 'D31', 'D03', 'D45', 'D47', 'D64'], order: 'as_listed' },
    { id: 'mio-ritirato', title: 'Solo vecchie', description: '', item_ids: ['D41', 'D03'], order: 'as_listed' },
    { id: 'mio-gemello', title: 'Il mio misto', description: '', item_ids: ['D31'], order: 'as_listed' },
  ],
});

test('stored presets cross the edition: ids, names and order kept, retired ids moved aside', () => {
  const read = readStored(OLD_STORAGE, bank);
  assert.equal(read.edition, null);
  assert.deepEqual(
    read.presets.map((p) => [p.id, p.title, p.itemIds, p.retired]),
    [
      ['mio-misto', 'Il mio misto', ['D31', 'D45', 'D64'], ['D41', 'D03', 'D47']],
      ['mio-ritirato', 'Solo vecchie', [], ['D41', 'D03']],
      ['mio-gemello', 'Il mio misto', ['D31'], []],
    ],
  );
  assert.deepEqual(read.changes, [
    { id: 'mio-misto', title: 'Il mio misto', removed: ['D41', 'D03', 'D47'], empty: false },
    { id: 'mio-ritirato', title: 'Solo vecchie', removed: ['D41', 'D03'], empty: true },
  ]);

  // Written back and read again (the next visit): nothing new to report, removals still known.
  const again = readStored(exportFile(read.presets, bank), bank);
  assert.equal(again.edition, 5);
  assert.deepEqual(again.changes, []);
  assert.deepEqual(again.presets, read.presets);

  assert.deepEqual(readStored('{{', bank).presets, []);
  assert.deepEqual(readStored(null, bank).presets, []);
});

test('a stored battery crosses the edition', () => {
  const personal = readStored(OLD_STORAGE, bank).presets;
  // An unedited ready route is replaced by its new edition.
  const ready = readDraft(
    JSON.stringify({ ids: ['D31', 'D01', 'D02'], origin: { kind: 'preset', presetId: 'mondo-12', title: 'old', edited: false } }),
    bank,
    personal,
  );
  assert.deepEqual(ready?.draft.ids, builtIn[0].itemIds);
  assert.equal(ready?.refreshed, builtIn[0].title);
  // An edited one keeps what is still valid, in order, and lists what was removed.
  const edited = readDraft(
    JSON.stringify({ ids: ['D41', 'D45', 'D03', 'D31'], origin: { kind: 'preset', presetId: 'mondo-12', title: 'old', edited: true } }),
    bank,
    personal,
  );
  assert.deepEqual(edited?.draft.ids, ['D45', 'D31']);
  assert.deepEqual(edited?.draft.retired, ['D41', 'D03']);
  assert.deepEqual(edited?.removed, ['D41', 'D03']);
  assert.equal(edited?.draft.origin.kind, 'preset');
  // A personal route left empty stays the origin, so it can be recomposed and saved.
  const empty = readDraft(
    JSON.stringify({ ids: ['D41', 'D03'], origin: { kind: 'preset', presetId: 'mio-ritirato', title: 'x', edited: false } }),
    bank,
    personal,
  );
  assert.deepEqual(empty?.draft.ids, []);
  assert.deepEqual(empty?.draft.origin, { kind: 'preset', presetId: 'mio-ritirato', title: 'Solo vecchie', edited: false });
  // A route that no longer exists becomes a manual battery.
  const gone = readDraft(
    JSON.stringify({ ids: ['D31', 'D41'], origin: { kind: 'preset', presetId: 'geografia', title: 'x', edited: false } }),
    bank,
    personal,
  );
  assert.deepEqual(gone?.draft, { ids: ['D31'], origin: { kind: 'manual' }, retired: ['D41'] });

  const draft = {
    ids: ['D31', 'D45'],
    origin: { kind: 'preset' as const, presetId: 'mondo-12', title: builtIn[0].title, edited: true },
    retired: [],
  };
  assert.deepEqual(readDraft(serializeDraft(draft), bank)?.draft, draft);
  assert.deepEqual(readDraft('{"ids":["NOPE"]}', bank)?.draft, { ids: [], origin: { kind: 'empty' }, retired: ['NOPE'] });
  assert.equal(readDraft('[1,2]', bank), null);
});

/* Play ----------------------------------------------------------------------------------- */

test('a game: choose, confirm, then advance; confirmed answers cannot change', () => {
  const ids = ['D31', 'D45', 'D64'];
  let game = startGame(ids);
  game = reduce(game, { type: 'confirm' });
  assert.deepEqual(game.answers, {}, 'no confirmation without a choice');
  game = reduce(game, { type: 'next' });
  assert.equal(game.index, 0, 'no advance before answering');
  game = reduce(game, { type: 'select', choice: 5 });
  assert.equal(game.choice, null, 'out-of-range choice ignored');
  game = reduce(game, { type: 'select', choice: 1 });
  game = reduce(game, { type: 'select', choice: byId.get('D31')!.correct });
  game = reduce(game, { type: 'confirm' });
  assert.equal(game.answers.D31, byId.get('D31')!.correct);
  const locked = reduce(game, { type: 'select', choice: (game.answers.D31 + 1) % 3 });
  assert.equal(locked, game);
  assert.equal(reduce(game, { type: 'confirm' }), game);

  for (const id of ids.slice(1)) {
    game = reduce(game, { type: 'next' });
    assert.equal(game.ids[game.index], id);
    assert.equal(game.choice, null);
    game = reduce(game, { type: 'select', choice: (byId.get(id)!.correct + 1) % 3 });
    game = reduce(game, { type: 'confirm' });
  }
  assert.equal(game.finished, false);
  game = reduce(game, { type: 'next' });
  assert.equal(game.finished, true);
  assert.deepEqual(score(game, byId), { right: 1, answered: 3, total: 3 });
  assert.deepEqual(
    outcomes(game, byId).map((o) => [o.item.id, o.right]),
    [
      ['D31', true],
      ['D45', false],
      ['D64', false],
    ],
  );
});

const PERMUTATIONS = [
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0],
];

test('every item is scored right exactly on its correct alternative, in any display order', () => {
  for (const item of items) {
    assert.equal(item.options.length, 3);
    for (const order of PERMUTATIONS) {
      for (let position = 0; position < 3; position += 1) {
        // The player clicks the alternative shown at `position`.
        const option = order[position];
        let game = startGame([item.id], { [item.id]: order });
        game = reduce(game, { type: 'select', choice: option }, 3);
        game = reduce(game, { type: 'confirm' });
        const right = item.options[option] === raw.items.find((r: { id: string }) => r.id === item.id).options[item.correct];
        assert.equal(score(game, byId).right, right ? 1 : 0, `${item.id} ${order} ${position}`);
        assert.equal(positionOf(game, item, option), position);
      }
      const game = startGame([item.id], { [item.id]: order });
      assert.equal(item.options[orderOf(game, item)[positionOf(game, item, item.correct)]], item.options[item.correct]);
    }
  }
});

test('option orders are permutations; without a source of randomness they keep the bank order', () => {
  const plain = optionOrders(items, null);
  for (const item of items) assert.deepEqual(plain[item.id], [0, 1, 2]);
  const seen = new Set<string>();
  for (let seed = 1; seed <= 30; seed += 1) {
    const orders = optionOrders(items, seededRng(seed));
    for (const item of items) {
      assert.deepEqual([...orders[item.id]].sort(), [0, 1, 2]);
      seen.add(orders[item.id].join());
    }
  }
  assert.equal(seen.size, 6);
});

test('a saved game resumes only with the same edition and active questions', () => {
  let game = startGame(['D31', 'D45', 'D64'], { D45: [2, 0, 1] });
  game = reduce(game, { type: 'select', choice: 0 });
  game = reduce(game, { type: 'confirm' });
  game = reduce(game, { type: 'next' });
  game = reduce(game, { type: 'select', choice: 2 });
  const stored = serializeGame(game, bank);
  assert.ok(!stored.includes('question'), 'no question objects are saved');
  assert.deepEqual(restoreGame(stored, bank), { game });

  const old = JSON.stringify({ ...JSON.parse(stored), edition: 4, bank: 'world-lenses-bank-1.0' });
  assert.ok('incompatible' in (restoreGame(old, bank) ?? {}));
  const retired = JSON.stringify({ ...JSON.parse(stored), ids: ['D31', 'D41', 'D64'] });
  assert.ok('incompatible' in (restoreGame(retired, bank) ?? {}));
  const badOrder = JSON.stringify({ ...JSON.parse(stored), orders: { D45: [0, 0, 1] } });
  assert.equal(restoreGame(badOrder, bank), null);
  const badAnswer = JSON.stringify({ ...JSON.parse(stored), answers: { D31: 5 } });
  assert.equal(restoreGame(badAnswer, bank), null);
  const finished = JSON.stringify({ ...JSON.parse(stored), finished: true });
  assert.equal(restoreGame(finished, bank), null);
  assert.equal(restoreGame('{{', bank), null);
  assert.equal(restoreGame(null, bank), null);
});

test('an empty battery is a finished game', () => {
  assert.equal(startGame([]).finished, true);
  assert.deepEqual(startGame(['D31', 'D31']).ids, ['D31']);
});
