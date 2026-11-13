/**
 * What the panel says about the operation on screen, as TeX with the keys of the objects each
 * relation refers to, and the Cartesian reading: the operation done in components, step by step,
 * with the actual numbers. Numbers carry the colour of the vector they come from; the x and y
 * columns are highlightable (`hk-x`, `hk-y`), and so is every symbol (`hk-a`, `hk-r`, …).
 * Masked values become "?"; the given vectors and k stay visible. Pure, tested.
 */
import { add, length, scale, sub } from '../model/vec.ts';
import type { Vec } from '../model/vec.ts';
import { degenerate, scalarCase } from '../model/operations.ts';
import type { DiffMode, Key, Operation, Vectors } from '../model/operations.ts';
import { cls, MASK, tex, texValue } from './format.ts';

export const hk = (key: Key, body: string) => cls(`hk-${key}`, body);

export const SYM = {
  a: hk('a', cls('c-a', '\\vec a')),
  b: hk('b', cls('c-b', '\\vec b')),
  nb: hk('nb', cls('c-nb', '-\\vec b')),
  sum: hk('r', cls('c-s', '\\vec a + \\vec b')),
  sumBA: hk('r', cls('c-s', '\\vec b + \\vec a')),
  sumDiag: hk('sd', cls('c-s', '\\vec a + \\vec b')),
  diff: hk('r', cls('c-s', '\\vec a - \\vec b')),
  ka: hk('r', cls('c-s', 'k\\,\\vec a')),
  k: cls('c-k', 'k'),
};

export function keysOf(classes: Iterable<string>): Key[] {
  return [...classes].filter((c) => c.startsWith('hk-')).map((c) => c.slice(3) as Key);
}

export interface Formula {
  id: string;
  keys: Key[];
  tex: string;
}

export interface Reading {
  main: Formula;
  rows: Formula[];
  notes: string[];
}

const modulus = (n: number, masked: boolean) => (masked ? `= ${MASK}` : texValue(n));
const N = (n: number) => tex(n, 2);

export function reading(
  s: Vectors,
  op: Operation,
  c: { diff: DiffMode; parallelogram: boolean },
  masked: boolean,
): Reading {
  const { a, b, k } = s;
  const paraNote = degenerate(s)
    ? `$${SYM.a}$ e $${SYM.b}$ sono paralleli, o uno dei due è nullo: il parallelogramma degenera in un segmento.`
    : null;

  if (op === 'sum') {
    const r = add(a, b);
    return {
      main: { id: 'main', keys: ['a', 'b', 'r'], tex: `${SYM.sum} = ${SYM.sumBA}` },
      rows: [
        {
          id: 'ma',
          keys: ['a', 'b'],
          tex: `|${SYM.a}| ${texValue(length(a))};\\qquad |${SYM.b}| ${texValue(length(b))}`,
        },
        { id: 'mr', keys: ['r'], tex: `|${SYM.sum}| ${modulus(length(r), masked)}` },
      ],
      notes: c.parallelogram
        ? [
            paraNote ??
              `Punta-coda e parallelogramma portano alla stessa freccia: $${SYM.sum}$ è la diagonale che parte dalla coda comune.`,
          ]
        : [],
    };
  }

  if (op === 'difference') {
    const r = sub(a, b);
    const notes = [
      c.diff === 'tips'
        ? `Con le code coincidenti, $${SYM.diff}$ va dalla punta di $${SYM.b}$ alla punta di $${SYM.a}$.`
        : `$${SYM.nb}$ ha lo stesso modulo e la stessa direzione di $${SYM.b}$, ma verso opposto.`,
    ];
    if (c.parallelogram) {
      notes.push(
        paraNote ??
          `Le diagonali del parallelogramma: $${SYM.sumDiag}$ dalla coda comune, $${SYM.diff}$ dalla punta di $${SYM.b}$ alla punta di $${SYM.a}$.`,
      );
    }
    return {
      main: { id: 'main', keys: ['a', 'nb', 'r'], tex: `${SYM.diff} = ${SYM.a} + (${SYM.nb})` },
      rows: [
        { id: 'mnb', keys: ['nb', 'b'], tex: `|${SYM.nb}| = |${SYM.b}| ${texValue(length(b))}` },
        { id: 'mr', keys: ['r'], tex: `|${SYM.diff}| ${modulus(length(r), masked)}` },
      ],
      notes,
    };
  }

  const kcase = scalarCase(k);
  const size =
    Math.abs(Math.abs(k) - 1) < 1e-9
      ? 'lo stesso modulo'
      : Math.abs(k) > 1
        ? 'modulo maggiore'
        : 'modulo minore';
  return {
    main: { id: 'main', keys: ['a', 'r'], tex: `|${SYM.ka}| = |${SYM.k}|\\,|${SYM.a}|` },
    rows: [
      {
        id: 'given',
        keys: ['a'],
        tex: `${SYM.k} = ${tex(k)};\\qquad |${SYM.a}| ${texValue(length(a))}`,
      },
      { id: 'mr', keys: ['r'], tex: `|${SYM.ka}| ${modulus(Math.abs(k) * length(a), masked)}` },
    ],
    notes: [
      kcase === 'zero'
        ? `$${SYM.k} = 0$: $${SYM.ka} = \\vec 0$, il vettore nullo.`
        : kcase === 'same'
          ? `$${SYM.k} > 0$: $${SYM.ka}$ ha la stessa direzione e lo stesso verso di $${SYM.a}$, ${size}.`
          : `$${SYM.k} < 0$: $${SYM.ka}$ ha la stessa direzione di $${SYM.a}$, verso opposto, ${size}.`,
    ],
  };
}

