import assert from 'node:assert/strict';
import test from 'node:test';
import { WHEEL_ORDER } from '../src/game/rules.ts';
import { mod360, planSpin, pocketAngle, pocketAt, poseAt, R } from '../src/ui/wheelMotion.ts';

test('pockets sit 360/37 degrees apart in wheel order', () => {
  assert.equal(pocketAngle(0), 0);
  WHEEL_ORDER.forEach((p, i) => assert.equal(pocketAt(pocketAngle(p)), p, `index ${i}`));
});

test('the ball always comes to rest in the drawn pocket, whatever the start and the jitter', () => {
  for (const pocket of WHEEL_ORDER) {
    for (const start of [0, 37.5, -720.2, 359.9]) {
      for (const jitter of [[0, 0, 0], [0.99, 0.99, 0.99], [0.3, 0.6, 0.1]] as const) {
        const plan = planSpin({ wheel: start * 2, ball: start, radius: R.track }, pocket, jitter);
        const end = poseAt(plan, 1, jitter[2]);
        assert.equal(pocketAt(end.ball), pocket);
        assert.ok(Math.abs(mod360(end.ball) - pocketAngle(pocket)) < 1e-6 || Math.abs(mod360(end.ball) - pocketAngle(pocket)) > 360 - 1e-6);
        assert.equal(end.radius, R.pocket);
      }
    }
  }
});

test('the ball turns at least four times against the wheel, and the motion starts where it was', () => {
  const from = { wheel: 10, ball: 100, radius: R.pocket };
  const plan = planSpin(from, 17, [0.5, 0.5, 0.5]);
  assert.ok(from.ball - plan.ballTo >= 4 * 360);
  const start = poseAt(plan, 0);
  assert.equal(start.wheel, from.wheel);
  assert.equal(start.ball, from.ball);
  assert.equal(start.radius, from.radius);
});

test('the ball stays between the pockets and the outer track', () => {
  const plan = planSpin({ wheel: 0, ball: 0, radius: R.pocket }, 5, [0.2, 0.7, 0.9]);
  for (let i = 0; i <= 200; i += 1) {
    const { radius } = poseAt(plan, i / 200, 0.9);
    assert.ok(radius >= R.pocket - 1e-9 && radius <= R.trackOuter - R.ball, `t=${i / 200} r=${radius}`);
  }
});
