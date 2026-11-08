/**
 * The analysis panel: the second level of the experience. It sits beside the game or takes the
 * centre; its tabs read the session and the lab and never write to the game (except clearing the
 * stored sessions, on a confirmed request). Statistics cover settled spins only.
 */
import { useMemo } from 'react';
import { THEORY } from '../game/rules.ts';
import { modesOf, playedGames } from '../game/session.ts';
import type { Action, Game, Session } from '../game/session.ts';
import { capitalSeries, cyclesOf, expectedNetSeries, netSeries, resultOf, stakedSeries, summarize } from '../game/stats.ts';
import type { Cycle } from '../game/stats.ts';
import Chart from './Chart.tsx';
import ClearButton from './ClearButton.tsx';
import { COLORS } from './colors.ts';
import { integer, orDash, percent, signed, signedPercent } from './format.ts';
import LabTab from './LabTab.tsx';
import { paddedDomain } from './scale.ts';
import { Stat, Stats } from './Stats.tsx';
import type { Lab } from './useLab.ts';

export type Tab = 'session' | 'all' | 'lab';

const TABS: { id: Tab; label: string }[] = [
  { id: 'session', label: 'Sessione' },
  { id: 'all', label: 'Sessioni' },
  { id: 'lab', label: 'Simulazione' },
];

const EDGE = signedPercent(THEORY.expectedPerToken);
const spinHeading = (x: number) => `Giro ${integer(x)}`;

const CYCLE_END: Record<Cycle['end'], string> = {
  won: 'chiuso in vincita',
  halted: 'raddoppio impossibile',
  abandoned: 'lasciato a metà',
  open: 'in corso',
};

