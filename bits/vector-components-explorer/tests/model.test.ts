/** The arrow, its components, translations and the formulas built from them. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  componentSegments,
  componentsOf,
  INITIAL,
  magnitude,
  projections,
  situation,
  translateTo,
  withComponents,
} from '../src/model/arrow.ts';
import { vec } from '../src/model/vec.ts';
import { formulaGroups, keysOf, notes } from '../src/ui/formulas.ts';

const arrow = (ax: number, ay: number, bx: number, by: number) => ({
  A: vec(ax, ay),
  B: vec(bx, by),
});
/** TeX without the \htmlClass{…}{…} wrappers (colour, highlighting), masks as "?". */
function plain(tex: string): string {
  let out = '';
  for (let i = 0; i < tex.length; ) {
    if (tex.startsWith('\\htmlClass{', i)) {
      const close = tex.indexOf('}', i);
      const name = tex.slice(i + 11, close);
      // Skip the class and the opening brace of the body; drop the matching closing brace.
      let depth = 1;
      let j = close + 2;
      const start = j;
      for (; j < tex.length && depth > 0; j += 1) {
        if (tex[j] === '{') depth += 1;
        if (tex[j] === '}') depth -= 1;
      }
      const body = tex.slice(start, j - 1);
      out += name === 'mask' ? '?' : plain(body);
      i = j;
    } else {
      out += tex[i];
      i += 1;
    }
  }
  return out;
}
const all = (s: ReturnType<typeof arrow>, masked = false) =>
  formulaGroups(s, masked)
    .flatMap((g) => g.rows.map((r) => plain(r.tex)))
    .join('\n');

test('components are tip minus tail, and B only when the tail is at the origin', () => {
  assert.deepEqual(componentsOf(INITIAL), { x: 4, y: 3 });
  assert.equal(magnitude(INITIAL), 5);
  assert.notDeepEqual(INITIAL.B, componentsOf(INITIAL));
  const atOrigin = translateTo(INITIAL, vec(0, 0));
  assert.deepEqual(atOrigin.B, componentsOf(atOrigin));
});

test('a rigid translation changes the points and not the vector', () => {
  for (const A of [vec(-7, 3), vec(0.3, -0.1), vec(12, -9)]) {
    const moved = translateTo(INITIAL, A);
    assert.deepEqual(componentsOf(moved), componentsOf(INITIAL));
    assert.equal(magnitude(moved), magnitude(INITIAL));
    assert.notDeepEqual(moved.B, INITIAL.B);
  }
});

test('moving only the tip or only the tail changes the vector', () => {
  const tip = withComponents(INITIAL, vec(-2, 5));
  assert.deepEqual(tip.A, INITIAL.A);
  assert.deepEqual(componentsOf(tip), { x: -2, y: 5 });
  const tail = { A: vec(3, 3), B: INITIAL.B };
  assert.deepEqual(componentsOf(tail), { x: 2, y: 1 });
});

test('the four quadrants, the axes and the zero vector', () => {
  assert.deepEqual(situation(vec(2, 1)), { kind: 'quadrant', quadrant: 1 });
  assert.deepEqual(situation(vec(-2, 1)), { kind: 'quadrant', quadrant: 2 });
  assert.deepEqual(situation(vec(-2, -1)), { kind: 'quadrant', quadrant: 3 });
  assert.deepEqual(situation(vec(2, -1)), { kind: 'quadrant', quadrant: 4 });
  assert.deepEqual(situation(vec(-3, 0)), { kind: 'axis', axis: 'x' });
  assert.deepEqual(situation(vec(0, 0.1)), { kind: 'axis', axis: 'y' });
  assert.deepEqual(situation(componentsOf(arrow(0.3, 0.7, 0.3, 0.7))), { kind: 'zero' });
  assert.deepEqual(situation(componentsOf(arrow(0.1, 0.2, 0.4, 0.2))), {
    kind: 'axis',
    axis: 'x',
  });
});

test('components drawn at the arrow: tip-to-tail triangle or common-tail rectangle', () => {
  const s = arrow(-2, 3, 1, -1);
  const t = componentSegments(s, 'tip-to-tail');
  assert.deepEqual(t.x, [s.A, vec(1, 3)]);
  assert.deepEqual(t.y, [vec(1, 3), s.B]);
  const c = componentSegments(s, 'common-tail');
  assert.deepEqual(c.x, [s.A, vec(1, 3)]);
  assert.deepEqual(c.y, [s.A, vec(-2, -1)]);
  // Their sum is v⃗ in both constructions.
  for (const k of [t, c]) {
    const dx = k.x[1].x - k.x[0].x + (k.y[1].x - k.y[0].x);
    const dy = k.x[1].y - k.x[0].y + (k.y[1].y - k.y[0].y);
    assert.deepEqual({ x: dx, y: dy }, componentsOf(s));
  }
  assert.deepEqual(projections(s).x, [vec(-2, 0), vec(1, 0)]);
  assert.deepEqual(projections(s).y, [vec(0, 3), vec(0, -1)]);
});

