/**
 * Observation table: discrete observations of (α, xP, yP) pairs
 *
 * Accumulates as the learner moves P, particularly at notable angles.
 * Clicking a row restores that angle.
 */
import './ObservationTable.css';

interface Observation {
  angle: number;
  xP: number;
  yP: number;
  isNotable: boolean;
}

interface ObservationTableProps {
  observations: Observation[];
  currentAngle: number;
  onObservationClick: (obs: Observation) => void;
  onRecordObservation: (angle: number) => void;
  t: any;
}

export default function ObservationTable({
  observations,
  currentAngle,
  onObservationClick,
  onRecordObservation,
  t,
}: ObservationTableProps) {
  const isCurrentObservation = (angle: number) => Math.abs(angle - currentAngle) < 0.5;

  const handleRecordClick = () => {
    onRecordObservation(currentAngle);
  };

  return (
    <div className="observation-table-container">
      <div className="table-header">
        <span className="table-title">{t.observations}</span>
        <button className="record-button" onClick={handleRecordClick} title="Record current observation">
          ⊕ {t.record}
        </button>
      </div>

      <div className="table-wrapper">
        <table className="observation-table">
          <thead>
            <tr>
              <th>α</th>
              <th>x_P</th>
              <th>y_P</th>
            </tr>
          </thead>
          <tbody>
            {observations.length === 0 ? (
              <tr className="empty-row">
                <td colSpan={3}>Move P to record observations</td>
              </tr>
            ) : (
              observations.map((obs, idx) => (
                <tr
                  key={idx}
                  className={`observation-row ${isCurrentObservation(obs.angle) ? 'current' : ''} ${
                    obs.isNotable ? 'notable' : ''
                  }`}
                  onClick={() => onObservationClick(obs)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      onObservationClick(obs);
                    }
                  }}
                >
                  <td className="angle-cell">{obs.angle.toFixed(0)}°</td>
                  <td className="value-cell cos-color">{obs.xP.toFixed(3)}</td>
                  <td className="value-cell sin-color">{obs.yP.toFixed(3)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
