/** A vector drawn in pixels: shaft and head from arrow.ts, or a point when it has no length. */
import type { Vec } from '../model/vec.ts';
import { arrowShape } from './arrow.ts';

export default function Arrow({
  tail,
  tip,
  width,
  className,
  dashed = false,
}: {
  tail: Vec;
  tip: Vec;
  width: number;
  className: string;
  dashed?: boolean;
}) {
  const shape = arrowShape(tail, tip, width);
  if (shape.point) {
    return (
      <g className={`arrow ${className}`}>
        <circle className="arrow-point" cx={tail.x} cy={tail.y} r={width * 1.25 + 1.5} />
      </g>
    );
  }
  return (
    <g className={`arrow ${className}`}>
      {shape.shaft && (
        <line
          className="arrow-shaft"
          x1={shape.shaft[0].x}
          y1={shape.shaft[0].y}
          x2={shape.shaft[1].x}
          y2={shape.shaft[1].y}
          strokeWidth={width}
          strokeDasharray={dashed ? `${width * 2.4} ${width * 1.8}` : undefined}
        />
      )}
      {shape.head && <path className="arrow-head" d={shape.head} />}
    </g>
  );
}
