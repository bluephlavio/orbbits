/**
 * A number with − / + steppers and a text field that accepts "−3,5" or "-3.5". The value is
 * committed on Enter, on blur and by the arrow keys; anything unreadable restores the value.
 */
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { clamp, snap } from '../model/vec.ts';
import { text } from './format.ts';

export function parseNumber(raw: string): number | null {
  const s = raw.trim().replace(/[−–]/g, '-').replace(',', '.');
  if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(s)) return null;
  return Number(s);
}

export default function NumberField({
  label,
  name,
  value,
  onChange,
  min,
  max,
  step = 1,
  precision = 0.1,
  disabled = false,
  masked = false,
  className,
}: {
  label: ReactNode;
  /** Accessible name, since `label` is typeset. */
  name: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  precision?: number;
  disabled?: boolean;
  /** Shows "?" and refuses input: the value is waiting for a prediction. */
  masked?: boolean;
  className?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  useEffect(() => setDraft(null), [value]);
  const commit = (v: number) => onChange(clamp(snap(v, precision), min, max));
  const shown = masked ? '?' : (draft ?? text(value, 1));
  disabled = disabled || masked;
  return (
    <div className={className ? `number-field ${className}` : 'number-field'}>
      <span className="number-field-label">{label}</span>
      <div className="number-field-box">
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          disabled={disabled || value <= min}
          onClick={() => commit(Math.ceil(value / step - 1e-9) * step - step)}
        >
          −
        </button>
        <input
          type="text"
          inputMode="decimal"
          role="spinbutton"
          aria-label={name}
          aria-valuenow={value}
          aria-valuemin={min}
          aria-valuemax={max}
          disabled={disabled}
          value={shown}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft === null) return;
            const v = parseNumber(draft);
            setDraft(null);
            if (v !== null) commit(v);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            else if (e.key === 'Escape') setDraft(null);
            else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              e.preventDefault();
              const d = (e.shiftKey ? precision : step) * (e.key === 'ArrowUp' ? 1 : -1);
              commit(value + d);
            }
          }}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          disabled={disabled || value >= max}
          onClick={() => commit(Math.floor(value / step + 1e-9) * step + step)}
        >
          +
        </button>
      </div>
    </div>
  );
}
