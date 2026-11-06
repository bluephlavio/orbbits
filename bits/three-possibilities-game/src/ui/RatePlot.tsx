/**
 * Frequencies on one shared scale from 0% to 100%, one row per strategy. A row can show a value
 * with its uncertainty, a cloud of marks (one per session or series), and the theoretical value.
 * Plain HTML positioned in percent: it reflows by itself, and text keeps its size on any screen.
 */
import type { CSSProperties } from 'react';
import { percent } from './format.ts';

export interface Row {
  key: string;
  label: string;
  color: string;
  /** The observed frequency, if there is one to show. */
  value?: number | null;
  interval?: readonly [number, number] | null;
  /** One point each: sessions, or simulated series. */
  marks?: readonly number[];
  theory?: number;
  /** Written out, so that the plot can be read without hovering. */
  note: string;
  /** Too few data to take the row at face value. */
  faint?: boolean;
}

interface Props {
  title: string;
  caption?: string;
  summary: string;
  rows: readonly Row[];
  /** Which marks the legend has to explain. */
  legend: { value?: boolean; interval?: boolean; marks?: string; theory?: boolean };
}

const AXIS = [0, 0.25, 0.5, 0.75, 1];
const at = (share: number) => `${share * 100}%`;

export default function RatePlot({ title, caption, summary, rows, legend }: Props) {
  return (
    <figure className="chart rateplot">
      <figcaption>
        <h3>{title}</h3>
        <ul className="legend">
          {legend.value && (
            <li>
              <span className="legend-dot" /> Frequenza osservata
            </li>
          )}
          {legend.interval && (
            <li>
              <span className="legend-whisker" /> Margine d’incertezza (95%)
            </li>
          )}
          {legend.marks && (
            <li>
              <span className="legend-dot legend-small" /> {legend.marks}
            </li>
          )}
          {legend.theory && (
            <li>
              <span className="legend-diamond" /> Probabilità teorica
            </li>
          )}
        </ul>
      </figcaption>
      <div className="rp" role="img" aria-label={`${title}. ${summary}`}>
        {rows.map((row) => (
          <div className="rp-row" key={row.key} data-faint={row.faint || undefined} style={{ '--rp-color': row.color } as CSSProperties}>
            <span className="rp-label">
              <b>{row.label}</b>
              <small>{row.note}</small>
            </span>
            <span className="rp-track">
              {AXIS.map((tick) => (
                <i className="rp-grid" key={tick} style={{ left: at(tick) }} />
              ))}
              {row.interval && (
                <i className="rp-whisker" style={{ left: at(row.interval[0]), width: at(row.interval[1] - row.interval[0]) }} />
              )}
              {row.marks?.map((mark, i) => (
                <i className="rp-mark" key={i} style={{ left: at(mark) }} />
              ))}
              {row.value != null && <i className="rp-dot" style={{ left: at(row.value) }} />}
              {row.theory != null && <i className="rp-theory" style={{ left: at(row.theory) }} />}
            </span>
          </div>
        ))}
        <div className="rp-row rp-axis-row">
          <span className="rp-label" />
          <span className="rp-axis">
            {AXIS.map((tick) => (
              <span key={tick} style={{ left: at(tick) }}>
                {percent(tick, 0)}
              </span>
            ))}
          </span>
        </div>
      </div>
      {caption && <p className="caption">{caption}</p>}
    </figure>
  );
}

