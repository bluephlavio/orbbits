/**
 * The wheel: plain SVG, turned frame by frame. The pocket is drawn by the session before the ball
 * is launched; the motion only shows it (wheelMotion.ts). Nothing on screen depends on it until
 * the ball has stopped: the result disc in the centre appears with `resting`, after settle.
 *
 * `onSettled` may fire from the animation and from its safety timer: the session ignores a second
 * call, so a spin can never be lost in a background tab or counted twice.
 */
import { memo, useEffect, useRef } from 'react';
import { colorOf, WHEEL_ORDER } from '../game/rules.ts';
import type { Pocket } from '../game/rules.ts';
import type { PendingSpin } from '../game/session.ts';
import { ballXY, mod360, planSpin, pocketAngle, poseAt, R, SLICE } from './wheelMotion.ts';
import type { BallPose } from './wheelMotion.ts';

export const SPIN_MS = 4200;
export const FAST_MS = 1250;
const REDUCED_MS = 200;

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const polar = (radius: number, degrees: number) => {
  const a = ((degrees - 90) * Math.PI) / 180;
  return `${(200 + radius * Math.cos(a)).toFixed(2)} ${(200 + radius * Math.sin(a)).toFixed(2)}`;
};

/** An annular sector centred on `angle`, `SLICE` wide. */
const sector = (inner: number, outer: number, angle: number, inset = 0) => {
  const a0 = angle - SLICE / 2 + inset;
  const a1 = angle + SLICE / 2 - inset;
  return `M${polar(outer, a0)}A${outer} ${outer} 0 0 1 ${polar(outer, a1)}L${polar(inner, a1)}A${inner} ${inner} 0 0 0 ${polar(inner, a0)}Z`;
};

/** The static part of the wheel, drawn once. */
const Pockets = memo(function Pockets() {
  return (
    <>
      {WHEEL_ORDER.map((pocket, i) => {
        const angle = i * SLICE;
        return (
          <g key={pocket} className="pocket" data-color={colorOf(pocket)}>
            <path className="pocket-band" d={sector(R.numbersInner, R.numbersOuter, angle)} />
            <path className="pocket-well" d={sector(R.pocketsInner, R.numbersInner, angle)} />
            <text
              className="pocket-number"
              x="200"
              y={200 - R.numbers}
              transform={`rotate(${angle} 200 200)`}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {pocket}
            </text>
          </g>
        );
      })}
      <circle
        className="well-shade"
        cx="200"
        cy="200"
        r={(R.pocketsInner + R.numbersInner) / 2}
        strokeWidth={R.numbersInner - R.pocketsInner}
      />
      {WHEEL_ORDER.map((_, i) => (
        <line
          key={i}
          className="fret"
          x1="200"
          y1={200 - R.pocketsInner}
          x2="200"
          y2={200 - R.numbersInner}
          transform={`rotate(${i * SLICE + SLICE / 2} 200 200)`}
        />
      ))}
    </>
  );
});

interface Props {
  /** The spin in progress, or null at rest. */
  spin: PendingSpin | null;
  /** The pocket the ball rests in, or null before the first spin. */
  resting: Pocket | null;
  fast: boolean;
  onSettled: (id: number) => void;
}

export default function Wheel({ spin, resting, fast, onSettled }: Props) {
  const rotor = useRef<SVGGElement>(null);
  const ball = useRef<SVGGElement>(null);
  const highlight = useRef<SVGPathElement>(null);
  const pose = useRef<BallPose>({
    wheel: 0,
    ball: resting === null ? 0 : pocketAngle(resting),
    radius: resting === null ? R.track : R.pocket,
  });

  const paint = (current: BallPose) => {
    rotor.current?.setAttribute('transform', `rotate(${current.wheel.toFixed(3)} 200 200)`);
    const { x, y } = ballXY(current);
    ball.current?.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
  };

  // The resting pose follows the log, e.g. after a reload or a new session.
  useEffect(() => {
    if (spin) return;
    pose.current =
      resting === null
        ? { ...pose.current, radius: R.track }
        : { ...pose.current, ball: pocketAngle(resting), radius: R.pocket };
    paint(pose.current);
  }, [resting, spin]);

  const spinId = spin?.id;
  const spinPocket = spin?.pocket;
  useEffect(() => {
    if (spinId === undefined || spinPocket === undefined) return;
    const finish = () => onSettled(spinId);
    const from = pose.current;
    const plan = planSpin(from, spinPocket, [Math.random(), Math.random(), Math.random()]);
    const end: BallPose = { wheel: mod360(from.wheel + plan.wheelTurn), ball: mod360(plan.ballTo), radius: R.pocket };

    if (prefersReducedMotion()) {
      pose.current = end;
      paint(end);
      const timer = setTimeout(finish, REDUCED_MS);
      return () => clearTimeout(timer);
    }

    const duration = fast ? FAST_MS : SPIN_MS;
    const wobble = Math.random();
    const started = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const t = Math.min(1, (now - started) / duration);
      paint(poseAt(plan, t, wobble));
      if (t < 1) frame = requestAnimationFrame(step);
      else {
        pose.current = end;
        finish();
      }
    });
    // requestAnimationFrame stops in a hidden tab; the spin must settle regardless.
    const safety = setTimeout(() => {
      cancelAnimationFrame(frame);
      pose.current = end;
      paint(end);
      finish();
    }, duration + 500);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(safety);
    };
    // `fast` is read when a spin starts; changing it mid-spin does not restart the spin.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinId, spinPocket, onSettled]);

  const showResult = !spin && resting !== null;

  return (
    <div className="wheel" aria-hidden="true">
      <svg viewBox="0 0 400 400">
        <defs>
          <radialGradient id="isg-hub" cx="50%" cy="42%" r="60%">
            <stop offset="0" className="hub-light" />
            <stop offset="1" className="hub-dark" />
          </radialGradient>
          <radialGradient id="isg-ball" cx="35%" cy="32%" r="70%">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.6" stopColor="#f1efe9" />
            <stop offset="1" stopColor="#c9c4b8" />
          </radialGradient>
        </defs>
        <circle className="rim" cx="200" cy="200" r={R.rim} />
        <circle className="track" cx="200" cy="200" r={R.trackOuter} />
        <circle className="track-edge" cx="200" cy="200" r={R.trackInner} />
        <g ref={rotor}>
          <Pockets />
          <path
            ref={highlight}
            className="pocket-mark"
            data-visible={showResult || undefined}
            d={resting === null ? '' : sector(R.pocketsInner, R.numbersOuter, pocketAngle(resting), 0.4)}
          />
          <circle className="hub" cx="200" cy="200" r={R.hub} fill="url(#isg-hub)" />
          <circle className="hub-ring" cx="200" cy="200" r={R.hub - 14} />
          <g className="turret">
            {[0, 90, 180, 270].map((a) => (
              <path key={a} d={`M200 200L${polar(56, a - 5)}L${polar(62, a)}L${polar(56, a + 5)}Z`} />
            ))}
            <circle cx="200" cy="200" r="14" />
          </g>
        </g>
        <g ref={ball} className="ball">
          <circle className="ball-shadow" cx="1.6" cy="2.4" r={R.ball} />
          <circle r={R.ball} fill="url(#isg-ball)" />
        </g>
      </svg>
      {resting !== null && (
        <div className="result" data-visible={showResult || undefined} data-color={colorOf(resting)} key={showResult ? `r${resting}` : 'spinning'}>
          <span>{resting}</span>
        </div>
      )}
    </div>
  );
}
