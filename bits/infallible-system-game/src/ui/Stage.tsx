/**
 * The table: capital and house, the wheel, the bet, the controls, the recent spins. It shows the
 * session and sends actions; it holds no accounting of its own, only what the player is about to
 * do (colour and stake not yet on the table) and whether the system runs by itself.
 *
 * Win and loss feedback are of the same weight. Nothing here rewards a streak or urges another
 * spin; stopping is always one press away. The system's autoplay is an instrument for watching a
 * strategy run, and stops the moment it is asked to.
 */
import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { colorOf } from '../game/rules.ts';
import type { BetColor } from '../game/rules.ts';
import {
  canRestart,
  canSpin,
  canStop,
  capitalOf,
  CAPITAL_PRESETS,
  isOpen,
  ledgerOf,
  stakedOf,
  systemStake,
} from '../game/session.ts';
import type { Action, Game, Mode } from '../game/session.ts';
import { cycleLoss, martingaleStake } from '../game/strategy.ts';
import { ChipRack, Ladder, Zones } from './Betting.tsx';
import { COLOR_NAME, integer, signed, spins, tokens } from './format.ts';
import Wheel from './Wheel.tsx';

const TRAIL_LENGTH = 12;
/** Pause between automatic spins, so that each result can still be read. */
const AUTO_PAUSE_MS = 450;

function headline(game: Game, bet: BetColor | null): string {
  if (game.pending) return 'La pallina gira…';
  const last = game.events.at(-1);
  if (!last) return game.mode === 'system' ? 'Il sistema è pronto.' : bet ? 'Scegli la puntata.' : 'Rosso o nero?';
  if (last.pocket === 0) return `Zero: perdono il rosso e il nero. ${signed(last.net)}`;
  const name = `${last.pocket} ${COLOR_NAME[colorOf(last.pocket)]}`;
  return last.win ? `${name}: vinci ${signed(last.net)}` : `${name}: perdi ${integer(last.stake)}`;
}

/** The second line: what the system does next, or what has just happened to the cycle. */
function systemLine(game: Game): string | null {
  if (game.mode !== 'system' || game.pending) return null;
  const last = game.events.at(-1);
  const { base, limit } = game.setup;
  if (game.halted) {
    const next = martingaleStake(base, game.level);
    const why = next > limit ? `il tavolo accetta al massimo ${integer(limit)}` : `hai ${tokens(capitalOf(game))}`;
    const lost = cycleLoss(base, game.level);
    const closed = last?.cycle === 'halted' ? ` Il ciclo chiude a ${signed(-lost)}.` : '';
    return `Per puntare ancora servirebbero ${tokens(next)}, ma ${why}. Il sistema si ferma.${closed}`;
  }
  if (!last || last.mode !== 'system') return `Punti ${integer(base)}. Se perdi raddoppi, alla prima vincita torni a ${integer(base)}.`;
  if (last.cycle === 'won') {
    const lost = cycleLoss(base, last.level ?? 0);
    return lost > 0
      ? `Ciclo chiuso: recuperati i ${integer(lost)} persi, ${signed(last.stake - lost)} in tutto.`
      : `Ciclo chiuso al primo giro: ${signed(last.stake)}.`;
  }
  return `Il sistema raddoppia: prossima puntata ${integer(systemStake(game) ?? 0)}.`;
}

function Sparkline({ game }: { game: Game }) {
  const points = [game.setup.capital, ...game.events.map((e) => e.capital)].slice(-300);
  if (points.length < 2) return <div className="spark" aria-hidden="true" />;
  const lo = Math.min(...points, game.setup.capital);
  const hi = Math.max(...points, game.setup.capital);
  const sx = (i: number) => (i / (points.length - 1)) * 100;
  const sy = (y: number) => (hi === lo ? 15 : 28 - ((y - lo) / (hi - lo)) * 26);
  const d = points.map((y, i) => `${i ? 'L' : 'M'}${sx(i).toFixed(2)} ${sy(y).toFixed(2)}`).join('');
  const baseline = sy(game.setup.capital);
  return (
    <svg className="spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
      <line x1="0" x2="100" y1={baseline} y2={baseline} />
      <path d={d} />
    </svg>
  );
}

function EndCard({ game, onNew, onReview }: { game: Game; onNew: () => void; onReview: () => void }) {
  const n = game.events.length;
  const net = capitalOf(game) - game.setup.capital;
  let title = 'Sessione chiusa';
  let text = `${signed(net)} rispetto ai ${integer(game.setup.capital)} gettoni iniziali, dopo ${spins(n)}.`;
  if (game.ended === 'broke') {
    title = 'Capitale esaurito';
    text = `Dopo ${spins(n)} i tuoi ${integer(game.setup.capital)} gettoni sono passati al banco.`;
  } else if (net > 0) {
    title = 'Sessione chiusa in vantaggio';
    text = `${signed(net)} dopo ${spins(n)}, con ${tokens(stakedOf(game))} puntati in tutto.`;
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
          Nuova sessione
        </button>
      </div>
    </div>
  );
}

