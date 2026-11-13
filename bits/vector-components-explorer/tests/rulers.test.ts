/** The scalar rulers: zero under the tail, the point under the tip, oriented like the versors. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { rulers } from '../src/ui/rulers.ts';
import { centeredView, toPx } from '../src/ui/view.ts';

const view = centeredView(600, 500, 7, 14);
const em = 20;
const widths = { x: 40, y: 40 };

test('the point of each ruler is the scalar component, measured from the tail', () => {
  for (const [A, B] of [
    [{ x: 1, y: 1 }, { x: 5, y: 4 }],
    [{ x: 3, y: -2 }, { x: -2, y: 1 }],
    [{ x: -4, y: 5 }, { x: -4, y: -1 }],
  ]) {
    const [rx, ry] = rulers(view, A, B, em, widths);
    assert.ok(Math.abs(rx.zero.x - toPx(view, A).x) < 1e-9, 'x zero under the tail');
    assert.ok(Math.abs((rx.point.x - rx.zero.x) / view.scale - (B.x - A.x)) < 1e-9);
    assert.ok(Math.abs((ry.zero.y - ry.point.y) / view.scale - (B.y - A.y)) < 1e-9, 'y up');
    // The versor is one unit in the positive sense, whatever the sign of the component.
    assert.ok(Math.abs(rx.versor[1].x - rx.versor[0].x - view.scale) < 1e-9);
    assert.ok(Math.abs(ry.versor[0].y - ry.versor[1].y - view.scale) < 1e-9);
    assert.ok(rx.ticks.some((t) => t.zero) && ry.ticks.some((t) => t.zero));
  }
});

test('rulers sit outside the plane and keep their labels inside themselves', () => {
  const [rx, ry] = rulers(view, { x: 8, y: 6 }, { x: -6, y: -6 }, em, widths);
  assert.equal(rx.area.y, view.height);
  assert.equal(ry.area.x, view.width);
  for (const l of rx.labels) assert.ok(l.x >= 0 && l.x <= view.width && l.y >= rx.area.y, l.id);
  for (const l of ry.labels) assert.ok(l.x >= ry.area.x && l.y >= 0 && l.y <= view.height, l.id);
  // The versor label moves to the other side when there is no room after the tip.
  const x = rx.labels.find((l) => l.id === 'rx-versor')!;
  assert.ok(x.x < rx.zero.x);
});

test('zero is not labelled twice when the component is (nearly) zero', () => {
  const [rx, ry] = rulers(view, { x: 1, y: 1 }, { x: 1, y: 1 }, em, widths);
  assert.ok(!rx.labels.some((l) => l.role === 'zero'));
  assert.ok(!ry.labels.some((l) => l.role === 'zero'));
  assert.deepEqual(rx.point, rx.zero);
});
