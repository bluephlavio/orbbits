/**
 * Geometry and motion of the wheel and the ball. Pure, so that it can be tested: the ball must
 * end exactly in the pocket the session drew, whatever the speed and wherever it started.
 *
 * Angles are in degrees, clockwise from the top. The wheel turns clockwise; the ball is described
 * by its angle *relative to the wheel*, so once it has dropped into a pocket it turns with it.
 */
import { POCKETS, WHEEL_ORDER } from '../game/rules.ts';
import type { Pocket } from '../game/rules.ts';

export const SLICE = 360 / POCKETS;

/** Radii in the wheel's own units (viewBox 400 × 400, centre at 200, 200). */
export const R = {
  rim: 198,
  trackOuter: 186,
  track: 174,
  trackInner: 160,
  numbersOuter: 160,
  numbers: 147,
  numbersInner: 133,
  pocketsInner: 108,
  pocket: 120.5,
  hub: 108,
  ball: 7.2,
} as const;

export const pocketAngle = (pocket: Pocket) => WHEEL_ORDER.indexOf(pocket as (typeof WHEEL_ORDER)[number]) * SLICE;

export const mod360 = (a: number) => ((a % 360) + 360) % 360;

export interface BallPose {
  /** Wheel rotation. */
  wheel: number;
  /** Ball angle relative to the wheel. */
  ball: number;
  /** Ball distance from the centre. */
  radius: number;
}

export interface SpinPlan {
  from: BallPose;
  /** Total clockwise turn of the wheel. */
  wheelTurn: number;
  /** Relative angle at which the ball rests: the pocket's angle, minus whole turns. */
  ballTo: number;
}

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** When the ball leaves the track, and when it has found its pocket. */
const DROP = 0.5;
const LAND = 0.8;

/**
 * Plans a spin from the current pose to `pocket`. `jitter` ∈ [0, 1)³ varies the look of the spin
 * (wheel speed, ball turns, landing wobble) and never its result.
 */
export function planSpin(from: BallPose, pocket: Pocket, jitter: readonly [number, number, number]): SpinPlan {
  const wheelTurn = 160 + 120 * jitter[0];
  // The ball runs counter-clockwise relative to the wheel: at least four turns, ending on the pocket.
  const turns = 4 + Math.floor(jitter[1] * 2);
  const target = pocketAngle(pocket);
  const ballTo = from.ball - turns * 360 - mod360(from.ball - target);
  return { from, wheelTurn, ballTo };
}

/** The pose at time t ∈ [0, 1] of a planned spin. At t = 1 the ball is at rest in its pocket. */
export function poseAt(plan: SpinPlan, t: number, wobble = 0.5): BallPose {
  const { from, wheelTurn, ballTo } = plan;
  const wheel = from.wheel + wheelTurn * easeOutCubic(t);

  // Relative angle: fast at first, slowing until it lands; then a small decaying skip on the frets.
  let ball: number;
  if (t < LAND) {
    const u = t / LAND;
    ball = from.ball + (ballTo - from.ball) * (1 - (1 - u) ** 2.4);
  } else {
    const v = (t - LAND) / (1 - LAND);
    ball = ballTo + (3 + 3 * wobble) * Math.sin(v * Math.PI * 2.5) * (1 - v) ** 2;
  }

  // Radius: out to the track, round it, spiral down with two bounces, settle.
  let radius: number;
  if (t < 0.06) radius = from.radius + (R.track - from.radius) * easeInOut(t / 0.06);
  else if (t < DROP) radius = R.track;
  else if (t < LAND) {
    const u = (t - DROP) / (LAND - DROP);
    radius = R.track + (R.pocket - R.track) * easeInOut(u) + 6 * Math.abs(Math.sin(u * Math.PI * 2)) * (1 - u);
  } else {
    const v = (t - LAND) / (1 - LAND);
    radius = R.pocket + 2.5 * Math.abs(Math.sin(v * Math.PI * 2)) * (1 - v) ** 2;
  }
  return { wheel, ball, radius };
}

/** Where the ball sits on the page, given the pose: absolute angle = wheel + relative. */
export function ballXY({ wheel, ball, radius }: BallPose) {
  const a = ((wheel + ball - 90) * Math.PI) / 180;
  return { x: 200 + radius * Math.cos(a), y: 200 + radius * Math.sin(a) };
}

/** The pocket under the ball, from its relative angle. */
export const pocketAt = (relative: number): Pocket => WHEEL_ORDER[Math.round(mod360(relative) / SLICE) % POCKETS];
