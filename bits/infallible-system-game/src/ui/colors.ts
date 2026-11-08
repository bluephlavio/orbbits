/** Series colours, as CSS tokens so that charts follow light and dark mode (src/styles.css). */
import type { Strategy } from '../game/strategy.ts';

export const COLORS = {
  you: 'var(--isg-series-you)',
  staked: 'var(--isg-series-staked)',
  theory: 'var(--isg-theory)',
  band: 'var(--isg-band)',
  muted: 'var(--isg-muted)',
  martingale: 'var(--isg-series-martingale)',
  flat: 'var(--isg-series-flat)',
} as const;

export const STRATEGY_COLOR: Record<Strategy, string> = { martingale: COLORS.martingale, flat: COLORS.flat };
export const STRATEGY_NAME: Record<Strategy, string> = { martingale: 'Raddoppio', flat: 'Puntata fissa' };
