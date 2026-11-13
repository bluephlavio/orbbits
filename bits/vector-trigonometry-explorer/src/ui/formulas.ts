/**
 * The calculation beside the diagram, as TeX rows with the keys of the objects they talk about.
 * Two readings of the same triangle:
 *
 *   'polar'      modulus and direction given → lengths of the legs → signs → components
 *   'cartesian'  components given → modulus (Pythagoras) → reference angle (tan⁻¹) → quadrant
 *
 * With `first` (first quadrant only) the angle is α and the components are the legs; with all
 * quadrants it is β, and lengths (|v_x|, never negative) are kept apart from components (v_x,
 * with a sign). `steps` adds the intermediate passages; `masked` hides what is computed, never
 * the data. Every symbol carries a `hk-<key>` class for highlighting. Pure, tested.
 */
import { analyse, calculatorAngle, cosDeg, ROMAN, signsOf, sinDeg } from '../model/direction.ts';
import type { Quadrant } from '../model/direction.ts';
import type { Vec } from '../model/vec.ts';
import { cls, isExact, MASK, tex, texParen } from './format.ts';

/**
 * Objects of the diagram: the vector (and its modulus, the hypotenuse), the angle, the lengths
 * of the legs, the scalar components (signed, on the axes), the vector components, the quadrant.
 */
export type Key = 'v' | 'ang' | 'lx' | 'ly' | 'sx' | 'sy' | 'vx' | 'vy' | 'q';

export type Mode = 'polar' | 'cartesian';

export const hk = (key: Key, body: string) => cls(`hk-${key}`, body);

/** Decimals: components and lengths to the hundredth, angles to the tenth, tangents to 0.001. */
export const LEN = 2;
export const DEG = 1;
export const TAN = 3;

export const SYM = {
  v: hk('v', cls('c-v', '\\vec v')),
  mod: hk('v', cls('c-v', '|\\vec v|')),
  sx: hk('sx', cls('c-x', 'v_x')),
  sy: hk('sy', cls('c-y', 'v_y')),
  lx: hk('lx', cls('c-x', '|v_x|')),
  ly: hk('ly', cls('c-y', '|v_y|')),
  vx: hk('vx', cls('c-x', '\\vec v_x')),
  vy: hk('vy', cls('c-y', '\\vec v_y')),
  xh: cls('c-x', '\\hat x'),
  yh: cls('c-y', '\\hat y'),
};

export const angleSym = (first: boolean) => hk('ang', cls('c-ang', first ? '\\alpha' : '\\beta'));
const SEN = '\\operatorname{sen}';

/** "= 4{,}91" or "\approx 4{,}91". */
const rel = (n: number, digits: number) => `${isExact(n, digits) ? '=' : '\\approx'} ${tex(n, digits)}`;
const degTex = (n: number, digits = DEG) => `${tex(n, digits)}^\\circ`;
const relDeg = (n: number) => `${isExact(n, DEG) ? '=' : '\\approx'} ${degTex(n)}`;

export interface Row {
  id: string;
  keys: Key[];
  tex: string;
  main?: boolean;
}

export interface Group {
  title: string;
  rows: Row[];
}

/** v⃗ = v_x x̂ + v_y ŷ in numbers, with the conventions of a linear combination. */
function combination(v: Vec, masked: boolean): string {
  if (masked) return `${hk('vx', `${hk('sx', MASK)}\\,${SYM.xh}`)} + ${hk('vy', `${hk('sy', MASK)}\\,${SYM.yh}`)}`;
  const parts: { negative: boolean; body: string }[] = [];
  for (const [n, axis] of [
    [v.x, 'x'],
    [v.y, 'y'],
  ] as const) {
    const t = tex(n, LEN);
    if (t === '0') continue;
    const negative = t.startsWith('-');
    const m = negative ? t.slice(1) : t;
    const coefficient = m === '1' ? '' : hk(axis === 'x' ? 'sx' : 'sy', cls(axis === 'x' ? 'c-x' : 'c-y', m));
    parts.push({ negative, body: hk(axis === 'x' ? 'vx' : 'vy', `${coefficient}\\,${axis === 'x' ? SYM.xh : SYM.yh}`) });
  }
  if (parts.length === 0) return '\\vec 0';
  return parts.map((p, i) => (i === 0 ? `${p.negative ? '-' : ''}${p.body}` : ` ${p.negative ? '-' : '+'} ${p.body}`)).join('');
}

const exactAll = (v: Vec) => isExact(v.x, LEN) && isExact(v.y, LEN);

/** "II quadrante" (masked: "? quadrante"). */
const quadrantTex = (q: Quadrant, masked: boolean, suffix = '') =>
  hk('q', masked ? `${MASK}\\ \\text{quadrante${suffix}}` : `\\text{${ROMAN[q]} quadrante${suffix}}`);

