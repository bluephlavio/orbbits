/**
 * The case readout as TeX: the rule of the special case with the numbers put in, or the
 * general-case remark with the computed value. Masked values become "?". Pure, tested.
 */
import { caseOf, range, sumModulus } from '../model/magnitude.ts';
import type { Case, Config } from '../model/magnitude.ts';
import { cls, MASK, tex, texValue } from './format.ts';

export const SYM = {
  a: cls('c-a', '\\vec a'),
  b: cls('c-b', '\\vec b'),
  s: cls('c-s', '\\vec a + \\vec b'),
  alpha: '\\alpha',
};

export const MA = `|${SYM.a}|`;
export const MB = `|${SYM.b}|`;
export const MS = `|${SYM.s}|`;

export const CASE_TITLES: Record<Case, string> = {
  concordant: 'Vettori paralleli e concordi',
  discordant: 'Vettori paralleli e discordi',
  perpendicular: 'Vettori perpendicolari',
  general: 'Caso generale',
};

export interface CaseReading {
  case: Case;
  title: string;
  /** The rule, symbolic: absent in the general case. */
  rule: string | null;
  /** The rule with numbers, ending in the value (or a mask). */
  worked: string;
  note: string | null;
}

const n = (v: number) => tex(v, 2);

export function caseReading(c: Config, masked: boolean): CaseReading {
  const kind = caseOf(c.alpha);
  const s = sumModulus(c);
  const value = masked ? `= ${MASK}` : texValue(s);
  const base = { case: kind, title: CASE_TITLES[kind] };
  if (kind === 'concordant') {
    return {
      ...base,
      rule: `${MS} = ${MA} + ${MB}`,
      worked: `${MS} = ${n(c.a)} + ${n(c.b)} ${value}`,
      note: 'I moduli si sommano: la spezzata punta-coda è un unico segmento.',
    };
  }
  if (kind === 'discordant') {
    const zero = Math.abs(c.a - c.b) < 1e-9;
    return {
      ...base,
      rule: `${MS} = \\big|\\,${MA} - ${MB}\\,\\big|`,
      worked: `${MS} = |${n(c.a)} - ${n(c.b)}| ${value}`,
      note: !zero
        ? 'I moduli si sottraggono: il risultante ha il verso del vettore di modulo maggiore.'
        : masked
          ? 'I moduli si sottraggono.'
          : `Moduli uguali e versi opposti: $${SYM.s} = \\vec 0$, il vettore nullo.`,
    };
  }
  if (kind === 'perpendicular') {
    return {
      ...base,
      rule: `${MS} = \\sqrt{${MA}^2 + ${MB}^2}`,
      worked: `${MS} = \\sqrt{${n(c.a)}^2 + ${n(c.b)}^2} = \\sqrt{${n(c.a * c.a + c.b * c.b)}} ${value}`,
      note: 'Il triangolo punta-coda è rettangolo: vale il teorema di Pitagora.',
    };
  }
  return {
    ...base,
    rule: null,
    worked: `${MS} ${value}`,
    note:
      'Le tre regole precedenti non si applicano direttamente. Il modulo si calcola con altri strumenti, per esempio scomponendo i vettori lungo due assi cartesiani.',
  };
}

/** ||a⃗| − |b⃗|| ≤ |a⃗ + b⃗| ≤ |a⃗| + |b⃗| with the numbers. */
export function rangeTex(c: Config): string {
  const [lo, hi] = range(c);
  return `${n(lo)} \\le ${MS} \\le ${n(hi)}`;
}

export const INEQUALITY = `\\big|\\,${MA} - ${MB}\\,\\big| \\le ${MS} \\le ${MA} + ${MB}`;
export const COSINE_RULE = `${MS} = \\sqrt{${MA}^2 + ${MB}^2 + 2\\,${MA}\\,${MB}\\cos\\alpha}`;
