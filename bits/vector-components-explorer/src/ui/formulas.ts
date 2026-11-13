/**
 * The relations shown beside the diagram, as TeX, with the keys of the objects they talk about.
 *
 * Highlighting works at two levels: a row lists its keys (pointing at the row lights them), and
 * every symbol and term carries a `hk-<key>` class (pointing at a term lights just that object:
 * v_x the scalar, x̂ the versor, v_x x̂ the vector component). Masked values become "?", the
 * symbols and the given coordinates stay. Pure, tested in tests/model.test.ts.
 */
import { componentsOf, situation } from '../model/arrow.ts';
import type { ArrowState } from '../model/arrow.ts';
import { sign } from '../model/vec.ts';
import { cls, isExact, MASK, tex, texParen } from './format.ts';

/**
 * Objects of the diagram that formulas and pointers can refer to: the vector, its points, the
 * vector components, the scalar components, the versors, the projections.
 */
export type Key = 'v' | 'A' | 'B' | 'vx' | 'vy' | 'sx' | 'sy' | 'xh' | 'yh' | 'px' | 'py';

/** A highlightable piece of TeX. */
export const hk = (key: Key, body: string) => cls(`hk-${key}`, body);

export const SYM = {
  v: hk('v', cls('c-v', '\\vec v')),
  vx: hk('vx', cls('c-x', '\\vec v_x')),
  vy: hk('vy', cls('c-y', '\\vec v_y')),
  sx: hk('sx', cls('c-x', 'v_x')),
  sy: hk('sy', cls('c-y', 'v_y')),
  xh: hk('xh', cls('c-xh', '\\hat x')),
  yh: hk('yh', cls('c-yh', '\\hat y')),
};

/** The keys named by the hk-classes of an element and its ancestors up to the formula. */
export function keysOf(classes: Iterable<string>): Key[] {
  return [...classes].filter((c) => c.startsWith('hk-')).map((c) => c.slice(3) as Key);
}

export interface Formula {
  id: string;
  keys: Key[];
  tex: string;
  main?: boolean;
}

export interface FormulaGroup {
  title: string;
  rows: Formula[];
}

/** "= 5", "= \sqrt{20} \approx 4{,}47", or "= ?" when masked. */
function modulusTail(sq: number, masked: boolean): string {
  if (masked) return `= ${MASK}`;
  const mod = Math.sqrt(sq);
  if (isExact(mod, 2)) return `= ${tex(mod, 2)}`;
  return `= \\sqrt{${tex(sq, 2)}} \\approx ${tex(mod, 2)}`;
}

/**
 * k x̂ with the conventions of a linear combination (1 x̂ → x̂, −1 x̂ → −x̂), each piece
 * highlightable: the coefficient is the scalar component, the whole term the vector component.
 * Returns the sign separately so that terms can be joined with + or −.
 */
function term(k: number, axis: 'x' | 'y', masked: boolean): { negative: boolean; body: string } | null {
  const s = axis === 'x' ? 'sx' : 'sy';
  const h = axis === 'x' ? SYM.xh : SYM.yh;
  const whole = axis === 'x' ? 'vx' : 'vy';
  if (masked) return { negative: false, body: hk(whole, `${hk(s, MASK)}\\,${h}`) };
  const t = tex(k);
  if (t === '0') return null;
  const negative = t.startsWith('-');
  const magnitude = negative ? t.slice(1) : t;
  const coefficient = magnitude === '1' ? '' : hk(s, cls(axis === 'x' ? 'c-x' : 'c-y', magnitude));
  return { negative, body: hk(whole, `${coefficient}${h}`) };
}

/** v_x x̂ + v_y ŷ with numbers: "4x̂ − 3ŷ", "−x̂", "\vec 0". */
export function combination(vx: number, vy: number, masked: boolean): string {
  const parts = [term(vx, 'x', masked), term(vy, 'y', masked)].filter((p) => p !== null);
  if (parts.length === 0) return '\\vec 0';
  return parts
    .map((p, i) => (i === 0 ? `${p.negative ? '-' : ''}${p.body}` : ` ${p.negative ? '-' : '+'} ${p.body}`))
    .join('');
}

