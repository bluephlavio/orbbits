/**
 * Reference observations: input-output pairs at notable angles
 *
 * Shows current α prominently, plus a few nearby reference angles for comparison.
 * Designed to support understanding of input-output relationships, not as a history log.
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
  t: any;
}

export default function ObservationTable({
  observations,
  currentAngle,
  onObservationClick,
  t,
}: ObservationTableProps) {
  // Find the current observation
  const currentObs = observations.find((obs) => Math.abs(obs.angle - currentAngle) < 0.5);

  // Select reference observations (notable angles, max 4-5)
  const references = observations.filter((obs) => obs.isNotable && !currentObs || Math.abs(obs.angle - currentAngle) > 1).slice(0, 5);

  return (
    <div className="observation-table-container">
      <div className="table-title">{t.reference_values}</div>

      <div className="current-observation">
        <div className="label">α attuale:</div>
        <table className="compact-table">
          <tbody>
            {currentObs ? (
              <tr className="current-row">
                <td className="angle-cell">{currentObs.angle.toFixed(0)}°</td>
                <td className="value-cell cos-color">{currentObs.xP.toFixed(3)}</td>
                <td className="value-cell sin-color">{currentObs.yP.toFixed(3)}</td>
              </tr>
            ) : (
              <tr className="empty-row">
                <td colSpan={3}>—</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {references.length > 0 && (
        <div className="reference-observations">
          <div className="label">Angoli di riferimento:</div>
          <table className="compact-table">
            <tbody>
              {references.map((obs, idx) => (
                <tr
                  key={idx}
                  className="reference-row"
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
