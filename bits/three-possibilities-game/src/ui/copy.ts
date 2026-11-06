/**
 * What the stage says at each moment. Pure, so that it can be tested: the wording must agree with
 * the logic, and until the end it must not lean towards either action.
 *
 * The options are "possibilità", so they can be named by their numeral alone. The rule has to say
 * that the game knows where the meteorite is: the result depends on it.
 */
import { LABELS, strategyOf, switchTarget } from '../game/rules.ts';
import type { Live } from '../game/session.ts';
import type { OptionView } from '../game/view.ts';

export const TITLE = 'Tre possibilità';
export const SUBTITLE = 'Una pietra venuta dalle stelle. Due nate dalla Terra.';

export const RULE =
  'Il gioco conosce la posizione del meteorite. Dopo la tua scelta rivela sempre una delle due pietre terrestri, mai la tua. Poi puoi confermare o cambiare.';

export interface Prompt {
  title: string;
  detail: string;
}

export function promptOf(live: Live): Prompt {
  const name = (option: number) => LABELS[option];
  const { pick, opened, final, prize } = live;
  switch (live.phase) {
    case 'choose':
      return { title: 'Dov’è il meteorite?', detail: SUBTITLE };
    case 'opening':
      return { title: `Hai scelto la ${name(pick!)}.`, detail: 'Il gioco rivela una pietra terrestre…' };
    case 'decide':
      return {
        title: `Nella ${name(opened!)} c’è una pietra terrestre.`,
        detail: `Confermi la ${name(pick!)} o cambi con la ${name(switchTarget(pick!, opened!))}?`,
      };
    case 'revealing':
      return {
        title: `Si apre la ${name(final!)}…`,
        detail: strategyOf(pick!, final!) === 'stay' ? 'Hai confermato.' : 'Hai cambiato.',
      };
    case 'done': {
      const verb = strategyOf(pick!, final!) === 'stay' ? 'hai confermato' : 'hai cambiato';
      return final === prize
        ? { title: 'Hai vinto: è il meteorite.', detail: `Era nella ${name(prize)}: ${verb}.` }
        : { title: 'Hai perso: è una pietra.', detail: `Il meteorite era nella ${name(prize)}: ${verb}.` };
    }
  }
}

/** What pressing an option does, or what it holds, for assistive technology. */
export function optionLabel({ label, action, chosen, specimen }: OptionView) {
  if (action === 'pick') return `Scegli la possibilità ${label}`;
  if (action === 'stay') return `Conferma la possibilità ${label}`;
  if (action === 'switch') return `Cambia con la possibilità ${label}`;
  return [`Possibilità ${label}`, chosen ? 'la tua scelta' : null, specimen?.name].filter(Boolean).join(', ');
}
