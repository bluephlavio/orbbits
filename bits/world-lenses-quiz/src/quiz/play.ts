/**
 * A game over a battery: one question at a time, a choice, an explicit confirmation, then the
 * explanation, and the user decides when to go on. Pure reducer; the UI only sends actions.
 *
 * Guards live here: a confirmed answer cannot be changed, confirming needs a choice, advancing
 * needs a confirmed answer. `answers` is keyed by item id and records the confirmed choice as
 * an index into the item's own `options` (the bank's order), whatever order the alternatives
 * are shown in: `orders[id][position]` is the option shown at that position. Scoring therefore
 * compares with the bank's `correct` directly and does not depend on the display.
 *
 * A game in progress can be saved (ids, order, answers; never question objects) and restored
 * only for the same bank edition with every question still active.
 */
import type { Bank, Item } from './bank.ts';
import type { Rng } from './selection.ts';
import { shuffled } from './selection.ts';

export interface Game {
  ids: string[];
  /** Display order of each item's options: a permutation of its option indices. */
  orders: Record<string, number[]>;
  index: number;
  /** The highlighted alternative before confirmation (an option index, not a position). */
  choice: number | null;
  answers: Record<string, number>;
  finished: boolean;
}

export type Action =
  | { type: 'select'; choice: number }
  | { type: 'confirm' }
  | { type: 'next' }
  | { type: 'start'; ids: string[]; orders?: Record<string, number[]> }
  | { type: 'restore'; game: Game };

export const startGame = (ids: readonly string[], orders: Record<string, number[]> = {}): Game => ({
  ids: [...new Set(ids)],
  orders,
  index: 0,
  choice: null,
  answers: {},
  finished: ids.length === 0,
});

/** The bank's order (`null` rng) or a fresh random order for each item. */
export function optionOrders(items: readonly Item[], rng: Rng | null): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const item of items) {
    const identity = item.options.map((_, i) => i);
    out[item.id] = rng ? shuffled(identity, rng) : identity;
  }
  return out;
}

/** The option indices in display order. */
export const orderOf = (game: Game, item: Item): number[] =>
  game.orders[item.id] ?? item.options.map((_, i) => i);

/** The display position (0 = A) of an option index. */
export const positionOf = (game: Game, item: Item, option: number) => {
  const at = orderOf(game, item).indexOf(option);
  return at < 0 ? option : at;
};

export const currentId = (game: Game) => game.ids[game.index];
export const isAnswered = (game: Game, id = currentId(game)) =>
  id !== undefined && Object.hasOwn(game.answers, id);

export function reduce(game: Game, action: Action, optionCount = 3): Game {
  switch (action.type) {
    case 'start':
      return startGame(action.ids, action.orders);
    case 'restore':
      return action.game;
    case 'select':
      if (game.finished || isAnswered(game)) return game;
      if (!Number.isInteger(action.choice) || action.choice < 0 || action.choice >= optionCount) {
        return game;
      }
      return { ...game, choice: action.choice };
    case 'confirm': {
      const id = currentId(game);
      if (game.finished || id === undefined || isAnswered(game) || game.choice === null) return game;
      return { ...game, answers: { ...game.answers, [id]: game.choice } };
    }
    case 'next':
      if (game.finished || !isAnswered(game)) return game;
      if (game.index + 1 >= game.ids.length) return { ...game, finished: true, choice: null };
      return { ...game, index: game.index + 1, choice: null };
  }
}

export interface Outcome {
  item: Item;
  chosen: number;
  right: boolean;
}

/** The confirmed answers in battery order, joined to their items. */
export function outcomes(game: Game, byId: ReadonlyMap<string, Item>): Outcome[] {
  return game.ids.flatMap((id) => {
    const item = byId.get(id);
    if (!item || !Object.hasOwn(game.answers, id)) return [];
    const chosen = game.answers[id];
    return [{ item, chosen, right: chosen === item.correct }];
  });
}

export function score(game: Game, byId: ReadonlyMap<string, Item>) {
  const list = outcomes(game, byId);
  return { right: list.filter((o) => o.right).length, answered: list.length, total: game.ids.length };
}

/* Saved session -------------------------------------------------------------------------- */

export const GAME_KEY = 'orbbits.world-lenses-quiz.game';

type BankStamp = Pick<Bank, 'byId' | 'edition' | 'schema'>;

/** Only ids and indices, stamped with the bank they refer to. */
export const serializeGame = (game: Game, bank: BankStamp) =>
  JSON.stringify({
    bank: bank.schema,
    edition: bank.edition,
    ids: game.ids,
    orders: game.orders,
    index: game.index,
    choice: game.choice,
    answers: game.answers,
    finished: game.finished,
  });

export type Restored = { game: Game } | { incompatible: string } | null;

const isPermutation = (value: unknown, n: number): value is number[] =>
  Array.isArray(value) &&
  value.length === n &&
  new Set(value).size === n &&
  value.every((v) => Number.isInteger(v) && v >= 0 && v < n);

/**
 * A saved game, if it can be resumed with this bank; `incompatible` (with the reason for the
 * person) when it belongs to another edition or names questions that are no longer active;
 * null when there is nothing worth resuming.
 */
export function restoreGame(stored: string | null, bank: BankStamp): Restored {
  if (!stored) return null;
  let data: unknown;
  try {
    data = JSON.parse(stored);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return null;
  const raw = data as Record<string, unknown>;
  if (raw.finished === true) return null;
  if (!Array.isArray(raw.ids) || raw.ids.length === 0) return null;
  if (raw.edition !== bank.edition || raw.bank !== bank.schema) {
    return { incompatible: 'La partita interrotta usava un’edizione precedente della banca e non può riprendere.' };
  }
  const ids = raw.ids.filter((id): id is string => typeof id === 'string');
  if (ids.length !== raw.ids.length || new Set(ids).size !== ids.length || ids.some((id) => !bank.byId.has(id))) {
    return { incompatible: 'La partita interrotta conteneva domande non più attive e non può riprendere.' };
  }
  const index = raw.index;
  if (typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index >= ids.length) return null;
  const orders: Record<string, number[]> = {};
  const answers: Record<string, number> = {};
  const rawOrders = typeof raw.orders === 'object' && raw.orders !== null ? (raw.orders as Record<string, unknown>) : {};
  const rawAnswers = typeof raw.answers === 'object' && raw.answers !== null ? (raw.answers as Record<string, unknown>) : {};
  for (const id of ids) {
    const n = bank.byId.get(id)!.options.length;
    if (Object.hasOwn(rawOrders, id)) {
      if (!isPermutation(rawOrders[id], n)) return null;
      orders[id] = [...rawOrders[id]];
    }
    if (Object.hasOwn(rawAnswers, id)) {
      const a = rawAnswers[id];
      if (typeof a !== 'number' || !Number.isInteger(a) || a < 0 || a >= n) return null;
      answers[id] = a;
    }
  }
  if (Object.keys(rawAnswers).some((id) => !ids.includes(id))) return null;
  // Every question before the current one has been answered, none after it.
  if (ids.some((id, i) => (i < index) !== Object.hasOwn(answers, id) && i !== index)) return null;
  const n = bank.byId.get(ids[index])!.options.length;
  const choice =
    typeof raw.choice === 'number' && Number.isInteger(raw.choice) && raw.choice >= 0 && raw.choice < n
      ? raw.choice
      : null;
  if (Object.keys(answers).length === 0 && choice === null) return null;
  return { game: { ids, orders, index, choice, answers, finished: false } };
}
