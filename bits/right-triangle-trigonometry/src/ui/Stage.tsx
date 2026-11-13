/**
 * The diagram: a right triangle ABC on a squared sheet, with direct manipulation.
 *
 *   B (top vertex)   → free: the angle and the size follow the pointer
 *   C (right angle)  → slides along the base: same angle, larger or smaller triangle
 *
 * A pointer drag snaps α to whole degrees and AB to tenths (α to tenths of a degree with Shift
 * or Alt); the arrow keys on a focused vertex change α (↑ ↓) or AB (← →). The scale never
 * follows the drag: the triangle stays inside a fixed 10 × 10 square.
 *
 * Drawing order, bottom to top: grid, triangle surface, similar copies, sides, angle marks,
 * vertices, handles. Labels are HTML over the SVG, placed by labels.ts around everything drawn.
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent, ReactNode } from 'react';
import {
  BOX,
  COPY_SCALES,
  fromVertexB,
  fromVertexC,
  normalise,
  referenceAngle,
  roleOf,
  sides,
  vertices,
} from '../model/triangle.ts';
import type { Reference, Role, Side, Triangle } from '../model/triangle.ts';
import { clamp } from '../model/vec.ts';
import type { Vec } from '../model/vec.ts';
import { tex } from './format.ts';
import { angleTex, LEN, ROLE_NAME } from './formulas.ts';
import type { Key } from './formulas.ts';
import Label from './Label.tsx';
import { aroundPoint, besideSegment, placeLabels, support } from './labels.ts';
import type { LabelRequest, Obstacle, Rect } from './labels.ts';
import { angleArc, arcPoints, bisector, rightAngle } from './marks.ts';
import Tex from './Tex.tsx';
import { useSize } from './useSize.ts';
import { fitView, toMath, toPx, visibleBox } from './view.ts';
import type { View } from './view.ts';

type Handle = 'B' | 'C';

interface Drag {
  handle: Handle;
}

/** The part of the plane always on stage: the 10 × 10 square and room for the labels. */
const FRAME = { xmin: -1.2, xmax: BOX + 2.6, ymin: -1.9, ymax: BOX + 0.4 };

/** Font size of each kind of label relative to --label (keep in step with styles.css). */
const SCALE = { vertex: 0.9, angle: 0.92, role: 0.68, len: 0.82, copy: 0.66 };

const SIDES: Side[] = ['AB', 'BC', 'AC'];

const ROLE_ORDER: Record<Role, number> = { hyp: 1, opp: 2, adj: 3 };

/** Width of a line of the side labels' text (system font, weight 650), measured once per string. */
const widths = new Map<string, number>();
let context: CanvasRenderingContext2D | null | undefined;
function measure(text: string, px: number): number {
  const key = `${text}@${px}`;
  const known = widths.get(key);
  if (known !== undefined) return known;
  if (context === undefined) context = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d');
  let w = text.length * px * 0.58;
  if (context) {
    context.font = `650 ${px}px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`;
    w = context.measureText(text).width + px * 0.1;
  }
  widths.set(key, w);
  return w;
}

