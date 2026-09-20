/**
 * Symbolic representation: shows the bridge between coordinates and function values
 *
 * P = (xP, yP)
 * xP = cos α
 * yP = sin α
 */
import './SymbolicBox.css';

interface SymbolicBoxProps {
  angle: number;
  xP: number;
  yP: number;
  t: any;
}

export default function SymbolicBox({ angle, xP, yP }: SymbolicBoxProps) {
  const angleRad = (angle * Math.PI) / 180;
  const piRatio = angleRad / Math.PI;

  let angleStr = `${angle.toFixed(0)}°`;
  if (piRatio !== 0) {
    if (Math.abs(piRatio - 1) < 0.01) {
      angleStr += ' = π';
    } else if (Math.abs(piRatio - 0.5) < 0.01) {
      angleStr += ' = π/2';
    } else if (piRatio % 1 === 0) {
      angleStr += ` = ${piRatio.toFixed(0)}π`;
    } else {
      const num = Math.round(piRatio * 12);
      const denom = 12;
      const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
      const g = gcd(Math.abs(num), denom);
      angleStr += ` = ${num / g}π/${denom / g}`;
    }
  }

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
        <span className="symbol">α</span>
        <span> = {angleStr}</span>
      </div>
    </div>
  );
}
