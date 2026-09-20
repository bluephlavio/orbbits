/**
 * Function graphs: sin(α) and cos(α) stacked vertically with shared α-axis
 *
 * Shows traced points as the learner moves P. Current points are highlighted.
 * A vertical guide at the current α value crosses both graphs.
 */
import './FunctionGraphs.css';

interface FunctionGraphsProps {
  sinPoints: [number, number][];
  cosPoints: [number, number][];
  currentAngle: number;
  currentSin: number;
  currentCos: number;
  t: any;
}

export default function FunctionGraphs({
  sinPoints,
  cosPoints,
  currentAngle,
  currentSin,
  currentCos,
  t,
}: FunctionGraphsProps) {
  const GRAPH_WIDTH = 280;
  const GRAPH_HEIGHT = 150;
  const PADDING = 30;
  const INNER_WIDTH = GRAPH_WIDTH - 2 * PADDING;
  const INNER_HEIGHT = GRAPH_HEIGHT - 2 * PADDING;

  // Scale coordinates: α is 0–360 on x-axis, value is -1 to 1 on y-axis
  const scaleX = (angle: number) => PADDING + (angle / 360) * INNER_WIDTH;
  const scaleY = (value: number) => PADDING + INNER_HEIGHT - ((value + 1) / 2) * INNER_HEIGHT;

  // Generate a smooth curve for reference (optional background trace)
  const generateReferenceCurve = (fn: (a: number) => number) => {
    const points: [number, number][] = [];
    for (let angle = 0; angle <= 360; angle += 10) {
      points.push([angle, fn((angle * Math.PI) / 180)]);
    }
    return points;
  };

  const sinRefCurve = generateReferenceCurve((rad) => Math.sin(rad));
  const cosRefCurve = generateReferenceCurve((rad) => Math.cos(rad));

  const renderGraph = (
    title: string,
    points: [number, number][],
    refCurve: [number, number][],
    currentValue: number,
    color: string
  ) => {
    const pathData = refCurve
      .map(([angle, value], idx) => {
        const x = scaleX(angle);
        const y = scaleY(value);
        return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');

    const tracedPath = points
      .map(([angle, value], idx) => {
        const x = scaleX(angle);
        const y = scaleY(value);
        return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');

    const currentX = scaleX(currentAngle);
    const gridLines: { angle: number; label: string }[] = [
      { angle: 0, label: '0°' },
      { angle: 90, label: '90°' },
      { angle: 180, label: '180°' },
      { angle: 270, label: '270°' },
    ];

    return (
      <div key={title} className="graph-frame">
        <div className="graph-title">{title}</div>
        <svg width={GRAPH_WIDTH} height={GRAPH_HEIGHT} className="graph-svg">
          {/* Grid and axes */}
          <g className="grid">
            {/* Horizontal grid lines at -1, -0.5, 0, 0.5, 1 */}
            {[-1, -0.5, 0, 0.5, 1].map((value) => {
              const y = scaleY(value);
              return (
                <g key={`grid-${value}`}>
                  <line x1={PADDING} y1={y} x2={GRAPH_WIDTH - PADDING} y2={y} className="grid-line" />
                  <text x={PADDING - 5} y={y + 4} className="grid-label">
                    {value === 0 ? '0' : value > 0 ? '+' : ''}{value.toFixed(1)}
                  </text>
                </g>
              );
            })}

            {/* Vertical grid lines at quadrant boundaries */}
            {gridLines.map(({ angle }) => {
              const x = scaleX(angle);
              return (
                <g key={`vgrid-${angle}`}>
                  <line x1={x} y1={PADDING} x2={x} y2={GRAPH_HEIGHT - PADDING} className="vgrid-line" />
                </g>
              );
            })}
          </g>

          {/* Reference curve (faint background) */}
          <path d={pathData} className="reference-curve" stroke={color} opacity="0.15" />

          {/* Traced path by learner */}
          {tracedPath && <path d={tracedPath} className="traced-path" stroke={color} strokeWidth="2" />}

          {/* Traced points */}
          {points.map(([angle, value], idx) => {
            const x = scaleX(angle);
            const y = scaleY(value);
            const isCurrent = Math.abs(angle - currentAngle) < 2;
            return (
              <circle
                key={`point-${idx}`}
                cx={x}
                cy={y}
                r={isCurrent ? 4 : 2.5}
                className={`traced-point ${isCurrent ? 'current' : ''}`}
                fill={color}
              />
            );
          })}

          {/* Current vertical guide at α */}
          <line
            x1={currentX}
            y1={PADDING}
            x2={currentX}
            y2={GRAPH_HEIGHT - PADDING}
            className="current-guide"
            stroke="#999"
            strokeWidth="1"
            strokeDasharray="3,3"
          />

          {/* Current point highlight */}
          {points.length > 0 && (
            <circle
              cx={scaleX(currentAngle)}
              cy={scaleY(currentValue)}
              r="4.5"
              className="current-point-highlight"
              fill={color}
              opacity="0.8"
            />
          )}

          {/* Axes */}
          <line x1={PADDING} y1={PADDING} x2={PADDING} y2={GRAPH_HEIGHT - PADDING} className="axis" />
          <line x1={PADDING} y1={GRAPH_HEIGHT - PADDING} x2={GRAPH_WIDTH - PADDING} y2={GRAPH_HEIGHT - PADDING} className="axis" />

          {/* Axis labels */}
          {gridLines.map(({ angle: angleVal, label }) => {
            const x = scaleX(angleVal);
            return (
              <text key={`label-${angleVal}`} x={x} y={GRAPH_HEIGHT - 8} className="axis-label" textAnchor="middle">
                {label}
              </text>
            );
          })}

          {/* Y-axis label */}
          <text x="12" y={PADDING - 5} className="axis-label-y">
            f(α)
          </text>
        </svg>
      </div>
    );
  };

  return (
    <div className="function-graphs">
      <div className="graphs-title">{t.functions}</div>
      {renderGraph('sin α', sinPoints, sinRefCurve, currentSin, '#2a9d8f')}
      {renderGraph('cos α', cosPoints, cosRefCurve, currentCos, '#d1495b')}
      <div className="graphs-note">Click points to jump to that angle</div>
    </div>
  );
}
