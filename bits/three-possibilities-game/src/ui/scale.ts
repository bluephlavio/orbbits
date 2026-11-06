/** Linear scales and round axis ticks. Pure; the plotting itself is in Chart.tsx. */

export const linear =
  ([d0, d1]: readonly [number, number], [r0, r1]: readonly [number, number]) =>
  (value: number) =>
    d1 === d0 ? r0 : r0 + ((value - d0) / (d1 - d0)) * (r1 - r0);

/** The round step (1, 2 or 5 × 10ᵏ) giving about `count` intervals. */
export function niceStep(span: number, count: number): number {
  const raw = span / Math.max(1, count);
  const power = 10 ** Math.floor(Math.log10(raw));
  const fraction = raw / power;
  const round = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return round * power;
}

/** Round tick values inside [lo, hi]. `integers` forbids fractional steps (roll counts). */
export function niceTicks(lo: number, hi: number, count = 5, integers = false): number[] {
  if (!(hi > lo)) return [lo];
  const step = Math.max(niceStep(hi - lo, count), integers ? 1 : 0);
  const ticks: number[] = [];
  for (let i = Math.ceil(lo / step - 1e-9); i * step <= hi + step * 1e-9; i += 1) {
    ticks.push(Number((i * step).toPrecision(12)));
  }
  return ticks;
}

/** Pads a data range and widens it so that a flat series still gets a usable axis. */
export function paddedDomain(
  values: readonly number[],
  { pad = 0.08, minSpan = 1 }: { pad?: number; minSpan?: number } = {},
): [number, number] {
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (hi - lo < minSpan) {
    const middle = (hi + lo) / 2;
    lo = middle - minSpan / 2;
    hi = middle + minSpan / 2;
  }
  const margin = (hi - lo) * pad;
  return [lo - margin, hi + margin];
}
