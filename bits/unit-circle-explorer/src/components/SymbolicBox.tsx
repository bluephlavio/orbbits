/**
 * Symbolic representation: shows the bridge between coordinates and function values
 *
 * P = (xP, yP)
 * xP = cos α
 * yP = sin α
 *
 * Shows both exact fraction form (as multiple of π) and decimal radians.
 */
import './SymbolicBox.css';

interface SymbolicBoxProps {
  angle: number;
  xP: number;
  yP: number;
  t: any;
}

// Compute gcd
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

// Convert degrees to exact fraction of π with reduction
function formatRadians(angleDeg: number): { exact: string; decimal: number } {
  const angleRad = (angleDeg * Math.PI) / 180;

  // Express as fraction of π: α_deg * π / 180
  let numerator = Math.round(angleDeg);
  let denominator = 180;

  // Reduce the fraction
  const g = gcd(Math.abs(numerator), denominator);
  numerator /= g;
  denominator /= g;

  // Format the exact fraction
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

export default function SymbolicBox({ angle, xP, yP }: SymbolicBoxProps) {
  const { exact: exactRad, decimal: decimalRad } = formatRadians(angle);

  return (
    <div className="symbolic-box">
      <div className="equation">
        <span className="symbol">P</span>
        <span> = (</span>
        <span className="value cos-color">{xP.toFixed(3)}</span>
        <span>, </span>
        <span className="value sin-color">{yP.toFixed(3)}</span>
        <span>)</span>
      </div>

      <div className="equation">
        <span className="symbol">x_P</span>
        <span> = </span>
        <span className="function-name">cos α</span>
      </div>

      <div className="equation">
        <span className="symbol">y_P</span>
        <span> = </span>
        <span className="function-name">sin α</span>
      </div>

      <div className="angle-display">
        <div>
          <span className="symbol">α</span>
          <span> = {angle.toFixed(0)}°</span>
        </div>
        <div className="radians">
          <span>{exactRad}</span>
          <span className="decimal"> ≈ {decimalRad.toFixed(3)}</span>
        </div>
      </div>
    </div>
  );
}