function Cycles({ game }: { game: Game }) {
  const cycles = cyclesOf(game);
  if (!cycles.length) return null;
  const won = cycles.filter((c) => c.end === 'won');
  const others = cycles.filter((c) => c.end !== 'won' && c.end !== 'open');
  const sum = (list: Cycle[]) => list.reduce((s, c) => s + c.net, 0);
  return (
    <section className="cycles">
      <h3>I cicli del sistema</h3>
      <Stats>
        <Stat label="Cicli chiusi in vincita" value={`${integer(won.length)} su ${integer(cycles.length)}`} note={`${signed(sum(won))} gettoni`} />
        <Stat label="Cicli interrotti o lasciati" value={integer(others.length)} note={`${signed(sum(others))} gettoni`} />
        <Stat label="Puntata più alta" value={integer(Math.max(...cycles.map((c) => c.maxStake)))} note="in un ciclo" />
      </Stats>
      <div className="table-wrap">
        <table className="games">
          <thead>
            <tr>
              <th scope="col">Ciclo</th>
              <th scope="col">Giri</th>
              <th scope="col">Puntata più alta</th>
              <th scope="col">Risultato</th>
              <th scope="col">Esito</th>
            </tr>
          </thead>
          <tbody>
            {cycles
              .map((c, i) => ({ c, i }))
              .reverse()
              .slice(0, 60)
              .map(({ c, i }) => (
                <tr key={c.from} data-end={c.end}>
                  <th scope="row">{i + 1}</th>
                  <td>{integer(c.spins)}</td>
                  <td>{integer(c.maxStake)}</td>
                  <td>{signed(c.net)}</td>
                  <td>{CYCLE_END[c.end]}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SessionTab({ game }: { game: Game }) {
  const summary = useMemo(() => summarize(game.events), [game.events]);
  const n = game.events.length;
  const xMax = Math.max(n, 10);
  const xDomain = useMemo(() => [0, xMax] as const, [xMax]);
  const capital = useMemo(() => capitalSeries(game), [game]);
  const staked = useMemo(() => stakedSeries(game.events), [game.events]);
  const net = useMemo(() => netSeries(game), [game]);
  const expected = useMemo(() => expectedNetSeries(game.events), [game.events]);

  const capitalDomain = useMemo(() => {
    const [lo, hi] = paddedDomain(capital.map((p) => p.y), { minSpan: 8 });
    return [Math.max(0, lo), hi] as const;
  }, [capital]);
  const moneyDomain = useMemo(
    () => paddedDomain([0, ...staked.map((p) => p.y), ...net.map((p) => p.y), ...expected.map((p) => p.y)], { minSpan: 8, pad: 0.05 }),
    [staked, net, expected],
  );

  if (n === 0) {
    return (
      <p className="empty">
        Nessun giro in questa sessione. Gioca qualche turno: qui vedrai il capitale prendere forma, giro dopo giro.
      </p>
    );
  }

  return (
    <>
      <Stats>
        <Stat label="Giri" value={integer(summary.spins)} note={`${integer(summary.wins)} vinti, ${integer(summary.losses)} persi`} />
        <Stat label="Zeri" value={integer(summary.zeros)} note="persi con entrambi i colori" />
        <Stat label="Totale puntato" value={integer(summary.staked)} note="gettoni messi sul tavolo" />
        <Stat label="Guadagno" value={signed(summary.net)} note="gettoni" />
        <Stat
          label="Guadagno per gettone puntato"
          value={orDash(summary.netPerStaked, (v) => signedPercent(v))}
          note={`a lungo andare ${EDGE}`}
        />
      </Stats>
      <div className="charts">
        <Chart
          title="Il capitale, giro dopo giro"
          summary={`Dopo ${n} giri il capitale è ${capital.at(-1)!.y} gettoni, partendo da ${game.setup.capital}.`}
          xLabel="giri"
          yLabel="gettoni"
          xDomain={xDomain}
          yDomain={capitalDomain}
          formatY={integer}
          heading={spinHeading}
          series={[
            { kind: 'rule', key: 'start', label: 'Capitale iniziale', color: COLORS.muted, y: game.setup.capital },
            { kind: 'line', key: 'capital', label: 'Capitale', color: COLORS.you, points: capital, endDot: true },
          ]}
        />
        <Chart
          title="Quanto hai puntato, quanto hai guadagnato"
          summary={`Puntati ${summary.staked} gettoni in tutto, guadagno ${signed(summary.net)}.`}
          caption={`Il tratteggio è la perdita media che corrisponde a quanto hai puntato: ${EDGE} di ogni gettone. Non predice la tua sessione.`}
          xLabel="giri"
          yLabel="gettoni"
          xDomain={xDomain}
          yDomain={moneyDomain}
          formatY={integer}
          heading={spinHeading}
          series={[
            { kind: 'line', key: 'staked', label: 'Totale puntato', color: COLORS.staked, points: staked, width: 2 },
            { kind: 'line', key: 'expected', label: 'Perdita media attesa', color: COLORS.theory, points: expected, dashed: true },
            { kind: 'line', key: 'net', label: 'Guadagno', color: COLORS.you, points: net, endDot: true },
          ]}
        />
      </div>
      <Cycles game={game} />
    </>
  );
}

const MODE_NAME = { free: 'Libero', system: 'Sistema', mixed: 'Misto' } as const;

function AllTab({ session, dispatch }: { session: Session; dispatch: (action: Action) => void }) {
  const games = playedGames(session);
  const results = useMemo(() => games.map(resultOf), [games]);
  if (!games.length) {
    return <p className="empty">Nessuna sessione ancora. Passa il dispositivo: ogni sessione si aggiunge qui.</p>;
  }
  const ahead = results.filter((r) => r.net > 0).length;
  const total = results.reduce((s, r) => s + r.net, 0);
  const staked = results.reduce((s, r) => s + r.staked, 0);
  return (
    <>
      <p className="note">Le sessioni giocate su questo dispositivo, una per riga. I dati restano qui e non vengono inviati a nessuno.</p>
      <Stats>
        <Stat label="Sessioni" value={integer(games.length)} />
        <Stat label="Chiuse in vantaggio" value={`${integer(ahead)} su ${integer(games.length)}`} note={percent(ahead / games.length, 0)} />
        <Stat label="Risultato medio" value={signed(total / games.length, 2)} note="gettoni per sessione" />
        <Stat label="Totale puntato" value={integer(staked)} note={`guadagno ${signed(total)}`} />
      </Stats>
      <div className="table-wrap">
        <table className="games">
          <thead>
            <tr>
              <th scope="col">Sessione</th>
              <th scope="col">Modalità</th>
              <th scope="col">Giri</th>
              <th scope="col">Puntato</th>
              <th scope="col">Capitale</th>
              <th scope="col">Risultato</th>
            </tr>
          </thead>
          <tbody>
            {[...games].reverse().map((g) => {
              const r = resultOf(g);
              const modes = modesOf(g);
              return (
                <tr key={g.id} data-current={g === session.game || undefined}>
                  <th scope="row">{g.id}</th>
                  <td>{modes ? MODE_NAME[modes] : '—'}</td>
                  <td>{integer(r.spins)}</td>
                  <td>{integer(r.staked)}</td>
                  <td>
                    {integer(g.setup.capital)} → {integer(r.capital)}
                  </td>
                  <td>{signed(r.net)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="row-end">
        <ClearButton label="Azzera tutte le sessioni" confirm="Conferma: cancella tutto" onConfirm={() => dispatch({ type: 'clearAll' })} />
      </div>
    </>
  );
}

interface Props {
  session: Session;
  dispatch: (action: Action) => void;
  lab: Lab;
  tab: Tab;
  onTab: (tab: Tab) => void;
  focused: boolean;
  onFocusToggle: () => void;
  onClose: () => void;
}

export default function Analytics({ session, dispatch, lab, tab, onTab, focused, onFocusToggle, onClose }: Props) {
  const toggle = focused ? 'Affianca al gioco' : 'Porta al centro';
  return (
    <aside className="panel" aria-label="Laboratorio">
      <header className="panel-head">
        <div className="tabs" role="tablist" aria-label="Sezioni del laboratorio">
          {TABS.map(({ id, label }) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} data-lab={id === 'lab' || undefined} onClick={() => onTab(id)}>
              {label}
            </button>
          ))}
        </div>
        <div className="panel-tools">
          <button type="button" className="icon focus-toggle" aria-pressed={focused} aria-label={toggle} title={toggle} onClick={onFocusToggle}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              {focused ? <path d="M1.5 3v10M14.5 3v10M12 8H6.5M9 5.5 6.5 8 9 10.5" /> : <path d="M1.5 3v10M14.5 3v10M4 8h8M6 5.5 3.75 8 6 10.5M10 5.5 12.25 8 10 10.5" />}
            </svg>
          </button>
          <button type="button" className="icon" aria-label="Chiudi il laboratorio" title="Chiudi" onClick={onClose}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>
      </header>
      <div className="panel-body" role="tabpanel">
        {tab === 'session' && <SessionTab game={session.game} />}
        {tab === 'all' && <AllTab session={session} dispatch={dispatch} />}
        {tab === 'lab' && <LabTab lab={lab} setup={session.game.setup} />}
      </div>
    </aside>
  );
}
