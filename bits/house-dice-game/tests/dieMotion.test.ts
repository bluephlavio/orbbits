import assert from 'node:assert/strict';
import test from 'node:test';
import { FACES } from '../src/game/rules.ts';
import {
  anglesFor,
  applyAngles,
  FACE_NORMALS,
  hopAt,
  shadeOf,
  spinAt,
  throwTarget,
  toView,
} from '../src/ui/dieMotion.ts';

const assertFacesViewer = (normal: readonly number[]) => {
  assert.ok(Math.abs(normal[0]) < 1e-9 && Math.abs(normal[1]) < 1e-9, `${normal}`);
  assert.ok(normal[2] > 0.999, `${normal}`);
};

test('opposite faces sum to 7', () => {
  for (const face of FACES) {
    const opposite = (7 - face) as typeof face;
    const [a, b] = [FACE_NORMALS[face], FACE_NORMALS[opposite]];
    assert.deepEqual([a[0] + b[0], a[1] + b[1], a[2] + b[2]], [0, 0, 0]);
  }
});

test('the rotation for each face brings exactly that face to the viewer', () => {
  for (const face of FACES) assertFacesViewer(applyAngles(FACE_NORMALS[face], anglesFor(face)));
});

test('every throw, from every face, ends on the logged face', () => {
  const spins = [
    [0.1, 0.1, 0.1],
    [0.9, 0.2, 0.6],
    [0.3, 0.8, 0.4],
    [0.7, 0.6, 0.95],
  ];
  for (const from of FACES) {
    for (const to of FACES) {
      for (const spin of spins) {
        const start = throwTarget(anglesFor(from), from, spin);
        const end = throwTarget(start, to, spin);
        assertFacesViewer(applyAngles(FACE_NORMALS[to], end));
      }
    }
  }
});

test('a throw always tumbles at least two full turns on each axis', () => {
  for (const to of FACES) {
    const end = throwTarget({ x: 0, y: 0, z: 0 }, to, [0.2, 0.7, 0.4]);
    for (const axis of ['x', 'y', 'z'] as const) {
      assert.ok(Math.abs(end[axis]) >= 720, `${axis}: ${end[axis]}`);
    }
  }
});

test('at rest the die shows three faces, and the logged face is the best lit', () => {
  for (const face of FACES) {
    const angles = anglesFor(face);
    const visible = FACES.filter((f) => toView(FACE_NORMALS[f], angles)[2] > 0);
    assert.equal(visible.length, 3);
    const brightest = visible.reduce((a, b) => (shadeOf(b, angles) < shadeOf(a, angles) ? b : a));
    assert.equal(brightest, face);
  }
});

test('the hop starts and ends on the table', () => {
  assert.equal(hopAt(0), 0);
  assert.equal(hopAt(1), 0);
  assert.ok(hopAt(0.27) > 0.9);
  for (let t = 0; t <= 1; t += 0.01) assert.ok(hopAt(t) >= -1e-9);
});

test('the spin is monotonic and lands exactly', () => {
  assert.equal(spinAt(0), 0);
  assert.equal(spinAt(1), 1);
  for (let t = 0; t < 1; t += 0.01) assert.ok(spinAt(t + 0.01) >= spinAt(t));
});
