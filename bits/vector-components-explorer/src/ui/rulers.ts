/**
 * The rulers of the scalar components: two oriented number lines framing the plane, below it
 * for v_x and beside it for v_y. A scalar component is a signed number, so it is drawn as a
 * point on a number line, not as an arrow:
 *
 *   - the line has the plane's scale and the orientation of the versor (x̂, ŷ), drawn at its 0;
 *   - its 0 is aligned with the tail A (not with the origin O: v_x = x_B − x_A is measured from
 *     the tail), so the point v_x sits exactly under the tip B;
 *   - ticks count whole units from 0; the segment from 0 to the point is the projection.
 *
 * Pure pixel geometry; Stage.tsx draws it and lays the labels. Tested in tests/rulers.test.ts.
 */
import type { Vec } from '../model/vec.ts';
import { toPx } from './view.ts';
import type { View } from './view.ts';

export interface RulerLabel {
  id: string;
  /** What it shows: the name of the scalar, its value, the zero, the versor. */
  role: 'name' | 'value' | 'zero' | 'versor';
  x: number;
  y: number;
}

export interface Ruler {
  axis: 'x' | 'y';
  /** The region of the ruler, in pixels. */
  area: { x: number; y: number; w: number; h: number };
  line: [Vec, Vec];
  /** Arrowhead at the positive end. */
  head: string;
  ticks: { at: Vec; zero: boolean }[];
  /** Pixel positions of 0 and of the scalar component. */
  zero: Vec;
  point: Vec;
  versor: [Vec, Vec];
  labels: RulerLabel[];
}

/** Sizes of the two rulers for a label font of `em` pixels. */
export const rulerSizes = (em: number) => ({ below: Math.round(em * 3.1), beside: Math.round(em * 3.6) });

export function rulers(
  view: View,
  A: Vec,
  B: Vec,
  em: number,
  /** Estimated width of the value label of each ruler, in pixels. */
  valueWidth: { x: number; y: number },
): [Ruler, Ruler] {
  const { below, beside } = rulerSizes(em);
  const s = view.scale;
  const a = toPx(view, A);
  const b = toPx(view, B);
  const W = view.width;
  const H = view.height;

  // x: below the plane, oriented to the right.
  const top = H;
  const lineY = top + below * 0.5;
  const x0 = em * 1.9;
  const x1 = W - em * 0.5;
  const xTicks: Ruler['ticks'] = [];
  for (let k = Math.ceil((x0 + 2 - a.x) / s); a.x + k * s <= x1 - 10; k += 1) {
    xTicks.push({ at: { x: a.x + k * s, y: lineY }, zero: k === 0 });
  }
  const versorY = top + below * 0.2;
  const labelY = top + below * 0.8;
  const xValue = Math.min(Math.max(b.x, x0 + valueWidth.x / 2), x1 - valueWidth.x / 2);
  const xLabels: RulerLabel[] = [
    { id: 'rx-name', role: 'name', x: em * 0.95, y: lineY },
    { id: 'rx-value', role: 'value', x: xValue, y: labelY },
  ];
  if (Math.abs(b.x - a.x) > valueWidth.x / 2 + em * 0.55) {
    xLabels.push({ id: 'rx-zero', role: 'zero', x: a.x, y: labelY });
  }
  const xVersorRight = a.x + s + em * 0.75 < x1;
  xLabels.push({
    id: 'rx-versor',
    role: 'versor',
    x: xVersorRight ? a.x + s + em * 0.55 : a.x - em * 0.55,
    y: versorY,
  });
  const x: Ruler = {
    axis: 'x',
    area: { x: 0, y: top, w: W, h: below },
    line: [
      { x: x0, y: lineY },
      { x: x1, y: lineY },
    ],
    head: `M${x1 + 1} ${lineY}l-9 -3.6v7.2z`,
    ticks: xTicks,
    zero: { x: a.x, y: lineY },
    point: { x: b.x, y: lineY },
    versor: [
      { x: a.x, y: versorY },
      { x: a.x + s, y: versorY },
    ],
    labels: xLabels,
  };

  // y: beside the plane, oriented upwards.
  const left = W;
  const lineX = left + beside * 0.42;
  const y0 = H - em * 1.6;
  const y1 = em * 0.5;
  const yTicks: Ruler['ticks'] = [];
  for (let k = Math.ceil((a.y - (y0 - 2)) / s); a.y - k * s >= y1 + 10; k += 1) {
    yTicks.push({ at: { x: lineX, y: a.y - k * s }, zero: k === 0 });
  }
  const versorX = left + beside * 0.16;
  const labelX = lineX + 7;
  const half = em * 0.5;
  const yValue = Math.min(Math.max(b.y, y1 + half), y0 - half);
  const yLabels: RulerLabel[] = [
    { id: 'ry-name', role: 'name', x: lineX, y: H - em * 0.75 },
    { id: 'ry-value', role: 'value', x: labelX + valueWidth.y / 2, y: yValue },
  ];
  if (Math.abs(b.y - a.y) > em * 1.15) {
    yLabels.push({ id: 'ry-zero', role: 'zero', x: labelX + em * 0.35, y: a.y });
  }
  const yVersorUp = a.y - s - em * 0.75 > y1;
  yLabels.push({
    id: 'ry-versor',
    role: 'versor',
    x: versorX,
    y: yVersorUp ? a.y - s - em * 0.55 : a.y + em * 0.6,
  });
  const y: Ruler = {
    axis: 'y',
    area: { x: left, y: 0, w: beside, h: H },
    line: [
      { x: lineX, y: y0 },
      { x: lineX, y: y1 },
    ],
    head: `M${lineX} ${y1 - 1}l-3.6 9h7.2z`,
    ticks: yTicks,
    zero: { x: lineX, y: a.y },
    point: { x: lineX, y: b.y },
    versor: [
      { x: versorX, y: a.y },
      { x: versorX, y: a.y - s },
    ],
    labels: yLabels,
  };
  return [x, y];
}
