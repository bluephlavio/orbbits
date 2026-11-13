/**
 * From the mathematical plane to pixels. The SVG viewBox equals the stage size in CSS pixels,
 * so the same coordinates place SVG strokes and the HTML labels laid over them. The scale only
 * changes when the stage is resized or zoomed, never because of what is being dragged.
 */
import type { Vec } from '../model/vec.ts';

export interface View {
  width: number;
  height: number;
  /** Pixels per unit. */
  scale: number;
  /** Pixel position of the mathematical origin. */
  ox: number;
  oy: number;
}

export interface Box {
  xmin: number;
  xmax: number;
  ymin: number;
  ymax: number;
}

export const toPx = (view: View, p: Vec): Vec => ({
  x: view.ox + p.x * view.scale,
  y: view.oy - p.y * view.scale,
});

export const toMath = (view: View, p: Vec): Vec => ({
  x: (p.x - view.ox) / view.scale,
  y: (view.oy - p.y) / view.scale,
});

/** Origin at the centre; `half` units from the centre to the nearer edge, minus `pad` pixels. */
export function centeredView(width: number, height: number, half: number, pad = 0): View {
  const scale = Math.max(1, (Math.min(width, height) / 2 - pad) / half);
  return { width, height, scale, ox: width / 2, oy: height / 2 };
}

/** The largest scale at which `box` fits inside the stage with `pad` pixels around it. */
export function fitView(width: number, height: number, box: Box, pad = 0): View {
  const scale = Math.max(
    1,
    Math.min((width - 2 * pad) / (box.xmax - box.xmin), (height - 2 * pad) / (box.ymax - box.ymin)),
  );
  const cx = (box.xmin + box.xmax) / 2;
  const cy = (box.ymin + box.ymax) / 2;
  return { width, height, scale, ox: width / 2 - cx * scale, oy: height / 2 + cy * scale };
}

/** The part of the plane the stage shows. */
export const visibleBox = (view: View): Box => ({
  xmin: -view.ox / view.scale,
  xmax: (view.width - view.ox) / view.scale,
  ymin: -(view.height - view.oy) / view.scale,
  ymax: view.oy / view.scale,
});

/** Spacing of labelled ticks: every unit when there is room, else every 2, 5 or 10. */
export function labelStep(scale: number, minPx = 30): number {
  for (const step of [1, 2, 5, 10, 20]) if (step * scale >= minPx) return step;
  return 50;
}
