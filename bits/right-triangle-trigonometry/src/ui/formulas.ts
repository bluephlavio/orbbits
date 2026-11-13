/**
 * What the panel says about the triangle on screen, as TeX, with the keys of the objects it
 * talks about. The ratios are written first as ratios of sides ("opposto / ipotenusa") and
 * only on request with their names (sen, cos, tan): first the phenomenon, then the word.
 *
 * Every symbol carries a `hk-<key>` class, so pointing at "opposto" lights the opposite leg and
 * pointing at the leg lights every "opposto". Computed values can be masked ("?"); the given
 * data (the angle, the hypotenuse) stay. Pure, tested in tests/model.test.ts.
 */
import {
  beta,
  COPY_SCALES,
  isIsosceles,
  ratios,
  referenceAngle,
  roles,
  scaled,
  sides,
} from '../model/triangle.ts';
import type { Reference, Role, Side, Triangle } from '../model/triangle.ts';
import { cls, isExact, MASK, tex } from './format.ts';

/** Objects of the drawing: the three roles, the reference angle and the other acute angle. */
export type Key = Role | 'ang' | 'other';

export const hk = (key: Key, body: string) => cls(`hk-${key}`, body);

/** Decimals: lengths to the hundredth, ratios to the thousandth. */
export const LEN = 2;
export const RAT = 3;

export const ROLE_WORD: Record<Role, string> = {
  hyp: 'ipotenusa',
  opp: 'opposto',
  adj: 'adiacente',
};

/** Full names, for the diagram and the legend. */
export const ROLE_NAME: Record<Role, string> = {
  hyp: 'ipotenusa',
  opp: 'cateto opposto',
  adj: 'cateto adiacente',
};

export const angleTex = (ref: Reference) => (ref === 'alpha' ? '\\alpha' : '\\beta');
const otherTex = (ref: Reference) => (ref === 'alpha' ? '\\beta' : '\\alpha');

/** A role word, coloured and highlightable. */
export const word = (role: Role) => hk(role, cls(`c-${role}`, `\\text{${ROLE_WORD[role]}}`));
/** A segment by its endpoints, coloured by the role it plays (its length, in formulas). */
export const seg = (side: Side, role: Role) => hk(role, cls(`c-${role}`, side));
/** The reference angle symbol. */
export const ang = (ref: Reference) => hk('ang', cls('c-ang', angleTex(ref)));

/** A value with all its decimals, as TeX: 0.7 → "0{,}700" (a ratio keeps its precision visible). */
export const fixedTex = (n: number, digits: number) => {
  const s = n.toFixed(digits);
  return (s.startsWith('-') && Number(s) === 0 ? s.slice(1) : s).replace('.', '{,}');
};

/** The same as text: "0,700". */
export const fixedText = (n: number, digits: number) => fixedTex(n, digits).replace('{,}', ',');

/** A ratio with its relation sign: "= 0{,}500" (exact) or "\approx 0{,}574". */
const rel = (n: number, digits: number) => `${isExact(n, digits) ? '=' : '\\approx'} ${fixedTex(n, digits)}`;

export type RatioId = 'sin' | 'cos' | 'tan';

export const RATIO_ROLES: Record<RatioId, [Role, Role]> = {
  sin: ['opp', 'hyp'],
  cos: ['adj', 'hyp'],
  tan: ['opp', 'adj'],
};

const NAME: Record<RatioId, string> = {
  sin: '\\operatorname{sen}',
  cos: '\\cos',
  tan: '\\tan',
};

/** "sen α", "cos β"… as TeX, highlightable as the ratio's two sides plus the angle. */
export const ratioName = (id: RatioId, ref: Reference) => `${NAME[id]}${ang(ref)}`;

export interface RatioRow {
  id: RatioId;
  keys: Key[];
  /** "sen α", or null while the ratios have no names yet. */
  name: string | null;
  /** The ratio in words, on this triangle's sides, in numbers, and its value. */
  body: string;
  value: number;
}

/**
 * The three ratio rows. A masked leg (it is computed from the data) becomes "?", the
 * hypotenuse (given) stays, the value becomes "?".
 */
