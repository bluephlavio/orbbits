/**
 * __BIT_TITLE__
 *
 * OrbBits interactive conventions (docs/style/interactive.md):
 * - the default export is the whole Bit and depends on nothing from the page around it;
 * - responsive: fill the container width, keep an aspect ratio, work with touch;
 * - controls are accessible (<label>, <input type="range">, <button>) and there is a reset;
 * - styles are scoped under a class named after the Bit id.
 */
import { useState } from 'react';
import './styles.css';

const DEFAULTS = { amplitude: 1, frequency: 1 };

export default function __BIT_CLASS__() {
  const [amplitude, setAmplitude] = useState(DEFAULTS.amplitude);
  const [frequency, setFrequency] = useState(DEFAULTS.frequency);

  const reset = () => {
    setAmplitude(DEFAULTS.amplitude);
    setFrequency(DEFAULTS.frequency);
  };

  // Sample y = A sin(f x) on [-π, π] in a 16:9 viewBox.
  const W = 160;
  const H = 90;
  const points = Array.from({ length: 200 }, (_, i) => {
    const x = -Math.PI + (2 * Math.PI * i) / 199;
    const y = amplitude * Math.sin(frequency * x);
    return `${((x + Math.PI) / (2 * Math.PI)) * W},${H / 2 - y * (H / 5)}`;
  }).join(' ');

  return (
    <div className="__BIT_ID__">
      <svg className="stage" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Sine wave">
        <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="#bbb" strokeWidth="0.4" />
        <line x1={W / 2} y1="0" x2={W / 2} y2={H} stroke="#bbb" strokeWidth="0.4" />
        <polyline points={points} fill="none" stroke="#1f5fbf" strokeWidth="1" />
      </svg>
      <div className="controls">
        <label>
          A
          <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={amplitude}
            onChange={(e) => setAmplitude(Number(e.target.value))}
          />
          <output>{amplitude.toFixed(2)}</output>
        </label>
        <label>
          f
          <input
            type="range"
            min="0.5"
            max="4"
            step="0.1"
            value={frequency}
            onChange={(e) => setFrequency(Number(e.target.value))}
          />
          <output>{frequency.toFixed(1)}</output>
        </label>
        <button type="button" onClick={reset}>
          Reset
        </button>
      </div>
    </div>
  );
}
