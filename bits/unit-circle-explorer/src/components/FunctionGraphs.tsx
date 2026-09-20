/**
 * Function graphs: cos(α) and sin(α) displayed as proper Cartesian plots
 *
 * Shows the complete function curves as light reference, with current point highlighted.
 * A vertical guide at the current α value crosses both graphs, showing the synchronization.
 */
import './FunctionGraphs.css';

interface FunctionGraphsProps {
  currentAngle: number;
  currentSin: number;
  currentCos: number;
  t: any;
}

export default function FunctionGraphs({
  currentAngle,
  currentSin,
  currentCos,
  t,
}: FunctionGraphsProps) {
  const GRAPH_HEIGHT = 150; // pixels — wide and relatively shallow
  const MARGIN = { top: 15, right: 30, bottom: 40, left: 50 };
  const WIDTH = 600; // SVG viewBox units — wider for better domain visibility
  const HEIGHT = 180; // SVG viewBox units — shallower

  const innerWidth = WIDTH - MARGIN.left - MARGIN.right;
  const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

  // Scale functions: α is 0–360 on x-axis, value is -1 to 1 on y-axis
  const scaleX = (angle: number) => MARGIN.left + (angle / 360) * innerWidth;
  const scaleY = (value: number) => MARGIN.top + innerHeight - ((value + 1) / 2) * innerHeight;

  // Generate the complete smooth curve
  const generateCompleteCurve = (fn: (a: number) => number) => {
    const points: [number, number][] = [];
    for (let angle = 0; angle <= 360; angle += 5) {
      points.push([angle, fn((angle * Math.PI) / 180)]);
    }
    return points;
  };

  const cosCurve = generateCompleteCurve((rad) => Math.cos(rad));
  const sinCurve = generateCompleteCurve((rad) => Math.sin(rad));

  const renderGraph = (title: string, curve: [number, number][], currentValue: number, color: string) => {
    const pathData = curve
      .map(([angle, value], idx) => {
        const x = scaleX(angle);
        const y = scaleY(value);
        return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');

    const currentX = scaleX(currentAngle);
    const currentY = scaleY(currentValue);
    const originY = scaleY(0); // y=0 line — this is the X-AXIS

    return (
      <div key={title} className="graph-frame">
        <div className="graph-title">{title}</div>
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          className="graph-svg"
          style={{ height: `${GRAPH_HEIGHT}px` }}
        >
          {/* Background */}
          <rect width={WIDTH} height={HEIGHT} fill="white" />

          {/* Y-axis: vertical line at α = 0° (left edge) */}
          <line x1={MARGIN.left} y1={MARGIN.top} x2={MARGIN.left} y2={HEIGHT - MARGIN.bottom} className="axis-line" />

          {/* X-axis: horizontal line at y = 0 (middle) — THIS IS THE MATHEMATICAL X-AXIS */}
          <line
            x1={MARGIN.left}
            y1={originY}
            x2={WIDTH - MARGIN.right}
            y2={originY}
            className="axis-line"
          />

          {/* Y-axis ticks and labels (-1, 0, 1) */}
          {[-1, 0, 1].map((val) => {
            const y = scaleY(val);
            // Omit the middle (0) label to avoid redundancy with the x-axis
            if (val === 0) return null;
            return (
              <g key={`ytick-${val}`}>
                <line x1={MARGIN.left - 6} y1={y} x2={MARGIN.left} y2={y} className="tick" />
                <text x={MARGIN.left - 12} y={y + 4} className="tick-label" textAnchor="end">
                  {val}
                </text>
              </g>
            );
          })}

          {/* X-axis ticks and labels (0°, 90°, 180°, 270°, 360°) — positioned below the actual x-axis */}
          {[0, 90, 180, 270, 360].map((angle) => {
            const x = scaleX(angle);
            return (
              <g key={`xtick-${angle}`}>
                <line x1={x} y1={originY - 5} x2={x} y2={originY + 5} className="tick" />
                {/* Skip the 0° label at origin to avoid collision; it's implied by the y-axis */}
                {angle !== 0 && (
                  <text x={x} y={originY + 16} className="tick-label" textAnchor="middle">
                    {angle}°
                  </text>
                )}
              </g>
            );
          })}

          {/* Dependent variable label (cos α / sin α) — positioned cleanly at upper left */}
          <text x={MARGIN.left + 5} y={MARGIN.top + 12} className="axis-label-y">
            {title}
          </text>

          {/* Independent variable label (α) — positioned at the right end of the x-axis */}
          <text x={WIDTH - MARGIN.right - 8} y={originY - 8} className="axis-label-x">
            α
          </text>

          {/* Complete function curve (light reference) */}
          <path d={pathData} className="function-curve" stroke={color} />

          {/* Vertical guide at current α */}
          <line
            x1={currentX}
            y1={MARGIN.top}
            x2={currentX}
            y2={HEIGHT - MARGIN.bottom}
            className="current-guide"
            stroke="#ddd"
            strokeWidth="1.5"
            strokeDasharray="3,3"
          />

          {/* Current point, prominently highlighted */}
          <circle cx={currentX} cy={currentY} r="4" className="current-point" fill={color} />
          <circle
            cx={currentX}
            cy={currentY}
            r="5.5"
            className="current-point-ring"
            fill="none"
            stroke={color}
            strokeWidth="0.8"
            opacity="0.6"
          />
        </svg>
      </div>
    );
  };

  return (
    <div className="function-graphs">
      <div className="graphs-title">{t.functions}</div>
      {renderGraph('cos α', cosCurve, currentCos, '#d1495b')}
      {renderGraph('sin α', sinCurve, currentSin, '#2a9d8f')}
    </div>
  );
}