/* ---------- The Cartesian reading ---------- */

const X = '\\hat x';
const Y = '\\hat y';

/**
 * A vector as two aligned columns, "4\hat x" and "- \hat y", following the conventions of a
 * linear combination (±1 implicit, zero terms dropped, all zero → \vec 0). `colour` is the
 * class of its numbers.
 */
export function columns(v: Vec, colour: string, masked = false): [string, string] {
  const num = (n: string) => cls(colour, n);
  if (masked) return [hk('x', `${num(MASK)}\\,${X}`), hk('y', `+ ${num(MASK)}\\,${Y}`)];
  const part = (n: number, versor: string) => {
    const t = N(n);
    if (t === '0') return null;
    const negative = t.startsWith('-');
    const magnitude = negative ? t.slice(1) : t;
    return { negative, body: `${magnitude === '1' ? '' : num(magnitude)}${versor}` };
  };
  const px = part(v.x, X);
  const py = part(v.y, Y);
  if (!px && !py) return [hk('x', '\\vec 0'), ''];
  const xs = px ? hk('x', `${px.negative ? '-' : ''}${px.body}`) : '';
  const ys = py
    ? hk('y', px ? `${py.negative ? '-' : '+'} ${py.body}` : `${py.negative ? '-' : ''}${py.body}`)
    : '';
  return [xs, ys];
}

/** One line of the block: left side, then "=" and the x column, then the y column. */
const line = (lhs: string, [x, y]: [string, string]) =>
  `${lhs} & {}= ${x} & ${y && !y.includes('\\vec 0') ? `{}${y}` : y}`;

/**
 * The operation in components, with the general rule and the numbers:
 *
 *   a⃗ = 2x̂ + 3ŷ
 *   b⃗ = 4x̂ − ŷ
 *   a⃗ + b⃗ = (a_x + b_x) x̂ + (a_y + b_y) ŷ
 *          = (2 + 4) x̂ + (3 − 1) ŷ
 *          = 6 x̂ + 2 ŷ
 */
export function algebra(s: Vectors, op: Operation, masked: boolean): string {
  const { a, b, k } = s;
  const A = (n: number) => cls('c-a', N(n));
  const B = (n: number) => cls('c-b', N(n));
  const bracket = (n: number, f: (n: number) => string) => (N(n).startsWith('-') ? `(${f(n)})` : f(n));
  const rows: string[] = [line(SYM.a, columns(a, 'c-a'))];
  let lhs: string;
  let rule: [string, string];
  let numbers: (u: 'x' | 'y') => string;
  let result: Vec;
  if (op === 'scalar') {
    lhs = SYM.ka;
    rule = [hk('x', `(${SYM.k}\\,${cls('c-a', 'a_x')})\\,${X}`), hk('y', `+ (${SYM.k}\\,${cls('c-a', 'a_y')})\\,${Y}`)];
    numbers = (u) => `(${cls('c-k', N(k))} \\cdot ${bracket(a[u], A)})`;
    result = scale(a, k);
  } else {
    rows.push(line(SYM.b, columns(b, 'c-b')));
    const sum = op === 'sum';
    lhs = sum ? SYM.sum : SYM.diff;
    const sign = sum ? '+' : '-';
    const ax = (u: string) => cls('c-a', `a_${u}`);
    const bx = (u: string) => cls('c-b', `b_${u}`);
    rule = [hk('x', `(${ax('x')} ${sign} ${bx('x')})\\,${X}`), hk('y', `+ (${ax('y')} ${sign} ${bx('y')})\\,${Y}`)];
    numbers = (u) => {
      const q = b[u];
      // Adding a negative number is written as a subtraction; subtracting one keeps brackets.
      if (sum) return `(${A(a[u])} ${N(q).startsWith('-') ? '-' : '+'} ${B(Math.abs(q))})`;
      return `(${A(a[u])} - ${bracket(q, B)})`;
    };
    result = sum ? add(a, b) : sub(a, b);
  }
  rows.push(line(lhs, rule));
  rows.push(line('', [hk('x', `${numbers('x')}\\,${X}`), hk('y', `+ ${numbers('y')}\\,${Y}`)]));
  rows.push(line('', columns(result, 'c-s', masked)));
  // Three columns: left sides, x terms, y terms, so that each direction reads down a column.
  return `{\\def\\arraystretch{1.35}\\begin{array}{rll}${rows.join(' \\\\ ')}\\end{array}}`;
}
