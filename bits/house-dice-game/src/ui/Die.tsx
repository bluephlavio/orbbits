/**
 * The die: a CSS 3D cube driven frame by frame. Driving it from JS rather than with CSS
 * animations lets each face be lit by where it actually points during the tumble.
 *
 * `onSettled` may fire from the animation and from its safety timer: the session ignores a
 * second call, so a throw can never be lost in a background tab or counted twice.
 */
import { useEffect, useRef } from 'react';
import { FACES } from '../game/rules.ts';
import type { Face } from '../game/rules.ts';
import type { PendingRoll } from '../game/session.ts';
import { anglesFor, hopAt, shadeOf, spinAt, throwTarget } from './dieMotion.ts';
import type { Angles } from './dieMotion.ts';

export const THROW_MS = 950;
const REDUCED_MS = 180;

/** Pip positions on a 3×3 grid, as [row, column]. */
const PIPS: Record<Face, readonly (readonly [number, number])[]> = {
  1: [[2, 2]],
  2: [[1, 3], [3, 1]],
  3: [[1, 3], [2, 2], [3, 1]],
  4: [[1, 1], [1, 3], [3, 1], [3, 3]],
  5: [[1, 1], [1, 3], [2, 2], [3, 1], [3, 3]],
  6: [[1, 1], [1, 3], [2, 1], [2, 3], [3, 1], [3, 3]],
};

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

interface Props {
  /** The throw in progress, or null at rest. */
  roll: PendingRoll | null;
  /** The face resting on top when no throw is in progress. */
  face: Face;
  onSettled: (id: number) => void;
}

export default function Die({ roll, face, onSettled }: Props) {
  const cube = useRef<HTMLDivElement>(null);
  const hop = useRef<HTMLDivElement>(null);
  const shadow = useRef<HTMLDivElement>(null);
  const faces = useRef(new Map<Face, HTMLDivElement>());
  const angles = useRef<Angles>(anglesFor(face));

  const paint = (current: Angles, height: number) => {
    const { x, y, z } = current;
    if (cube.current) cube.current.style.transform = `rotateX(${x}deg) rotateY(${y}deg) rotateZ(${z}deg)`;
    if (hop.current) hop.current.style.transform = `translateY(${-58 * height}%)`;
    if (shadow.current) {
      shadow.current.style.transform = `translateX(-50%) scale(${1 - 0.4 * height})`;
      shadow.current.style.opacity = String(1 - 0.62 * height);
    }
    for (const [f, element] of faces.current) {
      element.style.setProperty('--shade', shadeOf(f, current).toFixed(3));
    }
  };

  // The resting face follows the log, e.g. after a reload or a new game.
  useEffect(() => {
    if (roll) return;
    angles.current = anglesFor(face);
    paint(angles.current, 0);
  }, [face, roll]);

  const rollId = roll?.id;
  const rollFace = roll?.face;
  useEffect(() => {
    if (rollId === undefined || rollFace === undefined) return;
    const finish = () => onSettled(rollId);

    if (prefersReducedMotion()) {
      angles.current = anglesFor(rollFace);
      paint(angles.current, 0);
      const timer = setTimeout(finish, REDUCED_MS);
      return () => clearTimeout(timer);
    }

    const from = angles.current;
    const target = throwTarget(from, rollFace, [Math.random(), Math.random(), Math.random()]);
    const started = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const t = Math.min(1, (now - started) / THROW_MS);
      const spin = spinAt(t);
      paint(
        {
          x: from.x + (target.x - from.x) * spin,
          y: from.y + (target.y - from.y) * spin,
          z: from.z + (target.z - from.z) * spin,
        },
        hopAt(t),
      );
      if (t < 1) frame = requestAnimationFrame(step);
      else {
        angles.current = target;
        finish();
      }
    });
    // requestAnimationFrame stops in a hidden tab; the throw must settle regardless.
    const safety = setTimeout(() => {
      cancelAnimationFrame(frame);
      angles.current = target;
      paint(target, 0);
      finish();
    }, THROW_MS + 400);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(safety);
    };
  }, [rollId, rollFace, onSettled]);

  return (
    <div className="die-scene" aria-hidden="true">
      <div className="die-shadow" ref={shadow} />
      <div className="die-hop" ref={hop}>
        <div className="die-pose">
          <div className="die-cube" ref={cube}>
            <div className="die-core die-core-x" />
            <div className="die-core die-core-y" />
            <div className="die-core die-core-z" />
            {FACES.map((f) => (
              <div
                key={f}
                className="die-face"
                data-face={f}
                ref={(element) => {
                  if (element) faces.current.set(f, element);
                }}
              >
                {PIPS[f].map(([row, column]) => (
                  <i key={`${row}${column}`} style={{ gridArea: `${row} / ${column}` }} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