const signTex = (n: 1 | -1) => (n > 0 ? '> 0' : '< 0');

/**
 * Mode 'polar': the data are |v⃗| and the angle (α in the first quadrant, else β with the
 * quadrant). The triangle gives the lengths; the quadrant gives the signs.
 */
function polarGroups(mod: number, angle: number, q: Quadrant, first: boolean, steps: boolean, masked: boolean): Group[] {
  const a = angleSym(first);
  const s = signsOf(q);
  const lx = mod * cosDeg(angle);
  const ly = mod * sinDeg(angle);
  const v = { x: s.x * lx, y: s.y * ly };
  const val = (n: number, key: Key) => (masked ? `= ${hk(key, MASK)}` : hk(key, rel(n, LEN)));
  const given = `${tex(mod, 1)}`;
  const cosT = `\\cos ${degTex(angle)}`;
  const senT = `${SEN} ${degTex(angle)}`;
  const groups: Group[] = [];

  if (first) {
    if (steps) {
      groups.push({
        title: 'Dal triangolo rettangolo',
        rows: [
          { id: 'cos', keys: ['ang', 'sx', 'v'], tex: `\\cos${a} = \\dfrac{\\text{adiacente}}{\\text{ipotenusa}} = \\dfrac{${SYM.sx}}{${SYM.mod}}` },
          { id: 'sen', keys: ['ang', 'sy', 'v'], tex: `${SEN}${a} = \\dfrac{\\text{opposto}}{\\text{ipotenusa}} = \\dfrac{${SYM.sy}}{${SYM.mod}}` },
        ],
      });
    }
    groups.push({
      title: 'Componenti',
      rows: [
        {
          id: 'x',
          keys: ['sx', 'v', 'ang'],
          tex: `${SYM.sx} = ${SYM.mod}\\cos${a}${steps ? ` = ${given}\\cdot ${cosT}` : ''} ${val(v.x, 'sx')}`,
        },
        {
          id: 'y',
          keys: ['sy', 'v', 'ang'],
          tex: `${SYM.sy} = ${SYM.mod}\\,${SEN}${a}${steps ? ` = ${given}\\cdot ${senT}` : ''} ${val(v.y, 'sy')}`,
        },
      ],
    });
  } else {
    if (steps) {
      groups.push({
        title: 'Dal triangolo rettangolo: lunghezze',
        rows: [
          {
            id: 'ratios',
            keys: ['ang', 'lx', 'ly', 'v'],
            tex: `\\cos${a} = \\dfrac{${SYM.lx}}{${SYM.mod}},\\qquad ${SEN}${a} = \\dfrac{${SYM.ly}}{${SYM.mod}}`,
          },
        ],
      });
    }
    groups.push({
      title: steps ? '' : 'Lunghezze dei cateti',
      rows: [
        {
          id: 'lx',
          keys: ['lx', 'v', 'ang'],
          tex: `${SYM.lx} = ${SYM.mod}\\cos${a}${steps ? ` = ${given}\\cdot ${cosT}` : ''} ${val(lx, 'lx')}`,
        },
        {
          id: 'ly',
          keys: ['ly', 'v', 'ang'],
          tex: `${SYM.ly} = ${SYM.mod}\\,${SEN}${a}${steps ? ` = ${given}\\cdot ${senT}` : ''} ${val(ly, 'ly')}`,
        },
      ],
    });
    groups.push({
      title: 'Segni: il verso rispetto agli assi',
      rows: [
        {
          id: 'signs',
          keys: ['q', 'sx', 'sy'],
          tex: `${quadrantTex(q, false, ':')}\\quad ${SYM.sx} ${signTex(s.x)},\\ \\ ${SYM.sy} ${signTex(s.y)}`,
        },
        {
          id: 'signed-x',
          keys: ['sx', 'lx'],
          tex: `${SYM.sx} = ${s.x < 0 ? '-' : '+'}${SYM.lx} ${val(v.x, 'sx')}`,
        },
        {
          id: 'signed-y',
          keys: ['sy', 'ly'],
          tex: `${SYM.sy} = ${s.y < 0 ? '-' : '+'}${SYM.ly} ${val(v.y, 'sy')}`,
        },
      ],
    });
  }
  const rows: Row[] = [
    {
      id: 'main',
      keys: ['v', 'vx', 'vy'],
      main: true,
      tex: `${SYM.v} = ${hk('vx', `${SYM.sx}\\,${SYM.xh}`)} + ${hk('vy', `${SYM.sy}\\,${SYM.yh}`)} ${masked ? '=' : exactAll(v) ? '=' : '\\approx'} ${combination(v, masked)}`,
    },
  ];
  if (steps && !first) {
    rows.push({
      id: 'modc',
      keys: ['vx', 'vy', 'lx', 'ly'],
      tex: masked
        ? `|${SYM.vx}| = ${SYM.lx},\\quad |${SYM.vy}| = ${SYM.ly}`
        : `|${SYM.vx}| = ${SYM.lx} ${hk('lx', rel(lx, LEN))},\\quad |${SYM.vy}| = ${SYM.ly} ${hk('ly', rel(ly, LEN))}`,
    });
  }
  groups.push({ title: '', rows });
  return groups;
}

