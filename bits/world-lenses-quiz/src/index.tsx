/**
 * Cambiare le lenti: a quiz on the world built on a shipped question bank. See brief.md for the
 * intent and README.md for the structure.
 *
 *   quiz/  the bank, selection (filters, draw, battery edits), presets, the game reducer:
 *          pure and tested in Node;
 *   ui/    preparation, play, summary; persistence of personal presets in localStorage.
 *
 * This component only switches between the three phases and owns the game in progress, so
 * that going back to the preparation does not lose it. Conventions: docs/style/interactive.md.
 */
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import './styles.css';
import type { Action, Game } from './quiz/play.ts';
import { GAME_KEY, optionOrders, reduce, restoreGame, serializeGame, startGame } from './quiz/play.ts';
import { cryptoRng } from './quiz/selection.ts';
import { BANK } from './ui/data.ts';
import { Icon } from './ui/icons.tsx';
import Play from './ui/Play.tsx';
import Setup from './ui/Setup.tsx';
import Summary from './ui/Summary.tsx';
import { useFullscreen } from './ui/useFullscreen.ts';
import { readKey, useLibrary, writeKey } from './ui/useLibrary.ts';

type Phase = 'setup' | 'play' | 'summary';

const PREFS_KEY = 'orbbits.world-lenses-quiz.prefs';

/** A game saved by an earlier visit: resumable only if it fits this edition of the bank. */
function savedGame() {
  return restoreGame(readKey(GAME_KEY), BANK);
}

function readShufflePref() {
  try {
    return JSON.parse(readKey(PREFS_KEY) ?? '{}').shuffleOptions === true;
  } catch {
    return false;
  }
}

const gameReducer = (game: Game, action: Action) => {
  const id = game.ids[game.index];
  return reduce(game, action, BANK.byId.get(id)?.options.length ?? 3);
};

export default function WorldLensesQuiz() {
  const root = useRef<HTMLDivElement>(null);
  const fullscreen = useFullscreen(root);
  const library = useLibrary();
  const rng = useMemo(() => cryptoRng(), []);
  const [phase, setPhase] = useState<Phase>('setup');
  const [saved] = useState(savedGame);
  const [game, dispatch] = useReducer(gameReducer, saved, (s) =>
    s && 'game' in s ? s.game : startGame([]),
  );
  const [notice, setNotice] = useState<string | null>(() =>
    saved && 'incompatible' in saved ? `${saved.incompatible} La preparazione è pronta per una nuova partita.` : null,
  );
  const [shuffleOptions, setShuffleOptions] = useState(readShufflePref);

  // Only ids, display orders and answers are saved, stamped with the bank edition.
  useEffect(() => {
    writeKey(GAME_KEY, game.ids.length ? serializeGame(game, BANK) : null);
  }, [game]);
  useEffect(() => writeKey(PREFS_KEY, JSON.stringify({ shuffleOptions })), [shuffleOptions]);

  const go = (next: Phase) => {
    setPhase(next);
    // The new screen starts from its top, inside the Bit or in the page around it.
    requestAnimationFrame(() => {
      const node = root.current;
      if (!node) return;
      node.scrollTop = 0;
      if (node.getBoundingClientRect().top < 0) node.scrollIntoView({ block: 'start' });
    });
  };

  const newGame = (ids: string[]) => {
    const items = ids.flatMap((id) => BANK.byId.get(id) ?? []);
    dispatch({ type: 'start', ids: items.map((i) => i.id), orders: optionOrders(items, shuffleOptions ? rng : null) });
  };

  const play = (ids: string[]) => {
    if (!ids.some((id) => BANK.byId.has(id))) return;
    setNotice(null);
    newGame(ids);
    go('play');
  };

  const inProgress =
    !game.finished && game.ids.length > 0 && (Object.keys(game.answers).length > 0 || game.choice !== null);

  const tools = fullscreen.supported ? (
    <button
      type="button"
      className="tool tool-icon"
      aria-pressed={fullscreen.active}
      aria-label={fullscreen.active ? 'Esci da schermo intero' : 'Schermo intero'}
      title={fullscreen.active ? 'Esci da schermo intero' : 'Schermo intero'}
      onClick={fullscreen.toggle}
    >
      <Icon name={fullscreen.active ? 'collapse' : 'expand'} />
    </button>
  ) : null;

  return (
    <div className="world-lenses-quiz" ref={root} data-phase={phase}>
      <div className="backdrop" aria-hidden="true">
        <span className="glow cool" />
        <span className="glow warm" />
      </div>
      <div className="screen" key={phase}>
        {phase === 'setup' && (
          <Setup
            library={library}
            rng={rng}
            onStart={() => play(library.draft.ids)}
            resume={
              inProgress ? { index: game.index, total: game.ids.length, onResume: () => go('play') } : null
            }
            notice={notice}
            onDismissNotice={() => setNotice(null)}
            shuffleOptions={shuffleOptions}
            onShuffleOptions={setShuffleOptions}
            tools={tools}
          />
        )}
        {phase === 'play' && (
          <Play
            game={game}
            dispatch={dispatch}
            onBack={() => go('setup')}
            onRestart={() => newGame(game.ids)}
            onFinish={() => go('summary')}
            tools={tools}
          />
        )}
        {phase === 'summary' && (
          <Summary
            game={game}
            onReplay={() => play(game.ids)}
            onReplayWrong={(ids) => play(ids)}
            onSetup={() => go('setup')}
            tools={tools}
          />
        )}
      </div>
    </div>
  );
}