export function ratioRows(t: Triangle, ref: Reference, names: boolean, masked: boolean): RatioRow[] {
  const s = sides(t);
  const r = roles(ref);
  const values = ratios(t, ref);
  const number = (role: Role) => {
    const side = r[role];
    if (role !== 'hyp' && masked) return hk(role, MASK);
    return hk(role, cls(`c-${role}`, tex(s[side], LEN)));
  };
  return (['sin', 'cos', 'tan'] as const).map((id) => {
    const [num, den] = RATIO_ROLES[id];
    const words = `\\dfrac{${word(num)}}{${word(den)}}`;
    const value = values[id];
    return {
      id,
      keys: [num, den, 'ang'],
      name: names ? `${ratioName(id, ref)} =` : null,
      body:
        `${words} = \\dfrac{${seg(r[num], num)}}{${seg(r[den], den)}} = \\dfrac{${number(num)}}{${number(den)}} ` +
        (masked ? `= ${MASK}` : rel(value, RAT)),
      value,
    };
  });
}

/** The two acute angles: the reference one first. α + β = 90°. */
export function angleRow(t: Triangle, ref: Reference): string {
  const a = referenceAngle(t, ref);
  const o = ref === 'alpha' ? beta(t) : t.alpha;
  return (
    `${ang(ref)} = ${tex(a, 1)}^\\circ,\\quad ` +
    `${hk('other', cls('c-other', otherTex(ref)))} = 90^\\circ - ${ang(ref)} = ${tex(o, 1)}^\\circ`
  );
}

export interface SimilarColumn {
  /** Name of the triangle, as TeX: AB₁C₁, AB₂C₂, ABC. */
  name: string;
  k: number;
  lengths: Record<Role, number>;
  ratios: Record<RatioId, number>;
}

/**
 * The similar triangles side by side: the copies inside ABC (scale ½ and ¾) and ABC itself.
 * Lengths change with the scale; each ratio is measured on that triangle's own sides.
 */
export function similarColumns(t: Triangle, ref: Reference): SimilarColumn[] {
  const r = roles(ref);
  const cols = [...COPY_SCALES.map((k, i) => ({ k, sub: `_${i + 1}` })), { k: 1, sub: '' }];
  return cols.map(({ k, sub }) => {
    const s = scaled(t, k);
    const lengths = { hyp: s[r.hyp], opp: s[r.opp], adj: s[r.adj] };
    return {
      name: `AB${sub}C${sub}`,
      k,
      lengths,
      ratios: {
        sin: lengths.opp / lengths.hyp,
        cos: lengths.adj / lengths.hyp,
        tan: lengths.opp / lengths.adj,
      },
    };
  });
}

/** Text for a table cell: "4,59", "0,500" (fixed decimals) or "?" when masked. */
export const cell = (n: number, digits: number, masked: boolean) => (masked ? '?' : fixedText(n, digits));

/**
 * Short remarks for the configuration on screen, at most two, as text with $TeX$ pieces.
 * With the values hidden, remarks that would give a value away are not shown.
 */
export function notes(
  t: Triangle,
  ref: Reference,
  o: { names: boolean; copies: boolean; masked: boolean },
): string[] {
  const out: string[] = [];
  const r = roles(ref);
  const a = ang(ref);
  const s = sides(t);
  const opp = s[r.opp];
  const adj = s[r.adj];
  if (o.copies) {
    out.push(
      `Stesso angolo $${a}$, tre grandezze: le lunghezze cambiano con la scala, i rapporti fra i lati corrispondenti no.`,
    );
  }
  if (ref === 'beta') {
    out.push(
      o.names
        ? `Riferiti a $${a}$, i cateti si scambiano i ruoli: $${ratioName('sin', ref)} = \\cos\\alpha$ e $${ratioName('cos', ref)} = \\operatorname{sen}\\alpha$.`
        : `Riferiti a $${a}$, i cateti si scambiano i ruoli: l’opposto di $\\alpha$ è l’adiacente di $\\beta$. L’ipotenusa resta la stessa.`,
    );
  }
  if (!o.masked) {
    if (isIsosceles(t)) {
      out.push(`Con $${a} = 45^\\circ$ i due cateti sono uguali: ${o.names ? `$${ratioName('tan', ref)} = 1$` : 'il loro rapporto è $1$'}.`);
    } else if (opp > adj) {
      out.push(
        `Il cateto opposto è più lungo dell’adiacente: ${o.names ? `$${ratioName('tan', ref)}$` : 'il loro rapporto'} supera $1$. Un cateto, invece, non supera mai l’ipotenusa.`,
      );
    } else {
      out.push(
        `Ogni cateto è più corto dell’ipotenusa: i rapporti con l’ipotenusa sono sempre compresi fra $0$ e $1$, estremi esclusi.`,
      );
    }
  }
  return out.slice(0, 2);
}

/** The keys of the innermost highlightable term (hk-* classes). */
export function keysOf(classes: Iterable<string>): Key[] {
  return [...classes].filter((c) => c.startsWith('hk-')).map((c) => c.slice(3) as Key);
}
