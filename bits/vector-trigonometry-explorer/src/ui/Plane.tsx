/** Grid, oriented axes, ticks and tick numbers (see plane.ts). */
import type { PlaneData } from './plane.ts';
import { rectOverlap } from './labels.ts';
import type { Rect } from './labels.ts';
import type { View } from './view.ts';

export default function Plane({
  view,
  data,
  axes = true,
  covered = [],
}: {
  view: View;
  data: PlaneData;
  axes?: boolean;
  /** Rectangles taken by labels: tick numbers underneath them are not drawn. */
  covered?: readonly Rect[];
}) {
  const { width, height } = view;
  const o = data.origin;
  const head = 9;
  return (
    <g className="plane" aria-hidden="true">
      {data.vertical.map((l) => (
        <line
          key={`v${l.px}`}
          className={l.major ? 'grid grid-major' : 'grid'}
          x1={l.px}
          x2={l.px}
          y1={0}
          y2={height}
        />
      ))}
      {data.horizontal.map((l) => (
        <line
          key={`h${l.px}`}
          className={l.major ? 'grid grid-major' : 'grid'}
          x1={0}
          x2={width}
          y1={l.px}
          y2={l.px}
        />
      ))}
      {axes && (
        <>
          <line className="axis" x1={0} x2={width - 2} y1={o.y} y2={o.y} />
          <path
            className="axis-head"
            d={`M${width - 1} ${o.y}l${-head * 1.5} ${-head * 0.6}v${head * 1.2}z`}
          />
          <line className="axis" x1={o.x} x2={o.x} y1={height} y2={2} />
          <path
            className="axis-head"
            d={`M${o.x} 1l${-head * 0.6} ${head * 1.5}h${head * 1.2}z`}
          />
          {data.xTicks.map((px) => (
            <line key={`tx${px}`} className="tick" x1={px} x2={px} y1={o.y - 4} y2={o.y + 4} />
          ))}
          {data.yTicks.map((py) => (
            <line key={`ty${py}`} className="tick" x1={o.x - 4} x2={o.x + 4} y1={py} y2={py} />
          ))}
          {data.ticks.map((t) =>
            covered.some((c) => rectOverlap(c, t.rect) > 0) ? null : (
              <text
                key={t.key}
                className="tick-label"
                x={t.rect.cx}
                y={t.rect.cy}
                textAnchor="middle"
                dominantBaseline="central"
              >
                {t.label}
              </text>
            ),
          )}
        </>
      )}
    </g>
  );
}
