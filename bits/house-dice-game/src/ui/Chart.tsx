/**
 * A line chart drawn in plain SVG at the size of its container, so that text stays the same
 * size from a phone to a LIM (a scaled viewBox would shrink or inflate it).
 *
 * It draws what it is given: lines, shaded bands and horizontal rules on one linear scale.
 * Axes follow docs/style/interactive.md: coordinates come from mathematical values, and the
 * zero line sits at zero. A crosshair reads every series at the nearest x, by pointer or by
 * arrow keys; the same values are always available in the statistics around the chart.
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import type { Point } from '../game/stats.ts';
import { integer } from './format.ts';
import { linear, niceTicks } from './scale.ts';

export interface LineSeries {
  kind: 'line';
  key: string;
  /** Shown in the legend and in the crosshair readout. Omit for anonymous trajectories. */
  label?: string;
  color: string;
  points: readonly Point[];
  width?: number;
  opacity?: number;
  dashed?: boolean;
  /** Marks the last point: the "you are here" of a growing trajectory. */
  endDot?: boolean;
}

export interface BandSeries {
  kind: 'band';
  key: string;
  label: string;
  color: string;
  points: readonly { x: number; lo: number; hi: number }[];
}

export interface RuleSeries {
  kind: 'rule';
  key: string;
  label: string;
  color: string;
  y: number;
  dashed?: boolean;
}

export type Series = LineSeries | BandSeries | RuleSeries;

interface Props {
  title: string;
  caption?: string;
  /** Text for assistive technology: what the chart shows right now. */
  summary: string;
  xLabel: string;
  yLabel: string;
  xDomain: readonly [number, number];
  yDomain: readonly [number, number];
  series: readonly Series[];
  formatY: (value: number) => string;
  /** A legend entry for a set of anonymous trajectories. */
  extraLegend?: { label: string; color: string };
}


/** Pixel size of the plot, and its CSS font size: SVG text must follow fullscreen scaling. */
function useSize() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0, fontSize: 13 });
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const fontSize = Number.parseFloat(getComputedStyle(element).fontSize);
      setSize({ width: Math.round(width), height: Math.round(height), fontSize });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, ...size };
}

/** The point nearest to x, in a series sorted by x. */
function nearest<T extends { x: number }>(points: readonly T[], x: number): T | undefined {
  let lo = 0;
  let hi = points.length - 1;
  while (hi - lo > 1) {
    const middle = (lo + hi) >> 1;
    if (points[middle].x < x) lo = middle;
    else hi = middle;
  }
  const [a, b] = [points[lo], points[hi]];
  if (!a || !b) return a ?? b;
  return Math.abs(a.x - x) <= Math.abs(b.x - x) ? a : b;
}

