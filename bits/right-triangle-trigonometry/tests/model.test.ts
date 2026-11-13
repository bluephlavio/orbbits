/** The triangle: sides, roles, similarity, ratios, limits, and the TeX built from them. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ALPHA_MAX,
  ALPHA_MIN,
  beta,
  BOX,
  COPY_SCALES,
  fromVertexB,
  fromVertexC,
  INITIAL,
  maxHyp,
  measuredRatios,
  normalise,
  ratios,
  roleOf,
  roles,
  scaled,
  sides,
  vertices,
} from '../src/model/triangle.ts';
import type { Reference, Triangle } from '../src/model/triangle.ts';
import { angleRow, notes, ratioRows, similarColumns } from '../src/ui/formulas.ts';

/** Equal up to float noise: values are cleaned at 1e-9, far below any digit on screen. */
const close = (a: number, b: number, eps = 1e-7) => Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b));
const ANGLES = [1, 5, 17.5, 30, 35, 44.9, 45, 45.1, 60, 72.3, 89];
const REFS: Reference[] = ['alpha', 'beta'];

test('the sides follow from the angle and the hypotenuse', () => {
  const s = sides({ alpha: 30, hyp: 10 });
  assert.equal(s.AB, 10);
  assert.equal(s.BC, 5, 'sen 30° is exactly one half');
  assert.ok(close(s.AC, 5 * Math.sqrt(3)));
  for (const alpha of ANGLES) {
    const t = { alpha, hyp: 7.3 };
    const { AB, BC, AC } = sides(t);
    assert.ok(close(BC * BC + AC * AC, AB * AB, 1e-7), `Pythagoras at ${alpha}°`);
    assert.ok(BC < AB && AC < AB, 'a leg is shorter than the hypotenuse');
    const v = vertices(t);
    assert.deepEqual(v.A, { x: 0, y: 0 });
    assert.equal(v.C.y, 0);
    assert.equal(v.B.x, v.C.x, 'the right angle is in C');
  }
});

test('opposite and adjacent depend on the reference angle; the hypotenuse does not', () => {
  assert.deepEqual(roles('alpha'), { hyp: 'AB', opp: 'BC', adj: 'AC' });
  assert.deepEqual(roles('beta'), { hyp: 'AB', opp: 'AC', adj: 'BC' });
  assert.equal(roleOf('AB', 'alpha'), 'hyp');
  assert.equal(roleOf('AB', 'beta'), 'hyp');
  assert.equal(roleOf('BC', 'alpha'), 'opp');
  assert.equal(roleOf('BC', 'beta'), 'adj');
});

test('similar triangles: the sides change with the scale, the ratios do not', () => {
  for (const alpha of ANGLES) {
    for (const ref of REFS) {
      const t = { alpha, hyp: 8 };
      const r = ratios(t, ref);
      for (const k of [...COPY_SCALES, 1, 1.7, 0.13]) {
        const m = measuredRatios(scaled(t, k), ref);
        assert.ok(close(m.sin, r.sin, 1e-6) && close(m.cos, r.cos, 1e-6) && close(m.tan, r.tan, 1e-6), `${alpha}° ×${k}`);
      }
      // Another size, the same angle: the same ratios.
      const other = ratios({ alpha, hyp: 2.4 }, ref);
      assert.deepEqual(other, r);
    }
  }
  const cols = similarColumns({ alpha: 35, hyp: 10 }, 'alpha');
  assert.deepEqual(cols.map((c) => c.k), [0.5, 0.75, 1]);
  assert.ok(close(cols[0].lengths.hyp, 5) && close(cols[1].lengths.hyp, 7.5));
  for (const c of cols) assert.ok(close(c.ratios.sin, cols[2].ratios.sin) && close(c.ratios.tan, cols[2].ratios.tan));
});

test('the ratios of acute angles: sen and cos in (0, 1), tan above 1 past 45°', () => {
  for (let alpha = ALPHA_MIN; alpha <= ALPHA_MAX; alpha += 0.5) {
    const r = ratios({ alpha, hyp: 5 }, 'alpha');
    assert.ok(r.sin > 0 && r.sin < 1 && r.cos > 0 && r.cos < 1, `${alpha}°`);
    assert.ok(r.tan > 0);
    if (alpha < 45) assert.ok(r.tan < 1);
    if (alpha > 45) assert.ok(r.tan > 1);
    assert.ok(close(r.tan, r.sin / r.cos));
  }
  assert.equal(ratios({ alpha: 45, hyp: 3 }, 'alpha').tan, 1);
  assert.equal(ratios({ alpha: 30, hyp: 3 }, 'alpha').sin, 0.5);
  assert.equal(ratios({ alpha: 60, hyp: 3 }, 'alpha').cos, 0.5);
});

test('complementary angles swap sen and cos', () => {
  for (const alpha of ANGLES) {
    const t = { alpha, hyp: 6 };
    const a = ratios(t, 'alpha');
    const b = ratios(t, 'beta');
    assert.ok(close(beta(t) + alpha, 90));
    assert.ok(close(b.sin, a.cos) && close(b.cos, a.sin), `${alpha}°`);
    assert.ok(close(a.tan * b.tan, 1, 1e-6), 'tan β = 1 / tan α');
  }
});

