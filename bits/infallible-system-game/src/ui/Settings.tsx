/**
 * The rules of the table for this session: starting capital, the system's base stake, the table
 * limit. They are fixed once the first spin is played, so a session is always one setup.
 */
import { useEffect, useRef } from 'react';
import { BASE_PRESETS, CAPITAL_PRESETS, LIMIT_PRESETS } from '../game/session.ts';
import type { Action, Game, Setup } from '../game/session.ts';
import { cycleLoss, maxLevels, martingaleStake } from '../game/strategy.ts';
import { integer, tokens } from './format.ts';

function Choice({ legend, name, options, value, disabled, onChange }: {
  legend: string;
  name: string;
  options: readonly number[];
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <fieldset className="chips" disabled={disabled}>
      <legend>{legend}</legend>
      {options.map((option) => (
        <label key={option}>
          <input type="radio" name={`isg-${name}`} checked={option === value} onChange={() => onChange(option)} />
          <span>{integer(option)}</span>
        </label>
      ))}
    </fieldset>
  );
}

interface Props {
  game: Game;
  dispatch: (action: Action) => void;
  onClose: () => void;
}

export default function Settings({ game, dispatch, onClose }: Props) {
  const locked = game.events.length > 0 || !!game.pending;
  const { capital, base, limit } = game.setup;
  const set = (setup: Partial<Setup>) => dispatch({ type: 'setSetup', setup });
  const levels = maxLevels(capital, game.setup);
  const close = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    close.current?.focus();
    const onKey = (event: globalThis.KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Regole del tavolo" onClick={(e) => e.stopPropagation()}>
        <header className="sheet-head">
          <h3>Regole del tavolo</h3>
          <button ref={close} type="button" className="icon" aria-label="Chiudi" onClick={onClose}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </header>
        <Choice legend="Capitale iniziale" name="s-capital" options={CAPITAL_PRESETS} value={capital} disabled={locked} onChange={(v) => set({ capital: v })} />
        <Choice legend="Puntata base del sistema" name="s-base" options={BASE_PRESETS} value={base} disabled={locked} onChange={(v) => set({ base: v })} />
        <Choice legend="Limite del tavolo" name="s-limit" options={LIMIT_PRESETS} value={limit} disabled={locked} onChange={(v) => set({ limit: v })} />
        <p className="note">
          Con queste regole il sistema può puntare{' '}
          {levels === 0
            ? 'nemmeno una volta.'
            : `${Array.from({ length: levels }, (_, k) => integer(martingaleStake(base, k))).join(', ')}: ${levels === 1 ? 'una puntata' : `${levels} puntate di fila`}, ${tokens(cycleLoss(base, levels))} in tutto.`}
        </p>
        {locked ? (
          <div className="sheet-foot">
            <p className="note">Le regole valgono per tutta la sessione: si cambiano prima del primo giro.</p>
            <button
              type="button"
              className="ghost"
              aria-disabled={!!game.pending}
              onClick={() => !game.pending && dispatch({ type: 'newGame' })}
            >
              Nuova sessione
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