export default function Stage({
  tri,
  onChange,
  reference,
  copies,
  lengths,
  focus,
  onHover,
  masked,
  children,
}: {
  tri: Triangle;
  onChange: (next: Triangle) => void;
  reference: Reference;
  copies: boolean;
  /** Lengths written on the sides. */
  lengths: boolean;
  focus: ReadonlySet<Key>;
  onHover: (keys: Key[] | null) => void;
  masked: boolean;
  children?: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const { width, height } = useSize(box);
  const fontPx = clamp(Math.min(width, height) * 0.04, 15, 28);
  const drag = useRef<Drag | null>(null);
  const [active, setActive] = useState<Handle | null>(null);

  // The floating tools take a strip at the top: the square starts below it.
  const top = 52;
  const view = useMemo<View>(() => {
    const v = fitView(width, Math.max(0, height - top), FRAME, 6);
    return { ...v, height, oy: v.oy + top };
  }, [width, height]);

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

  const down = (handle: Handle) => (e: PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag.current = { handle };
    setActive(handle);
  };
  const move = (e: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const fine = e.shiftKey || e.altKey;
    const p = pointer(e);
    const next = d.handle === 'B' ? fromVertexB(p, fine ? 0.1 : 1, 0.1) : fromVertexC(tri, p.x, 0.1);
    if (next.alpha !== tri.alpha || next.hyp !== tri.hyp) onChange(next);
  };
  const up = () => {
    drag.current = null;
    setActive(null);
  };
  const key = (handle: Handle) => (e: KeyboardEvent) => {
    const fine = e.shiftKey;
    let next: Triangle | null = null;
    if (handle === 'B' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      next = { alpha: tri.alpha + (e.key === 'ArrowUp' ? 1 : -1) * (fine ? 0.1 : 1), hyp: tri.hyp };
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      next = { alpha: tri.alpha, hyp: tri.hyp + (e.key === 'ArrowRight' ? 1 : -1) * (fine ? 0.1 : 0.5) };
    } else if (handle === 'C' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      next = { alpha: tri.alpha, hyp: tri.hyp + (e.key === 'ArrowUp' ? 1 : -1) * (fine ? 0.1 : 0.5) };
    }
    if (!next) return;
    e.preventDefault();
    onChange(normalise(next));
  };

  const scene = useMemo(() => {
    if (width === 0) return null;
    const em = fontPx;
    const P = (p: Vec) => toPx(view, p);
    const V = vertices(tri);
    const A = P(V.A);
    const B = P(V.B);
    const C = P(V.C);
    const ends: Record<Side, [Vec, Vec]> = { AB: [A, B], BC: [B, C], AC: [A, C] };
    const opposite: Record<Side, Vec> = { AB: C, BC: A, AC: B };
    const len = sides(tri);
    const stroke = clamp(em * 0.17, 2.6, 4.2);

    // Grid: unit squares, every fifth line darker.
    const vb = visibleBox(view);
    const grid: { x1: number; y1: number; x2: number; y2: number; major: boolean }[] = [];
    for (let i = Math.ceil(vb.xmin); i <= vb.xmax; i += 1) {
      const x = P({ x: i, y: 0 }).x;
      grid.push({ x1: x, y1: 0, x2: x, y2: height, major: i % 5 === 0 });
    }
    for (let j = Math.ceil(vb.ymin); j <= vb.ymax; j += 1) {
      const y = P({ x: 0, y: j }).y;
      grid.push({ x1: 0, y1: y, x2: width, y2: y, major: j % 5 === 0 });
    }

    // Angle marks: the reference angle gets a filled sector, the other one a thin arc.
    const dir = (from: Vec, to: Vec) => ({ x: to.x - from.x, y: to.y - from.y });
    const legPx = Math.min(Math.hypot(C.x - A.x, C.y - A.y), Math.hypot(B.x - C.x, B.y - C.y));
    const hypPx = Math.hypot(B.x - A.x, B.y - A.y);
    const rA = clamp(Math.min(hypPx * 0.24, Math.hypot(C.x - A.x, C.y - A.y) * 0.7), 16, em * 2.6);
    const rB = clamp(Math.min(hypPx * 0.24, Math.hypot(B.x - C.x, B.y - C.y) * 0.7), 16, em * 2.6);
    const atA = { at: A, u: dir(A, C), v: dir(A, B), r: rA };
    const atB = { at: B, u: dir(B, C), v: dir(B, A), r: rB };
    const refMark = reference === 'alpha' ? atA : atB;
    const otherMark = reference === 'alpha' ? atB : atA;
    const refArc = angleArc(refMark.at, refMark.u, refMark.v, refMark.r);
    const otherArc = angleArc(otherMark.at, otherMark.u, otherMark.v, otherMark.r * 0.78);
    const sq = clamp(legPx * 0.22, 6, em * 0.95);
    const right = rightAngle(C, dir(C, A), dir(C, B), sq);

    // Similar copies inside ABC: their vertical legs, vertices and right angles.
    const copyShapes = copies
      ? COPY_SCALES.map((k, i) => {
          const c = vertices(tri, k);
          const b = P(c.B);
          const cc = P(c.C);
          const leg = Math.hypot(b.x - cc.x, b.y - cc.y);
          return {
            i: i + 1,
            B: b,
            C: cc,
            right: rightAngle(cc, dir(cc, A), dir(cc, b), clamp(leg * 0.22, 4, em * 0.6)),
          };
        })
      : [];

    // Labels.
    const obstacles: Obstacle[] = [];
    for (const s of SIDES) {
      const [p, q] = ends[s];
      obstacles.push({ kind: 'segment', a: p, b: q, r: stroke / 2 + 3, weight: 3 });
    }
    for (const p of [A, B, C]) obstacles.push({ kind: 'point', p, r: 10, weight: 3 });
    for (const m of [refMark, otherMark]) {
      for (const p of arcPoints(m.at, m.u, m.v, m.r)) obstacles.push({ kind: 'point', p, r: 3, weight: 1.5 });
    }
    for (const c of copyShapes) {
      obstacles.push({ kind: 'segment', a: c.B, b: c.C, r: 3, weight: 1.2 });
      obstacles.push({ kind: 'point', p: c.B, r: 6, weight: 1.2 }, { kind: 'point', p: c.C, r: 6, weight: 1.2 });
    }
    for (const rect of reserved) obstacles.push({ kind: 'rect', rect, weight: 50 });

    const requests: LabelRequest[] = [];
    const gap = em * 0.32;
    const centroid = { x: (A.x + B.x + C.x) / 3, y: (A.y + B.y + C.y) / 3 };
    const out = (p: Vec) => ({ x: p.x - centroid.x, y: p.y - centroid.y });

    const vw = em * SCALE.vertex;
    for (const [id, p] of [
      ['A', A],
      ['B', B],
      ['C', C],
    ] as const) {
      requests.push({ id, w: vw * 0.9, h: vw * 1.15, priority: -1, candidates: aroundPoint(p, vw * 0.9, vw * 1.15, gap * 1.8, out(p)) });
    }

    // Angle names: inside the angle beyond the arc, else outside around the vertex.
    const angleText = (which: Reference) => {
      const value = which === 'alpha' ? tri.alpha : 90 - tri.alpha;
      return `${angleTex(which)} = ${tex(value, 1)}^\\circ`;
    };
    const angleDigits = (which: Reference) => tex(which === 'alpha' ? tri.alpha : 90 - tri.alpha, 1).replace(/[{}]/g, '').length;
    for (const [which, m, priority] of [
      [reference, refMark, 0],
      [reference === 'alpha' ? 'beta' : 'alpha', otherMark, 4],
    ] as const) {
      const aw = em * SCALE.angle * (2.3 + 0.56 * angleDigits(which));
      const ah = em * SCALE.angle * 1.3;
      const d = bisector(m.u, m.v);
      const reach = m.r + gap + support(aw, ah, d);
      requests.push({
        id: `ang-${which}`,
        w: aw,
        h: ah,
        priority,
        candidates: [
          ...[1, 1.25, 1.6, 2.1].map((t) => ({ x: m.at.x + d.x * reach * t, y: m.at.y + d.y * reach * t })),
          ...aroundPoint(m.at, aw, ah, gap * 2.2, { x: -d.x, y: -d.y }),
        ],
      });
    }

    // Side labels: the role (and the length), on the outer side first.
    for (const s of SIDES) {
      const role = roleOf(s, reference);
      const [p, q] = ends[s];
      const lineRole = em * SCALE.role;
      // Legs: "cateto opposto" / "ad α" on two lines, so that the label fits beside a short leg.
      const w = Math.max(measure(ROLE_NAME[role], lineRole) + 6, lengths ? em * SCALE.len * (masked && role !== 'hyp' ? 3.6 : 5.6) : 0);
      const h = lineRole * (role === 'hyp' ? 1.4 : 2.65) + (lengths ? em * SCALE.len * 1.45 : 0) + 4;
      const o = opposite[s];
      const n = { x: q.y - p.y, y: -(q.x - p.x) };
      const outward = n.x * (o.x - p.x) + n.y * (o.y - p.y) > 0 ? -1 : 1;
      requests.push({
        id: `side-${s}`,
        w,
        h,
        priority: ROLE_ORDER[role],
        candidates: [
          ...besideSegment(p, q, w, h, gap, { side: outward, ts: [0.5, 0.38, 0.62, 0.26, 0.74] }),
          ...aroundPoint({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }, w, h, gap * 3),
        ],
      });
    }
    for (const c of copyShapes) {
      const cw = em * SCALE.copy * 1.6;
      const ch = em * SCALE.copy * 1.4;
      requests.push({ id: `copy-B${c.i}`, w: cw, h: ch, priority: 8, optional: true, candidates: aroundPoint(c.B, cw, ch, gap, { x: -1, y: -1 }) });
      requests.push({ id: `copy-C${c.i}`, w: cw, h: ch, priority: 9, optional: true, candidates: aroundPoint(c.C, cw, ch, gap, { x: 0, y: 1 }) });
    }

    const placement = placeLabels(requests, obstacles, { x0: 2, y0: 2, x1: width - 2, y1: height - 2 });

    // The ray of AB beyond B, while C is being dragged: the angle that does not change.
    const far = P({ x: (BOX + 1.5) * Math.cos((tri.alpha * Math.PI) / 180), y: (BOX + 1.5) * Math.sin((tri.alpha * Math.PI) / 180) });

    return { A, B, C, ends, len, stroke, grid, refArc, otherArc, right, copyShapes, placement, angleText, far };
  }, [width, height, view, tri, reference, copies, lengths, fontPx, reserved, masked]);

  const dim = (keys: Key[]) =>
    focus.size === 0 ? '' : keys.some((k) => focus.has(k)) ? ' is-focus' : ' is-dim';
  const hover = (keys: Key[]) => ({
    onPointerEnter: () => !drag.current && onHover(keys),
    onPointerLeave: () => !drag.current && onHover(null),
  });
  const refKey: Key = 'ang';
  const otherKey: Key = 'other';
  const angleValue = referenceAngle(tri, reference);

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
            <g className="sheet" aria-hidden="true">
              {scene.grid.map((g, i) => (
                <line key={i} className={g.major ? 'grid grid-major' : 'grid'} x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} />
              ))}
            </g>

            <polygon
              className={`surface${dim(['hyp', 'opp', 'adj'])}`}
              points={[scene.A, scene.B, scene.C].map((p) => `${p.x},${p.y}`).join(' ')}
            />

            {active === 'C' && (
              <line className="ray" x1={scene.B.x} y1={scene.B.y} x2={scene.far.x} y2={scene.far.y} />
            )}

            {scene.copyShapes.length > 0 && (
              <g className="copies">
                {scene.copyShapes.map((c) => {
                  const role = roleOf('BC', reference);
                  return (
                    <g key={c.i} className={`copy${dim([role])}`}>
                      <line className={`copy-leg role-${role}`} x1={c.B.x} y1={c.B.y} x2={c.C.x} y2={c.C.y} />
                      <path className="copy-right" d={c.right} />
                      <circle className="copy-dot" cx={c.B.x} cy={c.B.y} r={3.2} />
                      <circle className="copy-dot" cx={c.C.x} cy={c.C.y} r={3.2} />
                    </g>
                  );
                })}
              </g>
            )}

            {scene.refArc && (
              <g className={`angle angle-ref${dim([refKey])}`} {...hover([refKey])}>
                <path className="angle-sector" d={scene.refArc.sector} />
                <path className="angle-arc" d={scene.refArc.arc} />
              </g>
            )}
            {scene.otherArc && (
              <g className={`angle angle-other${dim([otherKey])}`} {...hover([otherKey])}>
                <path className="angle-sector" d={scene.otherArc.sector} />
                <path className="angle-arc" d={scene.otherArc.arc} />
              </g>
            )}
            <path className={`right-mark${dim(['hyp'])}`} d={scene.right} />

            {SIDES.map((s) => {
              const role = roleOf(s, reference);
              const [p, q] = scene.ends[s];
              return (
                <g key={s} className={`side role-${role}${dim([role])}`} {...hover([role])}>
                  <line className="hit" x1={p.x} y1={p.y} x2={q.x} y2={q.y} />
                  <line className="side-line" x1={p.x} y1={p.y} x2={q.x} y2={q.y} strokeWidth={scene.stroke} />
                </g>
              );
            })}

            <g className="vertices" aria-hidden="true">
              <circle className="vertex vertex-fixed" cx={scene.A.x} cy={scene.A.y} r={4.2} />
              <circle className="vertex vertex-free" cx={scene.C.x} cy={scene.C.y} r={5.2} />
              <circle className="vertex vertex-free" cx={scene.B.x} cy={scene.B.y} r={5.2} />
            </g>

            <g className="handles">
              {(['C', 'B'] as const).map((h) => {
                const p = h === 'B' ? scene.B : scene.C;
                const name =
                  h === 'B'
                    ? `Vertice B: trascina per cambiare angolo e dimensioni (α = ${tex(tri.alpha, 1)}°)`
                    : `Vertice C: trascina per ingrandire o ridurre il triangolo con lo stesso angolo (AB = ${tex(tri.hyp, 1)})`;
                return (
                  <g
                    key={h}
                    className={`handle handle-${h}`}
                    tabIndex={0}
                    role="button"
                    aria-label={name.replace(/[{}]/g, '')}
                    data-active={active === h || undefined}
                    onPointerDown={down(h)}
                    onKeyDown={key(h)}
                  >
                    <circle className="handle-hit" cx={p.x} cy={p.y} r={24} />
                    <circle className="handle-ring" cx={p.x} cy={p.y} r={12} />
                  </g>
                );
              })}
            </g>
          </svg>

          <div className="labels" aria-hidden="true">
            {(['A', 'B', 'C'] as const).map((v) => {
              const p = scene.placement.get(v)!;
              return <Label key={v} tex={v} x={p.cx} y={p.cy} className="lab-vertex" />;
            })}
            {(['alpha', 'beta'] as const).map((which) => {
              const p = scene.placement.get(`ang-${which}`)!;
              const isRef = which === reference;
              return (
                <Label
                  key={which}
                  tex={scene.angleText(which)}
                  x={p.cx}
                  y={p.cy}
                  className={`${isRef ? 'lab-angle' : 'lab-angle-other'}${dim([isRef ? refKey : otherKey])}`}
                />
              );
            })}
            {SIDES.map((s) => {
              const p = scene.placement.get(`side-${s}`)!;
              const role = roleOf(s, reference);
              const value = scene.len[s];
              const hidden = masked && role !== 'hyp';
              const exact = Math.abs(Number(value.toFixed(LEN)) - value) < 1e-9;
              return (
                <div
                  key={s}
                  className={`label lab-side role-${role}${dim([role])}`}
                  style={{ transform: `translate(${p.cx}px, ${p.cy}px) translate(-50%, -50%)` }}
                >
                  <span className="side-role">{ROLE_NAME[role]}</span>
                  {role !== 'hyp' && (
                    <span className="side-ref">
                      ad <Tex tex={angleTex(reference)} />
                    </span>
                  )}
                  {lengths && (
                    <span className="side-len">
                      <Tex
                        tex={`${s} ${hidden ? '= \\htmlClass{mask}{\\,?\\,}' : `${exact ? '=' : '\\approx'} ${tex(value, LEN)}`}`}
                      />
                    </span>
                  )}
                </div>
              );
            })}
            {scene.copyShapes.flatMap((c) =>
              (['B', 'C'] as const).map((v) => {
                const p = scene.placement.get(`copy-${v}${c.i}`);
                if (!p || p.hidden) return null;
                return <Label key={`${v}${c.i}`} tex={`${v}_${c.i}`} x={p.cx} y={p.cy} className={`lab-copy${dim([roleOf('BC', reference)])}`} />;
              }),
            )}
          </div>
          <p className="sr-only">
            {`Angolo di riferimento ${reference === 'alpha' ? 'alfa' : 'beta'} ${tex(angleValue, 1).replace(/[{}]/g, '')} gradi, ipotenusa ${tex(tri.hyp, 1).replace(/[{}]/g, '')}`}
          </p>
          {children}
        </>
      )}
    </div>
  );
}
