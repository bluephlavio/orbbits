/**
 * Series colours, as CSS tokens so that charts follow light and dark mode (src/styles.css).
 * The colour follows the strategy, everywhere. Validated for colour-blind separation.
 */
import type { Strategy } from '../game/rules.ts';

export const STRATEGY_COLOR: Record<Strategy, string> = {
  stay: 'var(--tp-stay)',
  switch: 'var(--tp-switch)',
};

export const STRATEGY_NAME: Record<Strategy, string> = {
  stay: 'Conferma',
  switch: 'Cambia',
};

export const FRACTION: Record<Strategy, string> = { stay: '1/3', switch: '2/3' };
