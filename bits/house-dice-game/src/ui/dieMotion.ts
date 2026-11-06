/**
 * Geometry of the die: which rotation shows which face, how a throw reaches it, and how light
 * falls on each face. Pure, so that "the die shows the logged face" can be tested.
 *
 * Rotation conventions are CSS's: x right, y down, z towards the viewer, and the transform
 * `rotateX(x) rotateY(y) rotateZ(z)` applied to the cube inside a fixed pose.
 */
import type { Face } from '../game/rules.ts';

export interface Angles {
  x: number;
  y: number;
  z: number;
}

type Vector = readonly [number, number, number];

/** Where each face sits on the cube; opposite faces sum to 7, as on a real die. */
export const FACE_NORMALS: Record<Face, Vector> = {
  1: [0, 0, 1],
  6: [0, 0, -1],
  3: [1, 0, 0],
  4: [-1, 0, 0],
  2: [0, -1, 0],
  5: [0, 1, 0],
};

/** The rotation (modulo full turns) that brings each face towards the viewer. */
const FRONT: Record<Face, { x: number; y: number }> = {
  1: { x: 0, y: 0 },
  6: { x: 0, y: 180 },
  3: { x: 0, y: -90 },
  4: { x: 0, y: 90 },
  2: { x: -90, y: 0 },
  5: { x: 90, y: 0 },
};

export const POSE = { x: -17, y: 20 } as const;

export const anglesFor = (face: Face): Angles => ({ ...FRONT[face], z: 0 });

const mod360 = (a: number) => ((a % 360) + 360) % 360;

/**
 * The target of a throw from `from`: the same residues as `face`, at least `minTurns` full
 * turns away on each axis so that the die visibly tumbles, whatever the previous face.
 * `spin` (0–1 values) varies direction and turns from throw to throw.
 */
export function throwTarget(from: Angles, face: Face, spin: readonly number[], minTurns = 2): Angles {
  const front = anglesFor(face);
  const axis = (current: number, target: number, r: number) => {
    const direction = r < 0.5 ? 1 : -1;
    const turns = (r * 2) % 1 > 0.5 ? minTurns + 1 : minTurns;
    const delta = mod360(direction * (target - current));
    return current + direction * (delta + turns * 360);
  };
  return {
    x: axis(from.x, front.x, spin[0]),
    y: axis(from.y, front.y, spin[1]),
    z: axis(from.z, front.z, spin[2]),
  };
}

const rad = (deg: number) => (deg * Math.PI) / 180;

const rotateX = ([x, y, z]: Vector, a: number): Vector => {
  const c = Math.cos(rad(a));
  const s = Math.sin(rad(a));
  return [x, y * c - z * s, y * s + z * c];
};

const rotateY = ([x, y, z]: Vector, a: number): Vector => {
  const c = Math.cos(rad(a));
  const s = Math.sin(rad(a));
  return [x * c + z * s, y, -x * s + z * c];
};

const rotateZ = ([x, y, z]: Vector, a: number): Vector => {
  const c = Math.cos(rad(a));
  const s = Math.sin(rad(a));
  return [x * c - y * s, x * s + y * c, z];
};

/** A cube-space vector as seen with the cube at `angles`, before the pose. */
export const applyAngles = (v: Vector, { x, y, z }: Angles): Vector =>
  rotateX(rotateY(rotateZ(v, z), y), x);

/** A cube-space vector as the viewer sees it. */
export const toView = (v: Vector, angles: Angles, jitter = 0): Vector =>
  rotateZ(rotateY(rotateX(applyAngles(v, angles), POSE.x), POSE.y), jitter);

/** Unit vector towards the light: above, slightly left, mostly from the viewer's side. */
const LIGHT: Vector = [-0.22, -0.38, 0.9];
const AMBIENT = 0.68;

/** Black overlay opacity for a face at these angles: 0 fully lit, higher in shadow. */
export function shadeOf(face: Face, angles: Angles, jitter = 0): number {
  const [x, y, z] = toView(FACE_NORMALS[face], angles, jitter);
  const lit = Math.max(0, x * LIGHT[0] + y * LIGHT[1] + z * LIGHT[2]);
  return (1 - AMBIENT) * (1 - lit);
}

/** Hop height over the throw, t in 0–1: three decaying parabolic bounces, then rest. */
export function hopAt(t: number): number {
  const bounce = (from: number, to: number, height: number) => {
    const u = (t - from) / (to - from);
    return height * 4 * u * (1 - u);
  };
  if (t < 0.54) return bounce(0, 0.54, 1);
  if (t < 0.8) return bounce(0.54, 0.8, 0.24);
  if (t < 0.94) return bounce(0.8, 0.94, 0.06);
  return 0;
}

/** Rotation progress over the throw: fast from the hand, slowing to a stop on the table. */
export const spinAt = (t: number) => 1 - (1 - Math.min(1, t / 0.96)) ** 2.6;
