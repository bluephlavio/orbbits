/** Italian number formatting: comma decimals, always-grouped thousands, a true minus sign. */
import { MIN_GAMES } from '../game/stats.ts';
import type { Tally } from '../game/stats.ts';

const LOCALE = 'it-IT';

const number = (value: number, digits: number) =>
  new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    useGrouping: 'always',
    signDisplay: 'negative', // no "−0,000" for a value that rounds to zero
  })
    .format(value)
    .replace('-', '−');

export const integer = (value: number) => number(value, 0);

export const percent = (share: number, digits = 1) => `${number(share * 100, digits)}%`;

export const asPercent = (share: number) => percent(share, 0);

export const games = (count: number) => `${integer(count)} ${count === 1 ? 'partita' : 'partite'}`;

export const times = (count: number) => `${integer(count)} ${count === 1 ? 'volta' : 'volte'}`;

/** A statistic that is undefined until the first game. */
export const orDash = (value: number | null, format: (v: number) => string) =>
  value === null ? '—' : format(value);

export const ofTotal = ({ wins, played }: Tally) => `${integer(wins)} su ${integer(played)}`;

/**
 * A frequency, stated as the data allow: a percentage suggests a precision that three games do
 * not have, so below MIN_GAMES the counts are shown instead.
 */
export const frequency = (tally: Tally) => {
  if (tally.played === 0) return '—';
  return tally.played < MIN_GAMES ? ofTotal(tally) : percent(tally.rate!);
};