/** √(…) with the numbers, and the value: "= √25 = 5" or "= √20 ≈ 4,47". */
function modulusTail(v: Vec, steps: boolean, masked: boolean): string {
  const sq = v.x * v.x + v.y * v.y;
  const mod = Math.sqrt(sq);
  const inside = `\\sqrt{${texParen(v.x, 1)}^2 + ${texParen(v.y, 1)}^2}`;
  if (masked) return `${steps ? ` = ${inside}` : ''} = ${hk('v', MASK)}`;
  const value = isExact(mod, LEN) ? `= ${tex(mod, LEN)}` : `= \\sqrt{${tex(sq, 2)}} \\approx ${tex(mod, LEN)}`;
  return `${steps ? ` = ${inside}` : ''} ${hk('v', value)}`;
}

/**
 * Mode 'cartesian': the data are v_x and v_y. Pythagoras gives the modulus, tan⁻¹ of the
 * ratio of the lengths gives the reference angle, the signs give the quadrant.
 */
function cartesianGroups(v: Vec, first: boolean, steps: boolean, masked: boolean): Group[] {
  const a = angleSym(first);
  const info = analyse(v);
  const M = (key: Key) => hk(key, MASK);
  const modRow: Row = {
    id: 'mod',
    keys: ['v', 'sx', 'sy'],
    tex: `${SYM.mod} = \\sqrt{${SYM.sx}^2 + ${SYM.sy}^2}${modulusTail(v, steps, masked)}`,
  };

  if (info.kind === 'zero') {
    return [
      { title: 'Modulo', rows: [{ ...modRow, tex: `${SYM.mod} = \\sqrt{${SYM.sx}^2 + ${SYM.sy}^2} = ${masked ? M('v') : hk('v', '0')}` }] },
      {
        title: 'Direzione',
        rows: [{ id: 'dir', keys: ['v'], tex: `${SYM.v} = \\vec 0:\\ \\text{${masked ? '?' : 'vettore nullo, direzione non definita'}}` }],
      },
    ];
  }

  if (info.kind === 'axis') {
    const onX = info.axis === 'x';
    const sense = onX ? (info.sense > 0 ? 'verso destra' : 'verso sinistra') : info.sense > 0 ? 'verso l’alto' : 'verso il basso';
    const lead = onX ? SYM.sx : SYM.sy;
    const zeroSym = onX ? SYM.sy : SYM.sx;
    return [
      {
        title: 'Modulo',
        rows: [
          {
            id: 'mod',
            keys: ['v', onX ? 'sx' : 'sy'],
            tex: `${zeroSym} = 0:\\quad ${SYM.mod} = |${lead}| ${masked ? `= ${M('v')}` : hk('v', `= ${tex(info.mod, LEN)}`)}`,
          },
        ],
      },
      {
        title: 'Direzione',
        rows: [
          {
            id: 'dir',
            keys: ['v', 'ang'],
            tex: masked
              ? `${a} = ${M('ang')}`
              : `\\text{${onX ? 'orizzontale' : 'verticale'}, ${sense}:}\\ \\ ${a} = ${onX ? '0' : '90'}^\\circ`,
          },
          {
            id: 'why',
            keys: onX ? ['sy'] : ['sx'],
            tex: onX
              ? `\\text{nessun triangolo: } ${SYM.sy} = 0`
              : `\\text{nessun triangolo: il rapporto } ${SYM.ly}/${SYM.lx} \\text{ non esiste}`,
          },
        ],
      },
    ];
  }

  const lx = Math.abs(v.x);
  const ly = Math.abs(v.y);
  const num = first ? SYM.sy : SYM.ly;
  const den = first ? SYM.sx : SYM.lx;
  const fraction = `\\dfrac{${tex(ly, 1)}}{${tex(lx, 1)}}`;
  const groups: Group[] = [
    { title: 'Modulo: teorema di Pitagora', rows: [modRow] },
    {
      title: 'Angolo di riferimento',
      rows: [
        {
          id: 'tan',
          keys: ['ang', first ? 'sy' : 'ly', first ? 'sx' : 'lx'],
          tex:
            `\\tan${a} = \\dfrac{${num}}{${den}}` +
            (steps ? ` = ${fraction}` : '') +
            ` ${masked ? `= ${M('ang')}` : hk('ang', rel(info.ratio, TAN))}`,
        },
        {
          id: 'angle',
          keys: ['ang'],
          tex:
            `${a} = \\tan^{-1}\\!\\left(${steps ? fraction : `\\dfrac{${num}}{${den}}`}\\right)` +
            ` ${masked ? `= ${M('ang')}` : hk('ang', relDeg(info.angle))}`,
        },
      ],
    },
  ];
  if (!first) {
    const s = signsOf(info.quadrant);
    groups.push({
      title: 'Quadrante: dai segni',
      rows: [
        {
          id: 'quadrant',
          keys: ['q', 'sx', 'sy'],
          tex: `${SYM.sx} ${signTex(s.x)},\\ \\ ${SYM.sy} ${signTex(s.y)}\\ \\Rightarrow\\ ${quadrantTex(info.quadrant, masked)}`,
        },
      ],
    });
  }
  return groups;
}

