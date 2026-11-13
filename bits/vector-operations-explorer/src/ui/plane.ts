/**
 * The Cartesian plane as data: grid lines, tick labels and axis names in pixels. Stage.tsx
 * draws them and gives the tick labels to the label placer as obstacles of low weight, so a
 * tick number gives way to a vector's name rather than the other way round. Pure.
 */
import type { Rect } from './labels.ts';
import { text } from './format.ts';
import { labelStep, toPx, visibleBox } from './view.ts';
import type { View } from './view.ts';

export interface Tick {
  key: string;
  label: string;
  rect: Rect;
}

export interface PlaneData {
  /** x = const lines (pixel x) and y = const lines (pixel y), minor and major (every 5). */
  vertical: { px: number; major: boolean }[];
  horizontal: { px: number; major: boolean }[];
  ticks: Tick[];
  /** Pixel position of the tick marks along each axis. */
  xTicks: number[];
  yTicks: number[];
  origin: { x: number; y: number };
}

export function planeData(view: View, fontPx: number): PlaneData {
  const box = visibleBox(view);
  const grid = view.scale >= 9 ? 1 : 5;
  const vertical: PlaneData['vertical'] = [];
  const horizontal: PlaneData['horizontal'] = [];
  for (let i = Math.ceil(box.xmin / grid); i * grid <= box.xmax; i += 1) {
    const v = i * grid;
    vertical.push({ px: toPx(view, { x: v, y: 0 }).x, major: v % 5 === 0 });
  }
  for (let i = Math.ceil(box.ymin / grid); i * grid <= box.ymax; i += 1) {
    const v = i * grid;
    horizontal.push({ px: toPx(view, { x: 0, y: v }).y, major: v % 5 === 0 });
  }
  const step = labelStep(view.scale, fontPx * 2.1);
  const charW = fontPx * 0.58;
  const h = fontPx * 1.15;
  const ticks: Tick[] = [];
  const xTicks: number[] = [];
  const yTicks: number[] = [];
  const o = toPx(view, { x: 0, y: 0 });
  // No tick numbers where they would be cut by the edge or meet the axis arrows.
  const edge = fontPx * 1.3;
  for (let i = Math.ceil(box.xmin / step); i * step <= box.xmax; i += 1) {
    const v = i * step;
    const px = o.x + v * view.scale;
    if (v === 0 || px < edge || px > view.width - edge) continue;
    const label = text(v, 0);
    xTicks.push(px);
    const w = label.length * charW + 2;
    ticks.push({ key: `x${v}`, label, rect: { cx: px, cy: o.y + 5 + h / 2, w, h } });
  }
  for (let i = Math.ceil(box.ymin / step); i * step <= box.ymax; i += 1) {
    const v = i * step;
    const py = o.y - v * view.scale;
    if (v === 0 || py < edge || py > view.height - edge) continue;
    const label = text(v, 0);
    yTicks.push(py);
    const w = label.length * charW + 2;
    ticks.push({ key: `y${v}`, label, rect: { cx: o.x - 6 - w / 2, cy: py, w, h } });
  }
  return { vertical, horizontal, ticks, xTicks, yTicks, origin: o };
}