interface Props {
  game: Game;
  dispatch: (action: Action) => void;
  spin: (bet: BetColor, stake: number) => void;
  onSettled: (id: number) => void;
  onReview: () => void;
  onSettings: () => void;
  compact: boolean;
  tools: ReactNode;
}

export default function Stage({ game, dispatch, spin, onSettled, onReview, onSettings, compact, tools }: Props) {
  const { you, house } = ledgerOf(game);
  const capital = capitalOf(game);
  const last = game.events.at(-1);
  const n = game.events.length;
  const system = game.mode === 'system';
  const maxStake = Math.min(capital, game.setup.limit);

  const [bet, setBet] = useState<BetColor | null>(null);
  const [freeStake, setFreeStake] = useState(0);
  const [auto, setAuto] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(false);

  // A free stake that no longer fits (after a loss) shrinks to what is allowed.
  useEffect(() => {
    if (!game.pending && freeStake > maxStake) setFreeStake(Math.max(0, maxStake));
  }, [game.pending, freeStake, maxStake]);

  const stake = system ? systemStake(game) ?? 0 : freeStake;
  const ready = bet !== null && stake > 0 && canSpin(game, stake);

  const doSpin = () => {
    if (ready && bet) spin(bet, stake);
  };

  // Autoplay: one spin after another while it is on and the system can play.
  const autoOn = auto && system && !game.halted && isOpen(game) && bet !== null;
  useEffect(() => {
    if (auto && !(system && !game.halted && !game.ended && bet !== null)) setAuto(false);
  }, [auto, system, game.halted, game.ended, bet]);
  const spinRef = useRef(doSpin);
  spinRef.current = doSpin;
  useEffect(() => {
    if (!autoOn) return;
    const timer = setTimeout(() => spinRef.current(), n === 0 ? 0 : AUTO_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [autoOn, n]);

  // A settle is seen as the event count going up by one within a session.
  const seen = useRef({ game: game.id, n });
  const [settled, setSettled] = useState<{ key: string; win: boolean } | null>(null);
  useEffect(() => {
    const just = seen.current.game === game.id && n === seen.current.n + 1;
    seen.current = { game: game.id, n };
    setSettled(just && last ? { key: `${game.id}-${n}`, win: last.win } : null);
  }, [game.id, n, last]);

  const setMode = (mode: Mode) => {
    setAuto(false);
    dispatch({ type: 'setMode', mode });
  };

  // The system is suggested once, in context, after a couple of losses in free play.
  const lastTwoLost = n >= 2 && game.events.slice(-2).every((e) => !e.win && e.mode === 'free');
  const showHint = !system && !hintDismissed && isOpen(game) && n >= 3 && lastTwoLost;

  const onSpinKey = (event: KeyboardEvent) => {
    // Holding a key down must not become autoplay.
    if (event.repeat) event.preventDefault();
  };

  const result = game.pending || !last ? undefined : last.win ? 'win' : 'loss';
  const line = systemLine(game);
  const cycleCapital = capital + cycleLoss(game.setup.base, game.level);

  return (
    <section className="stage" aria-label="Tavolo da gioco" data-compact={compact || undefined}>
      <div className="stage-grid" data-result={result} data-mode={game.mode}>
        <header className="topbar">
          <div className="modes" role="radiogroup" aria-label="Modalità">
            {(['free', 'system'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={game.mode === mode}
                aria-disabled={!isOpen(game)}
                onClick={() => isOpen(game) && game.mode !== mode && setMode(mode)}
              >
                {mode === 'free' ? 'Libero' : 'Sistema'}
              </button>
            ))}
          </div>
          <div className="tools">{tools}</div>
        </header>

        <div className="ledger">
          <div className="purse" data-who="you">
            <span className="purse-label">Capitale</span>
            <span className="purse-amount" key={settled?.key} data-flash={settled ? (settled.win ? 'win' : 'loss') : undefined}>
              {integer(you)}
            </span>
            <span className="purse-unit">{you === 1 ? 'gettone' : 'gettoni'}</span>
          </div>
          <div className="purse" data-who="house">
            <span className="purse-label">Banco</span>
            <span className="purse-amount">{signed(house)}</span>
            <span className="purse-unit">dall’inizio</span>
          </div>
        </div>

        <div className="table">
          <Wheel spin={game.pending} resting={last?.pocket ?? null} fast={auto} onSettled={onSettled} />
          {settled && <i className="pulse" key={settled.key} data-win={settled.win || undefined} aria-hidden="true" />}
        </div>

        <div className="words">
          <p className="verdict" key={game.pending?.id ?? `r${n}`} aria-hidden="true">
            {headline(game, bet)}
          </p>
          <p className="detail" key={`d${game.pending?.id ?? n}${game.mode}${game.halted}`}>
            {line}
          </p>
          <p className="sr-only" aria-live="polite">
            {game.pending ? '' : last ? `${headline(game, bet)}. ${line ?? ''} Capitale ${tokens(you)}.` : ''}
          </p>
        </div>

        <div className="bets">
          <Zones
            bet={bet}
            stake={game.pending?.stake ?? stake}
            locked={!!game.pending || autoOn}
            onBet={setBet}
            prompt={!bet && stake > 0 && isOpen(game)}
          />
          {system ? (
            <Ladder base={game.setup.base} level={game.level} cycleCapital={cycleCapital} limit={game.setup.limit} halted={game.halted} />
          ) : (
            <ChipRack stake={freeStake} max={maxStake} disabled={!!game.pending || !!game.ended} onStake={setFreeStake} />
          )}
        </div>

        <div className="actions">
          {game.ended ? (
            <EndCard game={game} onNew={() => dispatch({ type: 'newGame' })} onReview={onReview} />
          ) : system && game.halted ? (
            <div className="halted">
              {canRestart(game) && (
                <button type="button" className="primary" onClick={() => dispatch({ type: 'restart' })}>
                  Riparti dalla base
                </button>
              )}
              <button type="button" className="ghost" onClick={() => setMode('free')}>
                Torna al gioco libero
              </button>
              <button type="button" className="ghost" aria-disabled={!canStop(game)} onClick={() => dispatch({ type: 'stop' })}>
                Mi fermo qui
              </button>
            </div>
          ) : (
            <>
              <div className="spin-row">
                <button
                  type="button"
                  className="spin"
                  aria-disabled={!ready || autoOn}
                  onClick={() => !autoOn && doSpin()}
                  onKeyDown={onSpinKey}
                >
                  <span>Gira</span>
                  <small>{stake > 0 ? tokens(stake) : 'nessuna puntata'}</small>
                </button>
                {system && (
                  <button
                    type="button"
                    className="auto"
                    aria-pressed={auto}
                    aria-disabled={!auto && !ready}
                    title={auto ? 'Ferma il gioco automatico' : 'Lascia giocare il sistema'}
                    onClick={() => (auto ? setAuto(false) : ready && setAuto(true))}
                  >
                    <svg viewBox="0 0 16 16" aria-hidden="true">
                      {auto ? <path d="M5 3.5v9M11 3.5v9" /> : <path d="M4.5 3v10l8-5z" />}
                    </svg>
                    <span>{auto ? 'Pausa' : 'Automatico'}</span>
                  </button>
                )}
              </div>
              {showHint ? (
                <div className="hint">
                  <p>Due giri persi di fila. C’è chi giura di avere un sistema infallibile: raddoppiare dopo ogni sconfitta.</p>
                  <div className="hint-actions">
                    <button type="button" className="link" onClick={() => setMode('system')}>
                      Prova il sistema
                    </button>
                    <button type="button" className="link quiet" onClick={() => setHintDismissed(true)}>
                      No, grazie
                    </button>
                  </div>
                </div>
              ) : n === 0 && !game.pending ? (
                <div className="setup-row">
                  <fieldset className="chips">
                    <legend>Capitale iniziale</legend>
                    {CAPITAL_PRESETS.map((value) => (
                      <label key={value}>
                        <input
                          type="radio"
                          name="isg-capital"
                          checked={game.setup.capital === value}
                          onChange={() => dispatch({ type: 'setSetup', setup: { capital: value } })}
                        />
                        <span>{value}</span>
                      </label>
                    ))}
                  </fieldset>
                  <button type="button" className="link quiet" onClick={onSettings}>
                    Altre regole
                  </button>
                </div>
              ) : (
                <div className="rule-row">
                  <p className="rule">{system
                      ? `Il sistema sceglie la puntata, tu il colore. Limite del tavolo: ${integer(game.setup.limit)}.`
                      : `Vincita 1 : 1. Lo zero fa perdere rosso e nero. Limite del tavolo: ${integer(game.setup.limit)}.`}</p>
                  <button type="button" className="ghost stop" aria-disabled={!canStop(game) || autoOn} onClick={() => !autoOn && dispatch({ type: 'stop' })}>
                    Mi fermo qui
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <footer className="trail">
          <span className="trail-count">
            <b>{integer(n)}</b> {n === 1 ? 'giro' : 'giri'} · puntati <b>{integer(stakedOf(game))}</b>
          </span>
          <ol className="trail-spins" aria-label="Ultimi giri">
            {game.events.slice(-TRAIL_LENGTH).map((e) => (
              <li key={e.n} data-color={colorOf(e.pocket)} data-win={e.win || undefined} title={`${e.pocket}: ${e.win ? 'vinto' : 'perso'} ${e.stake}`}>
                {e.pocket}
              </li>
            ))}
          </ol>
          <Sparkline game={game} />
        </footer>
      </div>
    </section>
  );
}