test('formulas carry signs, parentheses and exact or approximate values', () => {
  const f = all(arrow(-2, 3, 1, -1));
  assert.match(f, /x_B - x_A = 1 - \(-2\) = 3$/m);
  assert.match(f, /y_B - y_A = -1 - 3 = -4$/m);
  assert.match(f, /^\\vec v_x = v_x\\,\\hat x = 3\\hat x$/m);
  assert.match(f, /^\\vec v_y = v_y\\,\\hat y = -4\\hat y$/m);
  assert.match(f, /^\\vec v = 3\\hat x - 4\\hat y$/m);
  assert.match(f, /\^2\} = 5$/m);
  // The modulus of a vector component is the absolute value of the scalar component.
  assert.match(f, /\|\\vec v_x\| = \|v_x\| = 3;\\quad \|\\vec v_y\| = \|v_y\| = 4$/m);
  assert.match(all(arrow(0, 0, 2, 4)), /= \\sqrt\{20\} \\approx 4\{,\}47/);
  assert.match(all(arrow(1, 1, 1, 1)), /^\\vec v = \\vec 0$/m);
  assert.match(all(arrow(0, 0, -1, 1)), /^\\vec v = -\\hat x \+ \\hat y$/m);
  assert.match(all(arrow(0, 0, 0, -2.5)), /^\\vec v = -2\{,\}5\\hat y$/m);
  assert.doesNotMatch(all(arrow(0.1, 0.2, 0.4, 0.2)), /-0(?![{,\d])/);
});

test('masked formulas keep the symbols and the given coordinates, not the computed values', () => {
  const f = all(INITIAL, true);
  assert.match(f, /x_B - x_A = 5 - 1 = \?$/m);
  assert.match(f, /^\\vec v = \?\\,\\hat x \+ \?\\,\\hat y$/m);
  assert.doesNotMatch(f, /= -?\d+(\{,\}\d+)?$/m, 'no computed value ends a line');
  assert.doesNotMatch(f, /= \d\\hat/, 'no computed coefficient');
  assert.doesNotMatch(f, /\|v_x\| = \d/);
});

test('every symbol and term is highlightable by the object it names', () => {
  const tex = formulaGroups(arrow(0, 0, -3, 2), false).flatMap((g) => g.rows.map((r) => r.tex)).join('\n');
  for (const key of ['v', 'vx', 'vy', 'sx', 'sy', 'xh', 'yh']) assert.ok(tex.includes(`\\htmlClass{hk-${key}}`), key);
  // In −3x̂ the term is the vector component and 3 the (magnitude of the) scalar coefficient.
  assert.match(tex, /\\htmlClass\{hk-vx\}\{\\htmlClass\{hk-sx\}\{\\htmlClass\{c-x\}\{3\}\}\\htmlClass\{hk-xh\}/);
  assert.deepEqual(keysOf(['formula', 'hk-sx']), ['sx']);
});

test('remarks for negative components, axes, the origin and the zero vector', () => {
  assert.equal(notes(INITIAL, false).length, 0);
  assert.match(notes(arrow(0, 0, -3, 2), false).join(), /Coda nell’origine/);
  assert.match(notes(arrow(0, 0, -3, 2), false).join(), /verso opposto/);
  assert.match(notes(arrow(1, 1, 4, 1), false).join(), /parallelo all’asse \$x\$/);
  assert.match(notes(arrow(2, 2, 2, 2), false).join(), /vettore nullo/);
  assert.equal(notes(arrow(0, 0, -3, -2), false).length, 2);
  assert.equal(notes(arrow(1, 0, -3, -2), true).length, 0);
  assert.equal(notes(arrow(0, 0, -3, 2), true).length, 0, 'no hint at a hidden value');
  assert.equal(notes(arrow(2, 2, 2, 2), true).length, 0);
});

test('every formula and remark is valid KaTeX', async () => {
  const { default: katex } = await import('katex');
  const render = (t: string) =>
    katex.renderToString(t, { throwOnError: true, strict: 'ignore', trust: (c) => c.command === '\\htmlClass' });
  for (const s of [INITIAL, arrow(0, 0, -3, 0), arrow(2, 2, 2, 2), arrow(0.1, -0.3, -2.4, 1)]) {
    for (const masked of [false, true]) {
      for (const g of formulaGroups(s, masked)) for (const r of g.rows) render(r.tex);
      for (const n of notes(s, masked)) n.split('$').forEach((part, i) => i % 2 === 1 && render(part));
    }
  }
});
