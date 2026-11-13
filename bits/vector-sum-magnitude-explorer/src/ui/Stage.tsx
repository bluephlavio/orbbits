/**
 * The diagram: a⃗ and b⃗ from a common tail O, the copy of b⃗ at the tip of a⃗ (the tip-to-tail
 * triangle), a⃗ + b⃗, the angle α, right-angle marks at 90°, optionally the parallelogram.
 *
 *   tip of a⃗ → |a⃗| (along its fixed direction)     tip of b⃗ → α and |b⃗|
 *
 * The view is fixed: it fits the largest configuration (both moduli at their maximum, any α),
 * so nothing rescales while α turns. Moduli snap to 0.5, α to whole degrees with a pull onto
 * 0°, 90° and 180°.
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent, ReactNode } from 'react';
import {
  alphaOf,
  caseOf,
  MOD_MAX,
  MOD_MIN,
  MOD_STEP,
  snapAlpha,
  snapModulus,
  sumOf,
  vectorA,
  vectorB,
} from '../model/magnitude.ts';
import type { Config } from '../model/magnitude.ts';
import { clamp, length } from '../model/vec.ts';
import type { Vec } from '../model/vec.ts';
import Arrow from './Arrow.tsx';
import { arrowShape, stackTracks } from './arrow.ts';
import { tex } from './format.ts';
import Label from './Label.tsx';
import { aroundPoint, besideSegment, placeLabels } from './labels.ts';
import type { LabelRequest, Obstacle, Rect } from './labels.ts';
import Plane from './Plane.tsx';
import { planeData } from './plane.ts';
import { useSize } from './useSize.ts';
import { fitView, toMath, toPx } from './view.ts';

export type Key = 'a' | 'b' | 's' | 'alpha';
type Handle = 'a' | 'b';

const BOX = { xmin: -MOD_MAX - 0.7, xmax: 2 * MOD_MAX + 0.7, ymin: -1.1, ymax: MOD_MAX + 0.8 };
const LABEL_SCALE: Record<string, number> = { 'lab-ghost': 0.92, 'lab-alpha': 0.9 };

export default function Stage({
  config,
  onChange,
  parallelogram,
  focus,
  onHover,
  children,
}: {
  config: Config;
  onChange: (next: Config) => void;
  parallelogram: boolean;
  focus: ReadonlySet<Key>;
  onHover: (keys: Key[] | null) => void;
  children?: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const { width, height } = useSize(box);
  const view = useMemo(() => fitView(width, height, BOX, 8), [width, height]);
  const fontPx = clamp(Math.min(width * 0.55, height) * 0.055, 16, 32);
  const [active, setActive] = useState<Handle | null>(null);
  const dragging = useRef<{ handle: Handle; offset: Vec } | null>(null);

  const [reserved, setReserved] = useState<Rect[]>([]);
  useLayoutEffect(() => {
    const element = box.current;
    if (!element) return;
    const base = element.getBoundingClientRect();
    const rects = [...element.querySelectorAll('[data-reserve]')].map((n) => {
      const r = n.getBoundingClientRect();
      return {
        cx: Math.round(r.left - base.left + r.width / 2),
        cy: Math.round(r.top - base.top + r.height / 2),
        w: Math.round(r.width + 10),
        h: Math.round(r.height + 10),
      };
    });
    setReserved((prev) => (JSON.stringify(prev) === JSON.stringify(rects) ? prev : rects));
  });

  const pointer = (e: PointerEvent): Vec => {
    const r = svg.current!.getBoundingClientRect();
    return toMath(view, { x: e.clientX - r.left, y: e.clientY - r.top });
  };
  const tipOf = (h: Handle) => (h === 'a' ? vectorA(config) : vectorB(config));
  const down = (handle: Handle) => (e: PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const p = pointer(e);
    const tip = tipOf(handle);
    // Keep the grab offset, so the tip does not jump under the finger.
    dragging.current = { handle, offset: { x: tip.x - p.x, y: tip.y - p.y } };
    setActive(handle);
  };
  const move = (e: PointerEvent) => {
    const d = dragging.current;
    if (!d) return;
    const raw = pointer(e);
    const p = { x: raw.x + d.offset.x, y: raw.y + d.offset.y };
    if (d.handle === 'a') {
      const a = snapModulus(p.x);
      if (a !== config.a) onChange({ ...config, a });
      return;
    }
    const b = snapModulus(length(p));
    const alpha = snapAlpha(alphaOf(p));
    if (b !== config.b || alpha !== config.alpha) onChange({ ...config, b, alpha });
  };
  const up = () => {
    dragging.current = null;
    setActive(null);
  };
  const key = (handle: Handle) => (e: KeyboardEvent) => {
    const big = e.shiftKey;
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: 1, ArrowDown: -1 }[e.key];
    if (step === undefined) return;
    e.preventDefault();
    if (handle === 'a') {
      onChange({ ...config, a: clamp(config.a + step * MOD_STEP, MOD_MIN, MOD_MAX) });
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      onChange({ ...config, b: clamp(config.b + step * MOD_STEP, MOD_MIN, MOD_MAX) });
    } else {
      // Left turns b⃗ away from a⃗ (α grows), as on the screen.
      onChange({ ...config, alpha: clamp(Math.round(config.alpha) - step * (big ? 10 : 1), 0, 180) });
    }
  };

  const scene = useMemo(() => {
    if (width === 0) return null;
    const P = (p: Vec) => toPx(view, p);
    const em = fontPx;
    const base = clamp(em * 0.14, 2.6, 4.4);
    const W = { a: base * 1.15, b: base * 1.15, s: base * 1.3, copy: base * 0.95 };
    const A = vectorA(config);
    const B = vectorB(config);
    const S = sumOf(config);
    const O = P({ x: 0, y: 0 });
    const items = [
      { key: 'a', seg: [O, P(A)] as const, width: W.a },
      { key: 'b', seg: [O, P(B)] as const, width: W.b },
      { key: 's', seg: [O, P(S)] as const, width: W.s },
      { key: 'b-copy', seg: [P(A), P(S)] as const, width: W.copy },
      ...(parallelogram ? [{ key: 'a-copy', seg: [P(B), P(S)] as const, width: W.copy }] : []),
    ];
    const tracks = stackTracks(items);
    const widthOf = (k: string) => items.find((i) => i.key === k)!.width;
    const kind = caseOf(config.alpha);

    // The angle: an arc, or the right-angle mark at exactly 90°.
    const minLen = Math.min(config.a, config.b) * view.scale;
    const r = clamp(minLen * 0.32, 16, 46);
    const rad = (config.alpha * Math.PI) / 180;
    const end = { x: O.x + r * Math.cos(rad), y: O.y - r * Math.sin(rad) };
    const arc =
      config.alpha > 0.5 && kind !== 'perpendicular'
        ? `M${O.x + r} ${O.y}A${r} ${r} 0 0 0 ${end.x} ${end.y}`
        : null;
    const sq = clamp(minLen * 0.2, 10, 20);
    const square = (p: Vec, u: Vec, v: Vec) =>
      `M${p.x + u.x * sq} ${p.y + u.y * sq}L${p.x + (u.x + v.x) * sq} ${p.y + (u.y + v.y) * sq}L${p.x + v.x * sq} ${p.y + v.y * sq}`;
    const right =
      kind === 'perpendicular'
        ? [square(O, { x: 1, y: 0 }, { x: 0, y: -1 }), square(P(A), { x: -1, y: 0 }, { x: 0, y: -1 })]
        : [];
    const triangle = [O, P(A), P(S)].map((p) => `${p.x},${p.y}`).join(' ');
    const para = parallelogram ? [O, P(A), P(S), P(B)].map((p) => `${p.x},${p.y}`).join(' ') : null;

    const obstacles: Obstacle[] = [];
    for (const [k, seg] of tracks) {
      const w = widthOf(k);
      if (arrowShape(seg[0], seg[1], w).point) {
        obstacles.push({ kind: 'point', p: seg[0], r: 10, weight: 3 });
        continue;
      }
      obstacles.push({ kind: 'segment', a: seg[0], b: seg[1], r: w / 2 + 3, weight: k.endsWith('copy') ? 2 : 3 });
      obstacles.push({ kind: 'point', p: seg[1], r: w * 2.2 + 4, weight: 3 });
    }
    obstacles.push({ kind: 'point', p: O, r: Math.max(r, 12), weight: 1.5 });
    for (const rect of reserved) obstacles.push({ kind: 'rect', rect, weight: 50 });

    const requests: LabelRequest[] = [];
    const labels: Record<string, { tex: string; className: string; key?: Key }> = {};
    const gap = em * 0.3;
    const label = (
      id: string,
      t: string,
      opt: { className: string; size: [number, number]; at: (w: number, h: number) => Vec[]; priority: number; key?: Key; optional?: boolean },
    ) => {
      const k = LABEL_SCALE[opt.className.split(' ').pop()!] ?? 1;
      const lw = opt.size[0] * em * k;
      const lh = opt.size[1] * em * k;
      requests.push({ id, w: lw, h: lh, candidates: opt.at(lw, lh), priority: opt.priority, optional: opt.optional });
      labels[id] = { tex: t, className: opt.className, key: opt.key };
    };
    // α first: it has the least room.
    if (config.alpha > 0.5) {
      const mid = rad / 2;
      const dir = { x: Math.cos(mid), y: -Math.sin(mid) };
      const deg = kind === 'perpendicular' ? sq * 1.45 : r;
      label('alpha', `\\alpha`, {
        className: 'lab-alpha',
        size: [0.75, 1.05],
        priority: -1,
        key: 'alpha',
        at: (lw, lh) => {
          const reach = (f: number) => deg * f + Math.abs(dir.x) * lw / 2 + Math.abs(dir.y) * lh / 2 + 3;
          return [1, 1.35, 1.8, 2.4].map((f) => ({ x: O.x + dir.x * reach(f), y: O.y + dir.y * reach(f) }));
        },
      });
    }
    const along = (k: string, t: string, cls: string, size: [number, number], priority: number, keyOf: Key, side: 1 | -1, optional = false) => {
      const seg = tracks.get(k)!;
      const zero = Math.hypot(seg[1].x - seg[0].x, seg[1].y - seg[0].y) < 1;
      label(k, t, {
        className: cls,
        size,
        priority,
        key: keyOf,
        optional,
        at: (lw, lh) =>
          zero
            ? aroundPoint(seg[0], lw, lh, gap * 3, { x: 0, y: 1 })
            : [
                ...besideSegment(seg[0], seg[1], lw, lh, gap, { side }),
                ...aroundPoint(seg[1], lw, lh, gap * 2, { x: seg[1].x - seg[0].x, y: seg[1].y - seg[0].y }),
              ],
      });
    };
    along('s', '\\vec a + \\vec b', 'lab-s', [3.3, 1.5], 0, 's', 1);
    along('a', '\\vec a', 'lab-a', [1.05, 1.5], 1, 'a', -1);
    along('b', '\\vec b', 'lab-b', [1.05, 1.5], 2, 'b', 1);
    along('b-copy', '\\vec b', 'lab-b lab-ghost', [1.05, 1.5], 3, 'b', -1, true);
    if (parallelogram) along('a-copy', '\\vec a', 'lab-a lab-ghost', [1.05, 1.5], 4, 'a', 1, true);
    label('O', 'O', {
      className: 'lab-point',
      size: [0.95, 1.2],
      priority: 5,
      optional: true,
      at: (lw, lh) => [
        { x: O.x - lw / 2 - 6, y: O.y + lh / 2 + 4 },
        { x: O.x - lw / 2 - 8, y: O.y },
        { x: O.x + lw / 2 + 6, y: O.y + lh / 2 + 4 },
      ],
    });
    const placement = placeLabels(requests, obstacles, { x0: 2, y0: 2, x1: width - 2, y1: height - 2 });
    return { tracks, widthOf, O, arc, right, triangle, para, kind, labels, placement, plane: planeData(view, em * 0.6) };
  }, [width, height, view, config, parallelogram, fontPx, reserved]);

  const dim = (k: Key) => (focus.size > 0 && !focus.has(k) ? ' is-dim' : '');
  const hover = (keys: Key[]) => ({
    onPointerEnter: () => !dragging.current && onHover(keys),
    onPointerLeave: () => !dragging.current && onHover(null),
  });
  const arrow = (k: string, cls: string, keyOf: Key, dashed = false) => {
    const [t0, t1] = scene!.tracks.get(k)!;
    return (
      <g key={k} className={`piece${dashed ? ' is-copy' : ''}${dim(keyOf)}`} {...hover([keyOf])}>
        <line className="hit" x1={t0.x} y1={t0.y} x2={t1.x} y2={t1.y} />
        <Arrow tail={t0} tip={t1} width={scene!.widthOf(k)} className={cls} dashed={dashed} />
      </g>
    );
  };

  return (
    <div className="stage" ref={box} style={{ ['--label' as string]: `${fontPx}px` }}>
      {scene && (
        <>
          <svg
            ref={svg}
            className="board"
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            data-dragging={active ?? undefined}
          >
            <Plane view={view} data={scene.plane} axes={false} />
            {scene.para && <polygon className={`para-fill${dim('s')}`} points={scene.para} />}
            <polygon
              className={`triangle${scene.kind === 'perpendicular' ? ' is-right' : ''}${dim('s')}`}
              points={scene.triangle}
            />
            {scene.arc && <path className={`angle-arc${dim('alpha')}`} d={scene.arc} />}
            {scene.right.map((d, i) => (
              <path key={i} className={`right-mark${dim('alpha')}`} d={d} />
            ))}
            {scene.para && arrow('a-copy', 'vec-a', 'a', true)}
            {arrow('b-copy', 'vec-b', 'b', true)}
            {arrow('a', 'vec-a', 'a')}
            {arrow('b', 'vec-b', 'b')}
            {arrow('s', 'vec-s', 's')}
            <circle className="tail-dot" cx={scene.O.x} cy={scene.O.y} r={4.5} />
            <g className="handles">
              {(['a', 'b'] as const).map((h) => {
                const at = scene.tracks.get(h)![1];
                return (
                  <g
                    key={h}
                    className="handle"
                    tabIndex={0}
                    role="button"
                    aria-label={
                      h === 'a'
                        ? `Punta di a: modulo ${tex(config.a)}`
                        : `Punta di b: modulo ${tex(config.b)}, angolo ${Math.round(config.alpha)} gradi`
                    }
                    data-active={active === h || undefined}
                    onPointerDown={down(h)}
                    onKeyDown={key(h)}
                    {...hover([h])}
                  >
                    <circle className="handle-hit" cx={at.x} cy={at.y} r={24} />
                    <circle className="handle-ring" cx={at.x} cy={at.y} r={11} />
                  </g>
                );
              })}
            </g>
          </svg>
          <div className="labels" aria-hidden="true">
            {Object.entries(scene.labels).map(([id, l]) => {
              const p = scene.placement.get(id);
              if (!p || p.hidden) return null;
              return <Label key={id} tex={l.tex} x={p.cx} y={p.cy} className={`${l.className}${l.key ? dim(l.key) : ''}`} />;
            })}
          </div>
          {children}
        </>
      )}
    </div>
  );
}

