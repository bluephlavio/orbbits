/** The shared core: vector arithmetic, number formatting, arrow geometry, label placement. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { add, clean, length, scale, sign, snap, sub, vec } from '../src/model/vec.ts';
import { arrowShape, collinearOverlap, stackTracks } from '../src/ui/arrow.ts';
import { tex, texCombination, texParen, texValue, text, textValue } from '../src/ui/format.ts';
import {
  aroundPoint,
  besideSegment,
  placeLabels,
  rectOverlap,
  segmentRectDistance,
} from '../src/ui/labels.ts';
import { centeredView, fitView, toMath, toPx } from '../src/ui/view.ts';

test('floating-point noise and negative zero are removed', () => {
  assert.equal(clean(0.1 + 0.2), 0.3);
  assert.ok(Object.is(clean(-0), 0));
  assert.ok(Object.is(clean(-1e-17), 0));
  assert.deepEqual(sub(vec(0.3, 0.7), vec(0.1, 0.7)), { x: 0.2, y: 0 });
  assert.ok(Object.is(sub(vec(2, 3), vec(2, 3)).x, 0));
  assert.ok(Object.is(scale(vec(0, 2), -1).x, 0));
  assert.equal(snap(2.449, 0.1), 2.4);
  assert.ok(Object.is(snap(-0.04, 0.1), 0));
  assert.equal(sign(1e-12), 0);
  assert.equal(length(vec(3, -4)), 5);
  assert.deepEqual(add(vec(-1.1, 2.2), vec(1.1, -2.2)), { x: 0, y: 0 });
});

test('numbers are Italian, with a true minus and never −0', () => {
  assert.equal(text(-3.5), '−3,5');
  assert.equal(text(-0.04), '0');
  assert.equal(text(-0), '0');
  assert.equal(text(2.0), '2');
  assert.equal(tex(-3.5), '-3{,}5');
  assert.equal(tex(-0.001, 2), '0');
  assert.equal(texParen(-2), '(-2)');
  assert.equal(texParen(2), '2');
  assert.equal(texValue(5), '= 5');
  assert.equal(texValue(Math.sqrt(20)), '\\approx 4{,}47');
  assert.equal(textValue(Math.sqrt(2)), '≈ 1,41');
  assert.equal(texValue(2.5), '= 2{,}5');
});

test('linear combinations drop unit and zero coefficients', () => {
  const X = '\\hat x';
  const Y = '\\hat y';
  assert.equal(texCombination([[4, X], [-3, Y]]), '4\\hat x - 3\\hat y');
  assert.equal(texCombination([[1, X], [1, Y]]), '\\hat x + \\hat y');
  assert.equal(texCombination([[-1, X], [0, Y]]), '-\\hat x');
  assert.equal(texCombination([[0, X], [-2.5, Y]]), '-2{,}5\\hat y');
  assert.equal(texCombination([[0, X], [0, Y]]), '\\vec 0');
  assert.equal(texCombination([[-0.0001, X], [0, Y]]), '\\vec 0');
});

test('the view maps the plane to pixels and back, with y up', () => {
  const view = centeredView(800, 600, 5);
  assert.equal(view.scale, 60);
  assert.deepEqual(toPx(view, { x: 0, y: 0 }), { x: 400, y: 300 });
  assert.deepEqual(toPx(view, { x: 1, y: 1 }), { x: 460, y: 240 });
  const p = toMath(view, toPx(view, { x: -2.5, y: 3 }));
  assert.ok(Math.abs(p.x + 2.5) < 1e-12 && Math.abs(p.y - 3) < 1e-12);
  const fit = fitView(1000, 500, { xmin: -5, xmax: 15, ymin: -1, ymax: 9 }, 0);
  assert.equal(fit.scale, 50);
  assert.deepEqual(toPx(fit, { x: -5, y: -1 }), { x: 0, y: 500 });
});

test('the head of an arrow ends exactly at the tip', () => {
  const s = arrowShape({ x: 10, y: 10 }, { x: 110, y: 10 }, 3);
  assert.ok(s.head!.startsWith('M110 10'));
  assert.ok(s.shaft![1].x < 110 && s.shaft![1].x > 90);
  const short = arrowShape({ x: 0, y: 0 }, { x: 0, y: -8 }, 3);
  assert.ok(!short.point && short.head);
  assert.ok(arrowShape({ x: 5, y: 5 }, { x: 5.2, y: 5 }, 3).point);
});

test('coincident arrows are moved to parallel tracks', () => {
  const v = [
    { x: 0, y: 100 },
    { x: 200, y: 100 },
  ] as const;
  assert.ok(collinearOverlap(v, [{ x: 0, y: 100 }, { x: 80, y: 100 }]));
  assert.ok(collinearOverlap(v, [{ x: 150, y: 100 }, { x: 60, y: 101 }]));
  assert.ok(!collinearOverlap(v, [{ x: 200, y: 100 }, { x: 300, y: 100 }]));
  assert.ok(!collinearOverlap(v, [{ x: 0, y: 90 }, { x: 80, y: 90 }]));
  const tracks = stackTracks([
    { key: 'v', seg: v, width: 4 },
    { key: 'vx', seg: v, width: 3 },
    { key: 'xh', seg: [{ x: 0, y: 100 }, { x: 50, y: 100 }], width: 3 },
  ]);
  const [vx0] = tracks.get('vx')!;
  const [xh0] = tracks.get('xh')!;
  assert.ok(vx0.y < 100 - 3, 'moved up, clear of v');
  assert.ok(xh0.y < vx0.y - 2.9, 'moved past both');
  assert.deepEqual(tracks.get('v')![0], { x: 0, y: 100 });
});

test('labels avoid each other, the drawing and the edges', () => {
  const seg = [
    { x: 100, y: 300 },
    { x: 400, y: 300 },
  ] as const;
  const requests = [
    { id: 'a', w: 30, h: 30, candidates: besideSegment(seg[0], seg[1], 30, 30, 4), priority: 0 },
    { id: 'b', w: 30, h: 30, candidates: besideSegment(seg[0], seg[1], 30, 30, 4), priority: 1 },
  ];
  const result = placeLabels(
    requests,
    [{ kind: 'segment', a: seg[0], b: seg[1], r: 4, weight: 3 }],
    { x0: 0, y0: 0, x1: 600, y1: 600 },
  );
  const a = result.get('a')!;
  const b = result.get('b')!;
  assert.equal(a.cy, 300 - 15 - 4, 'above the middle, its first choice');
  const ra = { cx: a.cx, cy: a.cy, w: 30, h: 30 };
  const rb = { cx: b.cx, cy: b.cy, w: 30, h: 30 };
  assert.equal(rectOverlap(ra, rb), 0);
  assert.ok(segmentRectDistance(seg[0], seg[1], rb) >= 4 - 1e-9);
  // Near an edge the label goes to another side instead of off the stage.
  const edge = placeLabels(
    [
      {
        id: 'c',
        w: 40,
        h: 20,
        candidates: aroundPoint({ x: 5, y: 5 }, 40, 20, 4, { x: -1, y: -1 }),
        priority: 0,
      },
    ],
    [],
    { x0: 0, y0: 0, x1: 300, y1: 300 },
  ).get('c')!;
  assert.ok(edge.cx - 20 >= 0 && edge.cy - 10 >= 0);
});

test('an optional label with nowhere to go is hidden', () => {
  const block = { kind: 'rect' as const, rect: { cx: 50, cy: 50, w: 400, h: 400 }, weight: 10 };
  const r = placeLabels(
    [{ id: 'o', w: 10, h: 10, candidates: [{ x: 50, y: 50 }], priority: 0, optional: true }],
    [block],
    { x0: 0, y0: 0, x1: 100, y1: 100 },
  );
  assert.equal(r.get('o')!.hidden, true);
});
