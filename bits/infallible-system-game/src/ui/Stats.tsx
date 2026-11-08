/** Stat tiles shared by every analysis tab. */
import type { ReactNode } from 'react';

interface StatProps {
  label: string;
  value: ReactNode;
  /** A short comparison under the value, e.g. the theoretical figure. */
  note?: ReactNode;
}

export function Stat({ label, value, note }: StatProps) {
  return (
    <div className="stat">
      <dt>{label}</dt>
      <dd>
        <span className="stat-value">{value}</span>
        {note && <small>{note}</small>}
      </dd>
    </div>
  );
}

export function Stats({ children }: { children: ReactNode }) {
  return <dl className="stats">{children}</dl>;
}