export default function Chart({
  title,
  caption,
  summary,
  xLabel,
  yLabel,
  xDomain,
  yDomain,
  series,
  formatY,
  extraLegend,
}: Props) {
  const { ref, width, height, fontSize } = useSize();
  const clip = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [hoverX, setHoverX] = useState<number | null>(null);

  const yTicks = niceTicks(yDomain[0], yDomain[1], height < 200 ? 4 : 5);
  const widest = Math.max(...yTicks.map((tick) => formatY(tick).length));
  const left = Math.round(widest * fontSize * 0.62) + fontSize;
  const top = fontSize * 2;
  const plot = {
    left,
    right: Math.max(left + 1, width - fontSize * 1.5),
    top,
    bottom: Math.max(top + 1, height - fontSize * 3.2),
  };

  const sx = useMemo(() => linear(xDomain, [plot.left, plot.right]), [xDomain, plot.left, plot.right]);
  const sy = useMemo(() => linear(yDomain, [plot.bottom, plot.top]), [yDomain, plot.bottom, plot.top]);
  const xTicks = niceTicks(xDomain[0], xDomain[1], width < 420 ? 4 : 6, true);

  const shapes = useMemo(
    () =>
      series.map((s) => {
        if (s.kind === 'line') {
          const d = s.points
            .map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`)
            .join('');
          return { series: s, d };
        }
        if (s.kind === 'band') {
          const upper = s.points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)} ${sy(p.hi).toFixed(1)}`);
          const lower = [...s.points].reverse().map((p) => `L${sx(p.x).toFixed(1)} ${sy(p.lo).toFixed(1)}`);
          return { series: s, d: `${upper.join('')}${lower.join('')}Z` };
        }
        return { series: s, d: '' };
      }),
    [series, sx, sy],
  );

  const named = series.filter((s) => s.label);
  const readable = named.filter((s) => s.kind !== 'rule');
  const anchor = readable.find((s) => s.kind === 'line') as LineSeries | undefined;
  const hoverPoint = hoverX === null || !anchor ? undefined : nearest(anchor.points, hoverX);

  const onPointer = (event: PointerEvent<SVGRectElement>) => {
    const box = event.currentTarget.ownerSVGElement!.getBoundingClientRect();
    const x = xDomain[0] + ((event.clientX - box.left - plot.left) / (plot.right - plot.left)) * (xDomain[1] - xDomain[0]);
    setHoverX(Math.min(xDomain[1], Math.max(xDomain[0], x)));
  };

  const onKey = (event: KeyboardEvent) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    if (!anchor?.points.length) return;
    event.preventDefault();
    const current = hoverPoint ?? anchor.points.at(-1)!;
    const i = anchor.points.indexOf(current as Point);
    const next = anchor.points[Math.min(anchor.points.length - 1, Math.max(0, i + (event.key === 'ArrowLeft' ? -1 : 1)))];
    setHoverX(next.x);
  };

  const tipOnRight = hoverPoint ? sx(hoverPoint.x) < (plot.left + plot.right) / 2 : true;

  return (
    <figure className="chart">
      <figcaption>
        <h3>{title}</h3>
        {(named.length > 1 || extraLegend) && (
          <ul className="legend">
            {extraLegend && (
              <li>
                <span className="key" style={{ borderTopColor: extraLegend.color }} />
                {extraLegend.label}
              </li>
            )}
            {named.map((s) => (
              <li key={s.key}>
                {s.kind === 'band' ? (
                  <span className="key key-band" style={{ background: s.color }} />
                ) : (
                  <span
                    className="key"
                    data-dashed={s.dashed || undefined}
                    style={{ borderTopColor: s.color }}
                  />
                )}
                {s.label}
              </li>
            ))}
          </ul>
        )}
      </figcaption>
      <div className="plot" ref={ref}>
        {width > 0 && height > 0 && (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={`${title}. ${summary}`}
            tabIndex={0}
            onKeyDown={onKey}
            onBlur={() => setHoverX(null)}
          >
            <defs>
              <clipPath id={clip}>
                <rect x={plot.left} y={plot.top} width={plot.right - plot.left} height={plot.bottom - plot.top} />
              </clipPath>
            </defs>

            {yTicks.map((tick) => (
              <g key={tick}>
                <line className="grid" x1={plot.left} x2={plot.right} y1={sy(tick)} y2={sy(tick)} data-zero={tick === 0 || undefined} />
                <text className="tick" x={plot.left - 8} y={sy(tick)} textAnchor="end" dominantBaseline="middle">
                  {formatY(tick)}
                </text>
              </g>
            ))}
            {xTicks.map((tick) => (
              <text key={tick} className="tick" x={sx(tick)} y={plot.bottom + fontSize * 1.45} textAnchor="middle">
                {integer(tick)}
              </text>
            ))}
            <line className="axis" x1={plot.left} x2={plot.right} y1={plot.bottom} y2={plot.bottom} />
            <line className="axis" x1={plot.left} x2={plot.left} y1={plot.top} y2={plot.bottom} />
            <text className="axis-title" x={plot.left} y={plot.top - fontSize * 0.6}>
              {yLabel}
            </text>
            <text className="axis-title" x={plot.right} y={height - 3} textAnchor="end">
              {xLabel}
            </text>

            <g clipPath={`url(#${clip})`}>
              {shapes.map(({ series: s, d }) => {
                if (s.kind === 'band') return <path key={s.key} d={d} fill={s.color} stroke="none" />;
                if (s.kind === 'rule') {
                  return (
                    <line
                      key={s.key}
                      x1={plot.left}
                      x2={plot.right}
                      y1={sy(s.y)}
                      y2={sy(s.y)}
                      stroke={s.color}
                      strokeWidth={1.5}
                      strokeDasharray={s.dashed ? '6 5' : undefined}
                    />
                  );
                }
                return (
                  <path
                    key={s.key}
                    d={d}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={s.width ?? 2}
                    strokeOpacity={s.opacity}
                    strokeDasharray={s.dashed ? '6 5' : undefined}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                );
              })}
            </g>

            {shapes.map(({ series: s }) => {
              if (s.kind !== 'line' || !s.endDot || !s.points.length) return null;
              const end = s.points.at(-1)!;
              return <circle key={s.key} className="end-dot" cx={sx(end.x)} cy={sy(end.y)} r={4.5} fill={s.color} />;
            })}

            {hoverPoint && (
              <line className="crosshair" x1={sx(hoverPoint.x)} x2={sx(hoverPoint.x)} y1={plot.top} y2={plot.bottom} />
            )}
            {anchor && (
              <rect
                className="hit"
                x={plot.left}
                y={plot.top}
                width={plot.right - plot.left}
                height={plot.bottom - plot.top}
                onPointerMove={onPointer}
                onPointerDown={onPointer}
                onPointerLeave={() => setHoverX(null)}
              />
            )}
          </svg>
        )}
        {hoverPoint && (
          <div
            className="tooltip"
            style={{
              [tipOnRight ? 'left' : 'right']: tipOnRight ? sx(hoverPoint.x) + 10 : width - sx(hoverPoint.x) + 10,
              top: plot.top + 4,
            }}
          >
            <strong>Lancio {integer(Math.round(hoverPoint.x))}</strong>
            {readable.map((s) => {
              if (s.kind === 'band') {
                const p = nearest(s.points, hoverPoint.x);
                return p ? (
                  <span key={s.key}>
                    <b>{formatY(p.lo)} … {formatY(p.hi)}</b> {s.label}
                  </span>
                ) : null;
              }
              const line = s as LineSeries;
              const p = nearest(line.points, hoverPoint.x);
              return p ? (
                <span key={s.key}>
                  <b>{formatY(p.y)}</b> {s.label}
                </span>
              ) : null;
            })}
          </div>
        )}
      </div>
      {caption && <p className="caption">{caption}</p>}
    </figure>
  );
}
