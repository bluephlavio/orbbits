/**
 * Control panel: slider and reset button
 *
 * Dragging P is primary; the slider provides precise angle control.
 */
import './ControlPanel.css';

interface ControlPanelProps {
  angle: number;
  onAngleChange: (angle: number) => void;
  onReset: () => void;
  t: any;
}

export default function ControlPanel({ angle, onAngleChange, onReset, t }: ControlPanelProps) {
  return (
    <div className="control-panel">
      <label className="angle-slider-label">
        <span className="label-text">α</span>
        <input
          type="range"
          min="0"
          max="360"
          step="1"
          value={Math.round(angle)}
          onChange={(e) => onAngleChange(Number(e.target.value))}
          aria-label={t.angle_slider}
          className="slider-input"
        />
        <output className="angle-output">{angle.toFixed(0)}°</output>
      </label>

      <button type="button" onClick={onReset} className="reset-button">
        {t.reset}
      </button>
    </div>
  );
}