export function formulaGroups(
  mode: Mode,
  tip: Vec,
  polar: { mod: number; angle: number; quadrant: Quadrant } | null,
  o: { first: boolean; steps: boolean; masked: boolean },
): Group[] {
  if (mode === 'polar' && polar) return polarGroups(polar.mod, polar.angle, polar.quadrant, o.first, o.steps, o.masked);
  return cartesianGroups(tip, o.first, o.steps, o.masked);
}

/** Short remarks for the configuration on screen, at most two, as text with $TeX$ pieces. */
export function notes(mode: Mode, tip: Vec, o: { first: boolean; masked: boolean }): string[] {
  const info = analyse(tip);
  const out: string[] = [];
  const a = angleSym(o.first);
  if (mode === 'polar') {
    if (o.first) {
      out.push(`Nel primo quadrante $${SYM.sx}$ e $${SYM.sy}$ sono positivi: coincidono con le lunghezze dei cateti.`);
    } else if (info.kind === 'quadrant' && info.quadrant === 1) {
      out.push(`Nel primo quadrante $${a}$ è l’angolo fra $${SYM.v}$ e il semiasse $x$ positivo, cioè l’angolo $\\alpha$.`);
    } else {
      out.push(
        `Il triangolo dà lunghezze, sempre positive. Il segno di $${SYM.sx}$ e di $${SYM.sy}$ dice il verso delle proiezioni rispetto agli assi.`,
      );
    }
    return out;
  }
  if (info.kind === 'zero') return [`Il vettore nullo ha modulo $0$: non ha una direzione da descrivere con un angolo.`];
  if (info.kind === 'axis') {
    out.push(
      info.axis === 'y'
        ? `Con $${SYM.sx} = 0$ non c’è un triangolo e il rapporto non si può calcolare: la direzione si legge direttamente, il vettore è verticale.`
        : `Con $${SYM.sy} = 0$ non c’è un triangolo: il vettore è orizzontale e il suo modulo è $|${SYM.sx}|$.`,
    );
    return out;
  }
  if (o.masked) return [];
  if (o.first) {
    out.push(`Nel primo quadrante $${SYM.sx}$ e $${SYM.sy}$ sono positivi: il tasto $\\tan^{-1}$ della calcolatrice dà direttamente $${a}$.`);
    return out;
  }
  const calc = calculatorAngle(tip);
  const q = info.quadrant;
  if (calc !== null && (q === 2 || q === 4)) {
    const twin = `(${tex(-tip.x, 1)};\\ ${tex(-tip.y, 1)})`;
    out.push(
      `Con $\\tan^{-1}\\!\\big(${SYM.sy}/${SYM.sx}\\big)$ la calcolatrice darebbe $${degTex(calc)}$: un angolo negativo, che vale anche per il vettore opposto $${twin}$. Per questo $${a}$ si calcola con le lunghezze, e il quadrante si legge dai segni.`,
    );
  } else if (q === 3) {
    out.push(
      `Il rapporto $${SYM.sy}/${SYM.sx}$ è positivo, come per il vettore opposto $(${tex(-tip.x, 1)};\\ ${tex(-tip.y, 1)})$ del primo quadrante: il tasto $\\tan^{-1}$ non distingue i due vettori. Il quadrante si legge dai segni.`,
    );
  } else {
    out.push(`Nel primo quadrante $${a}$ coincide con l’angolo $\\alpha$ fra $${SYM.v}$ e il semiasse $x$ positivo.`);
  }
  return out;
}

/** The keys named by the hk-classes of an element. */
export function keysOf(classes: Iterable<string>): Key[] {
  return [...classes].filter((c) => c.startsWith('hk-')).map((c) => c.slice(3) as Key);
}
