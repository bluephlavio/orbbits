/** Angle marks: arcs the short way round, right-angle squares, bisectors. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { angleArc, arcPoints, bisector, rightAngle } from '../src/ui/marks.ts';

const close = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;

test('an arc goes from the first direction to the second, the short way', () => {
  // On screen y points down: from +x to "up" (0, −1) is anticlockwise, sweep 0.
  const up = angleArc({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }, 10)!;
  assert.ok(up.arc.startsWith('M10 0A10 10 0 0 0 0 -10'));
  assert.ok(up.sector.startsWith('M0 0L10 0A'));
  const down = angleArc({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, 10)!;
  assert.ok(down.arc.includes('0 0 1 0 10'), 'clockwise on screen: sweep 1');
});

test('no arc for a null or straight angle', () => {
  assert.equal(angleArc({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, 10), null);
  assert.equal(angleArc({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: -1, y: 0 }, 10), null);
});

test('the bisector halves the angle and the arc points lie on the arc', () => {
  const d = bisector({ x: 1, y: 0 }, { x: 0, y: -3 });
  assert.ok(close(d.x, Math.SQRT1_2) && close(d.y, -Math.SQRT1_2));
  const pts = arcPoints({ x: 5, y: 5 }, { x: 1, y: 0 }, { x: 0, y: -1 }, 4, 5);
  for (const p of pts) assert.ok(close(Math.hypot(p.x - 5, p.y - 5), 4));
  assert.ok(close(pts[0].x, 9) && close(pts[4].y, 1));
});

test('the right-angle mark is a square corner on the two sides', () => {
  assert.equal(rightAngle({ x: 10, y: 10 }, { x: -1, y: 0 }, { x: 0, y: -5 }, 4), 'M6 10L6 6L10 6');
});
