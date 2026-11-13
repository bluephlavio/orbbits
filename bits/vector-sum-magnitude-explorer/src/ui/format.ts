/**
 * Numbers for the learner, as plain text and as TeX. Italian conventions: decimal comma, a true
 * minus sign, never "−0". Pure, tested in tests/format.test.ts.
 */
import { EPS } from '../model/vec.ts';

/** Rounds to `digits` decimals and drops trailing zeros: 2.50 → "2.5", 3.00 → "3", −0.004 → "0". */
function plain(n: number, digits: number): string {
  const fixed = n.toFixed(digits);
  const trimmed = digits > 0 ? fixed.replace(/\.?0+$/, '') : fixed;
  return trimmed === '-0' ? '0' : trimmed;
}

/** Text for the page: "−3,5". */
export const text = (n: number, digits = 1): string =>
  plain(n, digits).replace('.', ',').replace('-', '−');

/** TeX for KaTeX: "-3{,}5" (the braces stop KaTeX from spacing the comma as punctuation). */
export const tex = (n: number, digits = 1): string => plain(n, digits).replace('.', '{,}');

/** A subtrahend or factor: negative values in parentheses, "(-2)". */
export const texParen = (n: number, digits = 1): string => {
  const s = tex(n, digits);
  return s.startsWith('-') ? `(${s})` : s;
};

/** Whether `n` is shown exactly with `digits` decimals. */
export const isExact = (n: number, digits: number): boolean =>
  Math.abs(Number(n.toFixed(digits)) - n) < EPS;

/** "= 5" or "\approx 4{,}47": the relation sign that keeps a rounded readout honest. */
export const texValue = (n: number, digits = 2): string =>
  `${isExact(n, digits) ? '=' : '\\approx'} ${tex(n, digits)}`;

/** The same for text: "= 5" or "≈ 4,47". */
export const textValue = (n: number, digits = 2): string =>
  `${isExact(n, digits) ? '=' : '≈'} ${text(n, digits)}`;

/**
 * A linear combination such as 4x̂ − 3ŷ, from [coefficient, TeX symbol] pairs. Coefficients ±1
 * are implicit, zero terms vanish, and an all-zero combination is the zero vector.
 */
export function texCombination(terms: readonly (readonly [number, string])[], digits = 1): string {
  let out = '';
  for (const [k, symbol] of terms) {
    const s = tex(k, digits);
    if (s === '0') continue;
    const negative = s.startsWith('-');
    const magnitude = negative ? s.slice(1) : s;
    const coefficient = magnitude === '1' ? '' : magnitude;
    if (out === '') out = `${negative ? '-' : ''}${coefficient}${symbol}`;
    else out += ` ${negative ? '-' : '+'} ${coefficient}${symbol}`;
  }
  return out === '' ? '\\vec 0' : out;
}

/** Wraps TeX in a class for colour and highlighting (KaTeX \htmlClass, trusted in Tex.tsx). */
export const cls = (name: string, body: string): string => `\\htmlClass{${name}}{${body}}`;

/** A masked value: the geometry stays, the number waits for a prediction. */
export const MASK = '\\htmlClass{mask}{\\,?\\,}';
