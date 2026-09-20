/**
 * Function graphs: sin(α) and cos(α) stacked vertically with shared α-axis
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
  const GRAPH_WIDTH = 280;
  const GRAPH_HEIGHT = 140;
  const PADDING = 40;
  const INNER_WIDTH = GRAPH_WIDTH - PADDING;
  const INNER_HEIGHT = GRAPH_HEIGHT - 2 * PADDING;

  // Scale coordinates: α is 0–360 on x-axis, value is -1 to 1 on y-axis
  const scaleX = (angle: number) => PADDING + (angle / 360) * INNER_WIDTH;
  const scaleY = (value: number) => PADDING + INNER_HEIGHT - ((value + 1) / 2) * INNER_HEIGHT;

  // Generate the complete smooth curve
  const generateCompleteCurve = (fn: (a: number) => number) => {
    const points: [number, number][] = [];
    for (let angle = 0; angle <= 360; angle += 5) {
      points.push([angle, fn((angle * Math.PI) / 180)]);
    }
    return points;
  };

  const sinCurve = generateCompleteCurve((rad) => Math.sin(rad));
  const cosCurve = generateCompleteCurve((rad) => Math.cos(rad));

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

    return (
      <div key={title} className="graph-frame">
        <div className="graph-title">{title}</div>
        <svg width={GRAPH_WIDTH} height={GRAPH_HEIGHT} className="graph-svg">
          {/* Axes and grid */}
          <g className="axes-grid">
            {/* Y-axis and values */}
            <line
              x1={PADDING - 5}
              y1={PADDING}
              x2={PADDING - 5}
              y2={GRAPH_HEIGHT - PADDING}
              className="axis-line"
            />

            {/* Y-axis ticks and labels at -1, 0, 1 */}
            {[-1, 0, 1].map((value) => {
              const y = scaleY(value);
              return (
                <g key={`ytick-${value}`}>
                  <line x1={PADDING - 10} y1={y} x2={PADDING - 5} y2={y} className="tick" />
                  <text x={PADDING - 13} y={y + 3} className="tick-label">
                    {value}
                  </text>
                </g>
              );
            })}

            {/* X-axis */}
            <line
              x1={PADDING - 5}
              y1={GRAPH_HEIGHT - PADDING}
              x2={GRAPH_WIDTH}
              y2={GRAPH_HEIGHT - PADDING}
              className="axis-line"
            />

            {/* X-axis ticks and labels at key angles */}
            {[0, 90, 180, 270, 360].map((angle) => {
              const x = scaleX(angle);
              return (
                <g key={`xtick-${angle}`}>
                  <line x1={x} y1={GRAPH_HEIGHT - PADDING} x2={x} y2={GRAPH_HEIGHT - PADDING + 5} className="tick" />
                  <text x={x} y={GRAPH_HEIGHT - PADDING + 15} className="tick-label" textAnchor="middle">
                    {angle}°
                  </text>
                </g>
              );
            })}

            {/* Axis labels */}
            <text x={PADDING / 2 - 5} y={PADDING - 5} className="axis-label-y">
              {title}
            </text>
          </g>

          {/* Subtle grid lines for readability */}
          {[0].map((value) => {
            const y = scaleY(value);
            return (
              <line
                key={`gridline-${value}`}
                x1={PADDING - 5}
                y1={y}
                x2={GRAPH_WIDTH}
                y2={y}
                className="grid-line"
              />
            );
          })}

          {/* Complete function curve (light reference) */}
          <path d={pathData} className="function-curve" stroke={color} />

          {/* Vertical guide at current α */}
          <line
            x1={currentX}
            y1={PADDING}
            x2={currentX}
            y2={GRAPH_HEIGHT - PADDING}
            className="current-guide"
            stroke="#ccc"
            strokeWidth="1.5"
            strokeDasharray="2,2"
          />

          {/* Current point, prominently highlighted */}
          <circle cx={currentX} cy={currentY} r="5" className="current-point" fill={color} opacity="0.9" />
          <circle
            cx={currentX}
            cy={currentY}
            r="6.5"
            className="current-point-ring"
            fill="none"
            stroke={color}
            strokeWidth="1"
            opacity="0.5"
          />
        </svg>
      </div>
    );
  };

  return (
    <div className="function-graphs">
      <div className="graphs-title">{t.functions}</div>
      {renderGraph('sin α', sinCurve, currentSin, '#2a9d8f')}
      {renderGraph('cos α', cosCurve, currentCos, '#d1495b')}
    </div>
  );
}