export function formulaGroups(s: ArrowState, masked: boolean): FormulaGroup[] {
  const v = componentsOf(s);
  const m = (n: number, key: Key) => (masked ? hk(key, MASK) : hk(key, tex(n)));
  const single = (k: number, axis: 'x' | 'y') => {
    const t = term(k, axis, masked);
    return t === null ? '\\vec 0' : `${t.negative ? '-' : ''}${t.body}`;
  };
  const sq = v.x * v.x + v.y * v.y;
  return [
    {
      title: 'Componenti scalari',
      rows: [
        {
          id: 'sx',
          keys: ['sx', 'px'],
          tex: `${SYM.sx} = x_B - x_A = ${tex(s.B.x)} - ${texParen(s.A.x)} = ${m(v.x, 'sx')}`,
        },
        {
          id: 'sy',
          keys: ['sy', 'py'],
          tex: `${SYM.sy} = y_B - y_A = ${tex(s.B.y)} - ${texParen(s.A.y)} = ${m(v.y, 'sy')}`,
        },
      ],
    },
    {
      title: 'Componenti vettoriali',
      rows: [
        { id: 'vx', keys: ['vx', 'sx', 'xh'], tex: `${SYM.vx} = ${hk('vx', `${SYM.sx}\\,${SYM.xh}`)} = ${single(v.x, 'x')}` },
        { id: 'vy', keys: ['vy', 'sy', 'yh'], tex: `${SYM.vy} = ${hk('vy', `${SYM.sy}\\,${SYM.yh}`)} = ${single(v.y, 'y')}` },
        { id: 'sum', keys: ['v', 'vx', 'vy'], tex: `${SYM.v} = ${SYM.vx} + ${SYM.vy}` },
      ],
    },
    {
      title: '',
      rows: [
        {
          id: 'main',
          keys: ['v', 'sx', 'sy', 'xh', 'yh'],
          main: true,
          tex: `\\boxed{${SYM.v} = ${hk('vx', `${SYM.sx}\\,${SYM.xh}`)} + ${hk('vy', `${SYM.sy}\\,${SYM.yh}`)}}`,
        },
        { id: 'main-value', keys: ['v', 'vx', 'vy'], tex: `${SYM.v} = ${combination(v.x, v.y, masked)}` },
      ],
    },
    {
      title: '',
      rows: [
        {
          id: 'mod',
          keys: ['v'],
          tex: `|${SYM.v}| = \\sqrt{${SYM.sx}^2 + ${SYM.sy}^2} ${modulusTail(sq, masked)}`,
        },
        {
          id: 'modc',
          keys: ['vx', 'vy', 'sx', 'sy'],
          tex: `|${SYM.vx}| = |${SYM.sx}| = ${m(Math.abs(v.x), 'vx')};\\quad |${SYM.vy}| = |${SYM.sy}| = ${m(Math.abs(v.y), 'vy')}`,
        },
      ],
    },
  ];
}

/** Short remarks for the configuration on screen, at most two, as text with $TeX$ pieces. */
export function notes(s: ArrowState, masked: boolean): string[] {
  // With the values hidden, every remark would hint at one of them: none is shown.
  if (masked) return [];
  const v = componentsOf(s);
  const where = situation(v);
  if (where.kind === 'zero') {
    return [`Coda e punta coincidono: $${SYM.v}$ è il vettore nullo $\\vec 0$, di modulo $0$.`];
  }
  const out: string[] = [];
  if (sign(s.A.x) === 0 && sign(s.A.y) === 0) {
    out.push(
      `Coda nell’origine: le componenti scalari $${SYM.sx}$ e $${SYM.sy}$ coincidono con le coordinate di $B$.`,
    );
  }
  const against = (sym: string, hat: string, sc: string) =>
    `$${sc} < 0$: la componente vettoriale $${sym}$ ha verso opposto a $${hat}$; il suo modulo è $|${sym}| = |${sc}| > 0$.`;
  if (sign(v.x) < 0) out.push(against(SYM.vx, SYM.xh, SYM.sx));
  if (sign(v.y) < 0) out.push(against(SYM.vy, SYM.yh, SYM.sy));
  if (where.kind === 'axis') {
    out.push(
      where.axis === 'x'
        ? `$${SYM.sy} = 0$: $${SYM.v}$ è parallelo all’asse $x$ e coincide con la sua componente vettoriale $${SYM.vx}$.`
        : `$${SYM.sx} = 0$: $${SYM.v}$ è parallelo all’asse $y$ e coincide con la sua componente vettoriale $${SYM.vy}$.`,
    );
  }
  return out.slice(0, 2);
}
