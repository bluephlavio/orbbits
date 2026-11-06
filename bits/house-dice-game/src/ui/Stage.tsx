/**
 * The table: the two purses, the die, the verdict and the controls. It shows the session and
 * sends actions; it holds no accounting of its own.
 *
 * Win and loss feedback are deliberately of the same weight, and nothing here invites another
 * throw: the game has no autoplay, no streaks, and stopping is always one press away.
 */
import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { RULES } from '../game/rules.ts';
import type { Face } from '../game/rules.ts';
import { BALANCE_PRESETS, canRoll, canStop, ledgerOf, settledBalance } from '../game/session.ts';
import type { Action, Game } from '../game/session.ts';
import { balanceSeries } from '../game/stats.ts';
import Die from './Die.tsx';
import { integer, signed, tokens } from './format.ts';

const TRAIL_LENGTH = 10;

function verdictOf(game: Game): string {
  if (game.pending) return 'Il dado è in aria…';
  const last = game.events.at(-1);
  if (!last) return 'Riuscirai a battere il banco?';
  if (last.win) return `Sei! Ricevi ${RULES.payout} gettoni: guadagni ${signed(last.net)}.`;
  return `Esce ${last.face}: il gettone resta al banco.`;
}

function Sparkline({ game }: { game: Game }) {
  const points = balanceSeries(game.initialBalance, game.events).slice(-240);
  if (points.length < 2) return <div className="spark" aria-hidden="true" />;
  const xs = [points[0].x, points.at(-1)!.x];
  const ys = points.map((p) => p.y);
  const lo = Math.min(...ys, game.initialBalance);
  const hi = Math.max(...ys, game.initialBalance);
  const sx = (x: number) => ((x - xs[0]) / (xs[1] - xs[0])) * 100;
  const sy = (y: number) => (hi === lo ? 15 : 28 - ((y - lo) / (hi - lo)) * 26);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(2)} ${sy(p.y).toFixed(2)}`).join('');
  const baseline = sy(game.initialBalance);
  return (
    <svg className="spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
      <line x1="0" x2="100" y1={baseline} y2={baseline} />
      <path d={d} />
    </svg>
  );
}

function EndCard({ game, onNew, onReview }: { game: Game; onNew: () => void; onReview: () => void }) {
  const rolls = game.events.length;
  const balance = settledBalance(game);
  const net = balance - game.initialBalance;
  let title = 'Partita chiusa';
  let text = `${signed(net)} rispetto ai ${integer(game.initialBalance)} gettoni iniziali, dopo ${integer(rolls)} ${rolls === 1 ? 'lancio' : 'lanci'}.`;
  if (game.ended === 'broke') {
    title = 'Saldo esaurito';
    text = `Dopo ${integer(rolls)} ${rolls === 1 ? 'lancio' : 'lanci'} i tuoi ${integer(game.initialBalance)} gettoni sono passati al banco.`;
  } else if (net > 0) {
    title = 'Partita chiusa in vantaggio';
    text = `${signed(net)} gettoni dopo ${integer(rolls)} ${rolls === 1 ? 'lancio' : 'lanci'}. Basta una partita per dire che il gioco conviene?`;
  }
  return (
    <div className="end-card">
      <h3>{title}</h3>
      <p>{text}</p>
      <div className="end-actions">
        <button type="button" className="primary" onClick={onReview}>
          Guarda i dati
        </button>
        <button type="button" className="ghost" onClick={onNew}>
          Nuova partita
        </button>
      </div>
    </div>
  );
}

interface Props {
  game: Game;
  dispatch: (action: Action) => void;
  roll: () => void;
  onSettled: (id: number) => void;
  onReview: () => void;
  compact: boolean;
  tools: ReactNode;
}

export default function Stage({ game, dispatch, roll, onSettled, onReview, compact, tools }: Props) {
  const { you, house } = ledgerOf(game);
  const rollable = canRoll(game);
  const last = game.events.at(-1);
  const rolls = game.events.length;
  const resting = (last?.face ?? 1) as Face;

  // A settle is seen as the event count going up by one within a game. A reload or a new game
  // changes the count without a settle, and plays no token animation.
  const seen = useRef({ game: game.id, rolls });
  const [settled, setSettled] = useState<{ key: string; win: boolean } | null>(null);
  useEffect(() => {
    const justSettled = seen.current.game === game.id && rolls === seen.current.rolls + 1;
    seen.current = { game: game.id, rolls };
    setSettled(justSettled && last ? { key: `${game.id}-${rolls}`, win: last.win } : null);
  }, [game.id, rolls, last]);

  const result = game.pending || !last ? undefined : last.win ? 'win' : 'loss';
  const verdict = verdictOf(game);

  const onRollKey = (event: KeyboardEvent) => {
    // Holding a key down must not become autoplay.
    if (event.repeat) event.preventDefault();
  };

  return (
    <section className="stage" data-result={result} data-compact={compact || undefined} aria-label="Tavolo da gioco">
      <header className="topbar">
        <span className="wordmark">Il dado del banco</span>
        <div className="tools">{tools}</div>
      </header>

      <div className="ledger">
        <div className="purse" data-who="you">
          <span className="purse-label">Il tuo saldo</span>
          <span className="purse-amount" key={settled?.key} data-flash={settled ? (settled.win ? 'win' : 'loss') : undefined}>
            {integer(you)}
          </span>
          <span className="purse-unit">{you === 1 ? 'gettone' : 'gettoni'}</span>
        </div>
        <div className="purse" data-who="house">
          <span className="purse-label">Banco</span>
          <span className="purse-amount">{signed(house)}</span>
          <span className="purse-unit">da inizio partita</span>
        </div>
      </div>

      <div className="table">
        <Die roll={game.pending} face={resting} onSettled={onSettled} />
        {settled && <i className="pulse" key={settled.key} data-win={settled.win || undefined} aria-hidden="true" />}
        <p className="verdict" aria-hidden="true" key={game.pending?.id ?? `r${rolls}`}>
          {verdict}
        </p>
        <p className="sr-only" aria-live="polite">
          {game.pending ? '' : last ? `${verdict} Saldo ${tokens(you)}.` : ''}
        </p>
      </div>

      <div className="flights" aria-hidden="true">
        {game.pending && <i className="token flight-stake" key={`stake-${game.pending.id}`} />}
        {settled && !settled.win && <i className="token flight-lost" key={`lost-${settled.key}`} />}
        {settled?.win &&
          Array.from({ length: RULES.payout }, (_, i) => (
            <i className="token flight-won" key={`won-${settled.key}-${i}`} style={{ animationDelay: `${i * 55}ms` }} />
          ))}
      </div>

      <div className="actions">
        {game.ended ? (
          <EndCard game={game} onNew={() => dispatch({ type: 'newGame' })} onReview={onReview} />
        ) : (
          <>
            <button type="button" className="roll" aria-disabled={!rollable} onClick={roll} onKeyDown={onRollKey}>
              <span>Lancia</span>
              <small>{tokens(RULES.stake)}</small>
            </button>
            <p className="rule">
              Paghi {RULES.stake} gettone. Se esce {RULES.winningFace} ne ricevi {RULES.payout}.
            </p>
            {rolls === 0 && !game.pending ? (
              <fieldset className="chips">
                <legend>Saldo iniziale</legend>
                {BALANCE_PRESETS.map((value) => (
                  <label key={value}>
                    <input
                      type="radio"
                      name="hdg-initial-balance"
                      checked={game.initialBalance === value}
                      onChange={() => dispatch({ type: 'setInitialBalance', value })}
                    />
                    <span>{value}</span>
                  </label>
                ))}
              </fieldset>
            ) : (
              <button type="button" className="ghost stop" aria-disabled={!canStop(game)} onClick={() => dispatch({ type: 'stop' })}>
                Mi fermo qui
              </button>
            )}
          </>
        )}
      </div>

      <footer className="trail">
        <span className="trail-count">
          <b>{integer(rolls)}</b> {rolls === 1 ? 'lancio' : 'lanci'}
        </span>
        <ol className="trail-rolls" aria-label="Ultimi lanci">
          {game.events.slice(-TRAIL_LENGTH).map((event) => (
            <li key={event.n} data-win={event.win || undefined}>
              {event.face}
            </li>
          ))}
        </ol>
        <Sparkline game={game} />
      </footer>
    </section>
  );
}
