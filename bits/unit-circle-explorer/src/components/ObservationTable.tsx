/**
 * Values table: canonical sampling of sin and cos
 *
 * Shows a curated set of reference angles plus the current angle.
 * Single unified table with current row highlighted for easy comparison.
 * Includes compact angle representation with radians at the top.
 */
import './ObservationTable.css';

interface ObservationTableProps {
  currentAngle: number;
  onAngleClick: (angle: number) => void;
  t: any;
}

const CANONICAL_ANGLES = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330];
const WINDOW_SIZE = 7; // number of rows to show around current angle

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

function formatRadians(angleDeg: number): { exact: string; decimal: number } {
  const angleRad = (angleDeg * Math.PI) / 180;
  let numerator = Math.round(angleDeg);
  let denominator = 180;
  const g = gcd(Math.abs(numerator), denominator);
  numerator /= g;
  denominator /= g;

  let exact = '';
  if (numerator === 0) {
    exact = '0 rad';
  } else if (numerator === denominator) {
    exact = 'π rad';
  } else if (denominator === 1) {
    exact = `${numerator}π rad`;
  } else {
    exact = `${numerator}π/${denominator} rad`;
  }

  return { exact, decimal: angleRad };
}

export default function ObservationTable({
  currentAngle,
  onAngleClick,
  t,
}: ObservationTableProps) {
  const { exact: exactRad, decimal: decimalRad } = formatRadians(currentAngle);
  // Build the angle set: canonical angles + current angle (if not already included)
  let angleSet = [...CANONICAL_ANGLES];
  const currentRounded = Math.round(currentAngle);
  if (!angleSet.some((a) => Math.abs(a - currentAngle) < 0.5)) {
    angleSet.push(currentRounded);
  }
  angleSet = angleSet.sort((a, b) => a - b);

  // Find the index of the current angle in the set
  const currentIdx = angleSet.findIndex((a) => Math.abs(a - currentAngle) < 0.5);

  // Create a window around the current angle
  const halfWindow = Math.floor(WINDOW_SIZE / 2);
  const startIdx = Math.max(0, currentIdx - halfWindow);
  const endIdx = Math.min(angleSet.length - 1, currentIdx + halfWindow);

  // Adjust if we're near the beginning or end
  const adjustedStart = Math.max(0, endIdx - WINDOW_SIZE + 1);
  const adjustedEnd = Math.min(angleSet.length - 1, adjustedStart + WINDOW_SIZE - 1);

  const visibleAngles = angleSet.slice(adjustedStart, adjustedEnd + 1);

  const calculateTrig = (angleDeg: number) => {
    const angleRad = (angleDeg * Math.PI) / 180;
    return {
      cos: Math.cos(angleRad),
      sin: Math.sin(angleRad),
    };
  };

  return (
    <div className="observation-table-container">
      <div className="compact-angle-display">
        <span className="angle-deg">{currentAngle.toFixed(0)}°</span>
        <span className="angle-equals">=</span>
        <span className="angle-exact">{exactRad}</span>
        <span className="angle-decimal">≈ {decimalRad.toFixed(3)} rad</span>
      </div>

      <div className="table-title">{t.reference_values}</div>
      <table className="values-table">
        <tbody>
          {visibleAngles.map((angle) => {
            const { cos: xP, sin: yP } = calculateTrig(angle);
            const isCurrentAngle = Math.abs(angle - currentAngle) < 0.5;
            return (
              <tr
                key={angle}
                className={isCurrentAngle ? 'current-row' : 'reference-row'}
                onClick={() => onAngleClick(angle)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onAngleClick(angle);
                  }
                }}
              >
                <td className="angle-cell">{angle}°</td>
                <td className="value-cell cos-color">{xP.toFixed(3)}</td>
                <td className="value-cell sin-color">{yP.toFixed(3)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
