/**
 * How sessions end: a histogram of final results in plain SVG, sized in real pixels like Chart.
 * A few distinct values (a martingale's +1 and −63) get one bar each, on their exact value, with
 * the share written above, so that a 2% bar is still read. The mean is marked: it is the number
 * the tallest bar hides.
 */
import { useEffect, useRef, useState } from 'react';
import type { Bin } from '../game/lab.ts';
import { integer, percent, signed } from './format.ts';
import { linear, niceTicks } from './scale.ts';

interface Props {
  title: string;
  bins: readonly Bin[];
  total: number;
  domain: readonly [number, number];
  color: string;
  mean: number | null;
  formatMean: (value: number) => string;
}

function useSize() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0, fontSize: 13 });
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width: Math.round(width), height: Math.round(height), fontSize: Number.parseFloat(getComputedStyle(element).fontSize) });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, ...size };
}

export default function Histogram({ title, bins, total, domain, color, mean, formatMean }: Props) {
  const { ref, width, height, fontSize } = useSize();
  const discrete = bins.every((b) => b.lo === b.hi);
  const top = Math.max(0.05, ...bins.map((b) => b.count / Math.max(1, total)));
  const yMax = top > 0.5 ? 1.12 : Math.min(1, niceTicks(0, top * 1.15, 4).at(-1)! || top);

  const plot = {
    left: fontSize * 3.9,
    right: Math.max(fontSize * 4, width - fontSize * 1.2),
    top: fontSize * 2.4,
    bottom: Math.max(fontSize * 3, height - fontSize * 2.6),
  };
  const sx = linear(domain, [plot.left, plot.right]);
  const sy = linear([0, yMax], [plot.bottom, plot.top]);
  const yTicks = niceTicks(0, Math.min(1, yMax), height < 180 ? 2 : 4);
  const xTicks = niceTicks(domain[0], domain[1], width < 420 ? 4 : 6, true);
  const barWidth = Math.max(6, Math.min(fontSize * 1.6, (plot.right - plot.left) / 30));

  const label = mean === null ? '' : `media ${formatMean(mean)}`;
  const meanX = mean === null ? 0 : sx(mean);
  const labelRight = meanX < (plot.left + plot.right) / 2;

  return (
    <figure className="chart histogram">
      <figcaption>
        <h3>{title}</h3>
      </figcaption>
      <div className="plot" ref={ref}>
        {width > 0 && height > 0 && (
          <svg width={width} height={height} role="img" aria-label={`${title}. ${bins
            .filter((b) => b.count)
            .map((b) => `${discrete ? signed(b.lo) : `da ${integer(b.lo)} a ${integer(b.hi)}`}: ${percent(b.count / total)}`)
            .join('; ')}. ${label}.`}>
            {yTicks.map((tick) => (
              <g key={tick}>
                <line className="grid" x1={plot.left} x2={plot.right} y1={sy(tick)} y2={sy(tick)} />
                <text className="tick" x={plot.left - 8} y={sy(tick)} textAnchor="end" dominantBaseline="middle">
                  {percent(tick, 0)}
                </text>
              </g>
            ))}
            {xTicks.map((tick) => (
              <text key={tick} className="tick" x={sx(tick)} y={plot.bottom + fontSize * 1.45} textAnchor="middle">
                {signed(tick)}
              </text>
            ))}
            <line className="axis" x1={plot.left} x2={plot.right} y1={plot.bottom} y2={plot.bottom} />
            {domain[0] < 0 && domain[1] > 0 && (
              <line className="zero" x1={sx(0)} x2={sx(0)} y1={plot.top - fontSize * 0.4} y2={plot.bottom} />
            )}

            {bins.map((b, i) => {
              if (!b.count) return null;
              const share = b.count / total;
              const x0 = discrete ? sx(b.lo) - barWidth / 2 : sx(b.lo) + 0.5;
              const w = discrete ? barWidth : Math.max(1, sx(b.hi) - sx(b.lo) - 1);
              const y = Math.min(sy(share), plot.bottom - 2);
              return (
                <g key={i}>
                  <rect className="bar" x={x0} y={y} width={w} height={plot.bottom - y} rx={Math.min(3, w / 3)} fill={color}>
                    <title>{`${discrete ? signed(b.lo) : `da ${integer(b.lo)} a ${integer(b.hi)}`}: ${integer(b.count)} sessioni (${percent(share)})`}</title>
                  </rect>
                  {discrete && (
                    <text className="bar-label" x={x0 + w / 2} y={y - fontSize * 0.5} textAnchor="middle">
                      {percent(share)}
                    </text>
                  )}
                </g>
              );
            })}

            {mean !== null && (
              <g className="mean">
                <line x1={meanX} x2={meanX} y1={plot.top - fontSize * 0.2} y2={plot.bottom} />
                <text
                  x={meanX + (labelRight ? 6 : -6)}
                  y={discrete ? (plot.top + plot.bottom) / 2 : plot.top - fontSize * 0.5}
                  textAnchor={labelRight ? 'start' : 'end'}
                >
                  {label}
                </text>
              </g>
            )}
            <text className="axis-title" x={plot.right} y={height - 3} textAnchor="end">
              risultato della sessione (gettoni)
            </text>
          </svg>
        )}
      </div>
    </figure>
  );
}
