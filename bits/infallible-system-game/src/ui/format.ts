/** Italian number formatting: comma decimals, always-grouped thousands, a true minus sign. */
import type { PocketColor } from '../game/rules.ts';

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

export const decimal = (value: number, digits = 3) => number(value, digits);

/** Always carries a sign, and zero is shown plainly. */
export const signed = (value: number, digits = 0) => {
  const text = number(value, digits);
  return Number(value.toFixed(digits)) > 0 ? `+${text}` : text;
};

export const percent = (share: number, digits = 1) => `${number(share * 100, digits)}%`;

export const signedPercent = (share: number, digits = 2) => {
  const text = percent(share, digits);
  return Number((share * 100).toFixed(digits)) > 0 ? `+${text}` : text;
};

/** "1 gettone", "2 gettoni". */
export const tokens = (count: number) => `${integer(count)} ${Math.abs(count) === 1 ? 'gettone' : 'gettoni'}`;

export const spins = (count: number) => `${integer(count)} ${count === 1 ? 'giro' : 'giri'}`;

/** A statistic that is undefined until the first spin. */
export const orDash = (value: number | null, format: (v: number) => string) =>
  value === null ? '—' : format(value);

export const COLOR_NAME: Record<PocketColor, string> = { red: 'rosso', black: 'nero', green: 'verde' };