test('the triangle stays acute and inside the box', () => {
  assert.deepEqual(normalise({ alpha: 0, hyp: 5 }).alpha, ALPHA_MIN);
  assert.deepEqual(normalise({ alpha: 95, hyp: 5 }).alpha, ALPHA_MAX);
  assert.equal(normalise({ alpha: 35.04, hyp: 5.06 }).alpha, 35);
  for (const alpha of ANGLES) {
    const t = normalise({ alpha, hyp: 100 });
    const { B } = vertices(t);
    assert.ok(B.x <= BOX + 1e-9 && B.y <= BOX + 1e-9, `${alpha}°`);
    assert.equal(t.hyp, maxHyp(alpha));
  }
  assert.ok(normalise({ alpha: 40, hyp: 0.2 }).hyp >= 1);
});

test('dragging B moves angle and size; dragging C keeps the angle', () => {
  const b = fromVertexB({ x: 4, y: 3 }, 1, 0.1);
  assert.equal(b.alpha, 37);
  assert.equal(b.hyp, 5);
  assert.equal(fromVertexB({ x: -2, y: 3 }, 1, 0.1).alpha, ALPHA_MAX, 'never past 90°');
  assert.equal(fromVertexB({ x: 5, y: -1 }, 1, 0.1).alpha, ALPHA_MIN, 'never below 0°');
  const t: Triangle = { alpha: 30, hyp: 4 };
  const c = fromVertexC(t, 8.66, 0.1);
  assert.equal(c.alpha, 30);
  assert.equal(c.hyp, 10);
  assert.equal(fromVertexC(t, -3, 0.1).hyp, 1, 'not below the smallest triangle');
});

/** TeX without the \htmlClass{…}{…} wrappers, masks as "?". */
function plain(tex: string): string {
  let out = '';
  for (let i = 0; i < tex.length; ) {
    if (tex.startsWith('\\htmlClass{', i)) {
      const close = tex.indexOf('}', i);
      const name = tex.slice(i + 11, close);
      let depth = 1;
      let j = close + 2;
      const start = j;
      for (; j < tex.length && depth > 0; j += 1) {
        if (tex[j] === '{') depth += 1;
        if (tex[j] === '}') depth -= 1;
      }
      out += name === 'mask' ? '?' : plain(tex.slice(start, j - 1));
      i = j;
    } else {
      out += tex[i];
      i += 1;
    }
  }
  return out;
}

test('the ratio rows: words first, names on request, values with their precision', () => {
  const t = { alpha: 30, hyp: 10 };
  const rows = ratioRows(t, 'alpha', false, false);
  assert.deepEqual(rows.map((r) => r.id), ['sin', 'cos', 'tan']);
  assert.equal(rows[0].name, null, 'no names until asked');
  const sin = plain(rows[0].body);
  assert.ok(sin.includes('\\text{opposto}') && sin.includes('\\text{ipotenusa}'));
  assert.ok(sin.includes('\\dfrac{BC}{AB}'));
  assert.ok(sin.includes('\\dfrac{5}{10} = 0{,}500'), sin);
  assert.ok(plain(rows[1].body).includes('\\approx 0{,}866'));
  const named = ratioRows(t, 'beta', true, false);
  assert.ok(plain(named[0].name!).startsWith('\\operatorname{sen}\\beta'));
  assert.ok(plain(named[0].body).includes('\\dfrac{AC}{AB}'), 'opposite to β is AC');
});

test('hidden values: the legs and the ratios become "?", the hypotenuse stays', () => {
  const rows = ratioRows({ alpha: 35, hyp: 10 }, 'alpha', true, true).map((r) => plain(r.body));
  assert.ok(rows[0].includes('\\dfrac{?}{10} = ?'), rows[0]);
  assert.ok(rows[2].includes('\\dfrac{?}{?} = ?'), rows[2]);
  for (const r of rows) assert.ok(!/\d,\d|\d\{,\}\d/.test(r.replace('10', '')), r);
  for (const n of notes({ alpha: 50, hyp: 10 }, 'alpha', { names: true, copies: false, masked: true })) {
    assert.ok(!/\d\{,\}\d/.test(n), 'no value in the remarks');
  }
});

test('the remarks name what is on screen', () => {
  const at45 = notes({ alpha: 45, hyp: 5 }, 'alpha', { names: true, copies: false, masked: false });
  assert.ok(at45.some((n) => n.includes('uguali')));
  const steep = notes({ alpha: 60, hyp: 5 }, 'alpha', { names: false, copies: false, masked: false });
  assert.ok(steep.some((n) => n.includes('supera $1$')));
  const swapped = notes(INITIAL, 'beta', { names: true, copies: true, masked: false });
  assert.equal(swapped.length, 2);
  assert.ok(swapped[1].includes('\\cos\\alpha'));
});

test('every formula is valid KaTeX', async () => {
  const { default: katex } = await import('katex');
  const render = (t: string) =>
    katex.renderToString(t, { throwOnError: true, strict: 'ignore', trust: (c) => c.command === '\\htmlClass' });
  for (const alpha of [1, 30, 35, 45, 60, 89]) {
    for (const ref of REFS) {
      for (const names of [false, true]) {
        for (const masked of [false, true]) {
          const t = { alpha, hyp: 7.5 };
          for (const r of ratioRows(t, ref, names, masked)) {
            render(r.body);
            if (r.name) render(r.name);
          }
          render(angleRow(t, ref));
          for (const c of similarColumns(t, ref)) render(c.name);
          for (const copies of [false, true]) {
            for (const n of notes(t, ref, { names, copies, masked })) {
              n.split('$').forEach((part, i) => i % 2 === 1 && render(part));
            }
          }
        }
      }
    }
  }
});
