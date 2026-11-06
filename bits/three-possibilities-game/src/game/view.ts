/**
 * What each option shows at each moment: the contract between the logic and the picture.
 * The UI draws these views and looks at nothing else, so that the tests on this module also hold
 * for what the learner sees.
 *
 * The rule that matters: `content` is null for a closed option, so the position of the meteorite
 * is not even in the DOM until a lid lifts. The appearance of a stone depends only on the option
 * it is in. If it depended on the deal (say "the first stone is always the grey one"), seeing which
 * stone the game revealed would give away where the meteorite is. */
import { OPTIONS, LABELS, switchTarget } from './rules.ts';
import type { Option } from './rules.ts';
import type { Live } from './session.ts';

export type Action = 'pick' | 'stay' | 'switch' | null;

/**
 * What an option means at the end: `won` and `lost` are the player's own, `missed` is where the
 * meteorite was when the player lost, `other` is a stone that plays no part in the outcome.
 */
export type Verdict = 'won' | 'lost' | 'missed' | 'other';

export type Content = 'meteorite' | 'stone' | null;

export const STONES = [
  { name: 'Pietra terrestre', detail: 'ciottolo grigio di fiume' },
  { name: 'Pietra terrestre', detail: 'ciottolo color sabbia' },
  { name: 'Pietra terrestre', detail: 'ciottolo chiaro' },
] as const;

export const METEORITE = { name: 'Meteorite', detail: 'ferro-nichel' } as const;

export type Specimen = { name: string; detail: string };

export interface OptionView {
  option: Option;
  label: string;
  open: boolean;
  /** What is visible inside: null whenever the option is closed. */
  content: Content;
  /** The label of what is inside: null whenever the option is closed. */
  specimen: Specimen | null;
  /** Carries the player's mark. */
  chosen: boolean;
  /** What pressing the option means now; null when it does nothing. */
  action: Action;
  /** Its part in the outcome; null until the game is finished. */
  verdict: Verdict | null;
}

function isOpen(live: Live, option: Option) {
  switch (live.phase) {
    case 'choose':
      return false;
    case 'opening':
    case 'decide':
      return option === live.opened;
    case 'revealing':
      return option === live.opened || option === live.final;
    case 'done':
      return true;
  }
}

function verdictOf(live: Live, option: Option, chosen: boolean): Verdict | null {
  if (live.phase !== 'done') return null;
  const meteorite = option === live.prize;
  if (chosen) return meteorite ? 'won' : 'lost';
  return meteorite ? 'missed' : 'other';
}

function actionOf(live: Live, option: Option): Action {
  if (live.phase === 'choose') return 'pick';
  if (live.phase !== 'decide') return null;
  if (option === live.pick) return 'stay';
  return option === switchTarget(live.pick!, live.opened!) ? 'switch' : null;
}

export function viewOf(live: Live): OptionView[] {
  return OPTIONS.map((option) => {
    const open = isOpen(live, option);
    const content: Content = !open ? null : option === live.prize ? 'meteorite' : 'stone';
    const chosen = option === (live.final ?? live.pick);
    return {
      option,
      label: LABELS[option],
      open,
      content,
      specimen: content === 'meteorite' ? METEORITE : content === 'stone' ? STONES[option] : null,
      chosen,
      action: actionOf(live, option),
      verdict: verdictOf(live, option, chosen),
    };
  });
}
