/**
 * What the player puts on the table: the two colours, the chips, and — in system mode — the
 * ladder of doublings. These components hold no accounting: stakes are proposed here and accepted
 * or refused by the session.
 */
import type { CSSProperties } from 'react';
import type { BetColor } from '../game/rules.ts';
import { cycleLoss, martingaleStake } from '../game/strategy.ts';
import { integer } from './format.ts';

export const CHIP_VALUES = [1, 5, 10, 25, 100] as const;

/** A stake as the chips a croupier would stack: largest first. */
export function chipsFor(stake: number): number[] {
  const chips: number[] = [];
  let rest = stake;
  for (const value of [...CHIP_VALUES].reverse()) {
    while (rest >= value) {
      chips.push(value);
      rest -= value;
    }
  }
  return chips;
}

export function Chip({ value, style }: { value: number; style?: CSSProperties }) {
  return (
    <span className="chip" data-value={value} style={style}>
      <span>{value}</span>
    </span>
  );
}

const STACK_SHOWN = 7;

export function Stack({ stake }: { stake: number }) {
  const chips = chipsFor(stake);
  const shown = chips.slice(0, STACK_SHOWN).reverse();
  return (
    <span className="stack" aria-hidden="true">
      {shown.map((value, i) => (
        <Chip key={i} value={value} style={{ '--i': i } as CSSProperties} />
      ))}
    </span>
  );
}

const ZONE_NAME: Record<BetColor, string> = { red: 'Rosso', black: 'Nero' };

interface ZonesProps {
  bet: BetColor | null;
  stake: number;
  /** Colour choice is locked while the ball turns. */
  locked: boolean;
  onBet: (color: BetColor) => void;
  /** Draw attention to the choice: a stake is ready but no colour is chosen. */
  prompt: boolean;
}

export function Zones({ bet, stake, locked, onBet, prompt }: ZonesProps) {
  return (
    <div className="zones" role="group" aria-label="Su che colore punti" data-prompt={prompt || undefined}>
      {(['red', 'black'] as const).map((color) => {
        const chosen = bet === color;
        return (
          <button
            key={color}
            type="button"
            className="zone"
            data-color={color}
            aria-pressed={chosen}
            aria-disabled={locked}
            onClick={() => !locked && onBet(color)}
          >
            <span className="zone-name">{ZONE_NAME[color]}</span>
            <span className="zone-bet">
              {chosen && stake > 0 ? (
                <>
                  <Stack stake={stake} />
                  <b>{integer(stake)}</b>
                </>
              ) : (
                <span className="zone-pays">1 : 1</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

interface ChipsProps {
  stake: number;
  /** The largest stake allowed now: min(capital, table limit). */
  max: number;
  disabled: boolean;
  onStake: (stake: number) => void;
}

export function ChipRack({ stake, max, disabled, onStake }: ChipsProps) {
  return (
    <div className="rack" role="group" aria-label="Gettoni">
      {CHIP_VALUES.map((value) => {
        const off = disabled || stake + value > max;
        return (
          <button
            key={value}
            type="button"
            className="rack-chip"
            aria-label={`Aggiungi ${value}`}
            aria-disabled={off}
            onClick={() => !off && onStake(stake + value)}
          >
            <Chip value={value} />
          </button>
        );
      })}
      <span className="rack-gap" />
      <button
        type="button"
        className="rack-tool"
        aria-label="Raddoppia la puntata"
        title="Raddoppia la puntata"
        aria-disabled={disabled || stake === 0 || stake * 2 > max}
        onClick={() => !(disabled || stake === 0 || stake * 2 > max) && onStake(stake * 2)}
      >
        ×2
      </button>
      <button
        type="button"
        className="rack-tool"
        aria-label="Togli la puntata"
        title="Togli la puntata"
        aria-disabled={disabled || stake === 0}
        onClick={() => !(disabled || stake === 0) && onStake(0)}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3 3l10 10M13 3L3 13" />
        </svg>
      </button>
    </div>
  );
}

interface LadderProps {
  base: number;
  level: number;
  /** Capital at the start of the current cycle: what decides how far the ladder reaches. */
  cycleCapital: number;
  limit: number;
  halted: boolean;
}

/**
 * The doublings of one cycle, as bars whose height is the stake: the exponential growth is seen,
 * not told. Reachable steps are solid, the first unreachable one is drawn in outline, with why.
 */
export function Ladder({ base, level, cycleCapital, limit, halted }: LadderProps) {
  const steps: { stake: number; reach: 'ok' | 'capital' | 'limit' }[] = [];
  for (let k = 0; k < 24; k += 1) {
    const stake = martingaleStake(base, k);
    const reach = cycleLoss(base, k + 1) > cycleCapital ? 'capital' : stake > limit ? 'limit' : 'ok';
    steps.push({ stake, reach });
    if (reach !== 'ok') break;
  }
  const top = steps.at(-1)!.stake;
  const blocked = steps.at(-1)!;
  const lost = cycleLoss(base, level);
  const current = halted ? -1 : level;

  return (
    <div className="ladder">
      <ol className="ladder-steps" aria-label="La scala del raddoppio">
        {steps.map((step, k) => {
          const state = step.reach !== 'ok' ? 'out' : k < level || (halted && k <= level) ? 'lost' : k === current ? 'now' : 'next';
          return (
            <li key={k} data-state={state} aria-current={k === current ? 'step' : undefined}>
              <span className="ladder-bar" style={{ height: `${Math.max(7, (step.stake / top) * 100)}%` }} />
              <span className="ladder-stake">{integer(step.stake)}</span>
            </li>
          );
        })}
      </ol>
      <p className="ladder-note">
        {halted ? (
          level > 0 ? <>Persi nel ciclo <b>{integer(lost)}</b></> : <>La base non è più disponibile</>
        ) : (
          <>
            {level > 0 ? <>Persi nel ciclo <b>{integer(lost)}</b> · </> : null}
            se vinci, <b>+{integer(martingaleStake(base, level) - lost)}</b> in tutto
          </>
        )}
        <span className="ladder-out">
          {' '}· {integer(blocked.stake)} {blocked.reach === 'limit' ? `oltre il limite del tavolo (${integer(limit)})` : 'oltre il capitale'}
        </span>
      </p>
    </div>
  );
}
