/**
 * The Analysis panel: closed at first, and it never writes to the game. Statistics cover finished
 * games only, so an open chart cannot spoil a reveal.
 *
 * Two commitments shape it. The theoretical values stay hidden until the learner asks, because
 * reading "2/3" here would end the experiment before it starts. And thin data are presented as
 * thin: counts instead of percentages, an uncertainty on every frequency, no conclusion when the
 * data do not support one.
 */
import { useMemo } from 'react';
import { STRATEGIES, THEORY } from '../game/rules.ts';
import { canCloseSession, playedSessions } from '../game/session.ts';
import type { Round, State } from '../game/session.ts';
import {
  MIN_GAMES,
  MIN_SESSION_GAMES,
  pooledRounds,
  rateSeries,
  readingOf,
  sessionRates,
  summarize,
  wilson,
} from '../game/stats.ts';
import type { Reading, Summary } from '../game/stats.ts';
import Chart from './Chart.tsx';
import type { Series } from './Chart.tsx';
import ClearButton from './ClearButton.tsx';
import { FRACTION, STRATEGY_COLOR, STRATEGY_NAME } from './colors.ts';
import { asPercent, frequency, games, integer, ofTotal, percent, times } from './format.ts';
import LabTab from './LabTab.tsx';
import Panel from './Panel.tsx';
import RatePlot from './RatePlot.tsx';
import type { Row } from './RatePlot.tsx';
import { Stat, Stats } from './Stats.tsx';
import type { Lab } from './useLab.ts';

export type Tab = 'session' | 'all' | 'lab';

const TABS: { id: Tab; label: string }[] = [
  { id: 'session', label: 'Sessione' },
  { id: 'all', label: 'Storico' },
  { id: 'lab', label: 'Simulazione' },
];

function readingText(reading: Reading, summary: Summary) {
  switch (reading.kind) {
    case 'empty':
      return null;
    case 'few': {
      const counts = `Hai confermato ${times(summary.stay.played)} e cambiato ${times(summary.switch.played)}`;
      return reading.played === 0
        ? `${counts}. Su «${STRATEGY_NAME[reading.scarce]}» questi dati non dicono nulla: non è un confronto.`
        : `${counts}: troppo poco per confrontare le due strategie. Con poche partite una frequenza può essere quasi qualunque.`;
    }
    case 'overlap':
      return 'I due margini d’incertezza si sovrappongono: con queste partite la differenza potrebbe essere dovuta al caso.';
    case 'apart':
      return 'I due margini d’incertezza non si toccano: una differenza così difficilmente è solo caso. Da dove viene?';
  }
}

function strategyRows(summary: Summary, theory: boolean): Row[] {
  return STRATEGIES.map((strategy) => {
    const tally = summary[strategy];
    return {
      key: strategy,
      label: STRATEGY_NAME[strategy],
      color: STRATEGY_COLOR[strategy],
      value: tally.rate,
      interval: wilson(tally.wins, tally.played),
      theory: theory ? THEORY[strategy] : undefined,
      note: tally.played === 0 ? 'nessuna partita' : `${ofTotal(tally)} vittorie`,
      faint: tally.played < MIN_GAMES,
    };
  });
}

function StrategyTable({ summary, theory }: { summary: Summary; theory: boolean }) {
  return (
    <table className="compare">
      <thead>
        <tr>
          <th scope="col">Strategia</th>
          <th scope="col">Usata</th>
          <th scope="col">Vittorie</th>
          <th scope="col">Frequenza</th>
          {theory && <th scope="col">Teoria</th>}
        </tr>
      </thead>
      <tbody>
        {STRATEGIES.map((strategy) => {
          const tally = summary[strategy];
          return (
            <tr key={strategy}>
              <th scope="row">
                <span className="swatch" style={{ background: STRATEGY_COLOR[strategy] }} />
                {STRATEGY_NAME[strategy]}
              </th>
              <td>{times(tally.played)}</td>
              <td>{integer(tally.wins)}</td>
              <td>{frequency(tally)}</td>
              {theory && (
                <td>
                  {FRACTION[strategy]} · {percent(THEORY[strategy])}
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Results({ rounds, theory, scope }: { rounds: readonly Round[]; theory: boolean; scope: string }) {
  const summary = useMemo(() => summarize(rounds), [rounds]);
  const { all, losses } = summary;
  const reading = readingText(readingOf(summary.stay, summary.switch), summary);

  const lines = useMemo(
    () =>
      STRATEGIES.map((strategy) => ({ strategy, points: rateSeries(rounds, strategy) })),
    [rounds],
  );
  const xMax = Math.max(MIN_GAMES, ...lines.map((l) => l.points.length));
  const xDomain = useMemo(() => [0, xMax] as const, [xMax]);
  const yDomain = useMemo(() => [0, 1] as const, []);

  const series: Series[] = lines
    .filter((l) => l.points.length > 0)
    .map((l) => ({
      kind: 'line',
      key: l.strategy,
      label: STRATEGY_NAME[l.strategy],
      color: STRATEGY_COLOR[l.strategy],
      points: l.points,
      endDot: true,
    }));
  if (theory) {
    for (const strategy of STRATEGIES) {
      series.push({
        kind: 'rule',
        key: `theory-${strategy}`,
        label: `Teoria ${FRACTION[strategy]}`,
        color: STRATEGY_COLOR[strategy],
        y: THEORY[strategy],
        dashed: true,
      });
    }
  }

  return (
    <>
      <Stats>
        <Stat label="Partite" value={integer(all.played)} note={scope} />
        <Stat label="Vittorie" value={integer(all.wins)} />
        <Stat label="Sconfitte" value={integer(losses)} />
        <Stat label="Frequenza di vittoria" value={frequency(all)} />
      </Stats>
      <StrategyTable summary={summary} theory={theory} />
      {reading && <p className="reading">{reading}</p>}
      <div className="charts">
        <Chart
          title="Come cambiano le frequenze"
          summary={`Conferma: ${frequency(summary.stay)}. Cambia: ${frequency(summary.switch)}.`}
          caption="Ogni linea conta solo le partite giocate con quella strategia, e si ferma dove finiscono."
          xLabel="partite con quella strategia"
          yLabel="frequenza di vittoria"
          xDomain={xDomain}
          yDomain={yDomain}
          formatY={asPercent}
          heading={(x) => `Dopo ${games(x)}`}
          series={series}
        />
        <RatePlot
          title="Quanto sono affidabili questi dati"
          summary={`Conferma: ${frequency(summary.stay)}. Cambia: ${frequency(summary.switch)}.`}
          caption={
            theory
              ? 'I rombi sono le probabilità teoriche. Una frequenza vicina al rombo non lo dimostra, e una lontana con poche partite non lo smentisce.'
              : 'Più sono le partite, più il margine si stringe: dove è largo, i dati dicono ancora poco.'
          }
          rows={strategyRows(summary, theory)}
          legend={{ value: true, interval: true, theory }}
        />
      </div>
    </>
  );
}

function SessionTab({ state, theory, onNewSession }: { state: State; theory: boolean; onNewSession: () => void }) {
  const { rounds } = state.session;
  if (rounds.length === 0) {
    return (
      <p className="empty">
        Nessuna partita in questa sessione. Prima gioca: qui vedrai che cosa è successo davvero, partita dopo partita.
      </p>
    );
  }
  return (
    <>
      <Results rounds={rounds} theory={theory} scope={`sessione ${state.session.id}`} />
      <div className="row-end">
        <button type="button" className="ghost" aria-disabled={!canCloseSession(state)} onClick={onNewSession}>
          Chiudi e inizia una nuova sessione
        </button>
      </div>
    </>
  );
}

function Variability({ state, theory }: { state: State; theory: boolean }) {
  const sessions = playedSessions(state);
  const data = STRATEGIES.map((strategy) => ({ strategy, ...sessionRates(sessions, strategy) }));
  const rows: Row[] = data.map(({ strategy, rates }) => ({
    key: strategy,
    label: STRATEGY_NAME[strategy],
    color: STRATEGY_COLOR[strategy],
    marks: rates.map((r) => r.rate),
    theory: theory ? THEORY[strategy] : undefined,
    note: rates.length === 1 ? '1 sessione' : `${integer(rates.length)} sessioni`,
    faint: rates.length === 0,
  }));
  const excluded = data.reduce((sum, d) => sum + d.excluded, 0);
  return (
    <RatePlot
      title="Da una sessione all’altra"
      summary={rows.map((r) => `${r.label}: ${r.note}`).join('. ')}
      caption={`Ogni punto è una sessione con almeno ${MIN_SESSION_GAMES} partite con quella strategia${
        excluded ? `; ${excluded === 1 ? 'un caso con meno partite è escluso' : `${excluded} casi con meno partite sono esclusi`}` : ''
      }. Le stesse regole danno risultati diversi: per questo una sessione sola non basta.`}
      rows={rows}
      legend={{ marks: 'Una sessione', theory }}
    />
  );
}

function AllTab({ game, theory }: { game: AnalyticsGame; theory: boolean }) {
  const { state, newSession, clearAll } = game;
  const sessions = playedSessions(state);
  const rounds = useMemo(() => pooledRounds(sessions), [sessions]);

  if (sessions.length === 0) {
    return <p className="empty">Nessuna sessione ancora. Ogni sessione giocata su questo dispositivo si aggiunge qui.</p>;
  }

  return (
    <>
      <p className="note">Tutte le sessioni giocate su questo dispositivo. I dati restano qui e non vengono inviati a nessuno.</p>
      <Results rounds={rounds} theory={theory} scope={sessions.length === 1 ? '1 sessione' : `${integer(sessions.length)} sessioni`} />
      <div className="charts charts-single">
        <Variability state={state} theory={theory} />
      </div>
      <div className="table-wrap">
        <table className="games">
          <thead>
            <tr>
              <th scope="col">Sessione</th>
              <th scope="col">Partite</th>
              <th scope="col">Conferma</th>
              <th scope="col">Cambia</th>
            </tr>
          </thead>
          <tbody>
            {[...sessions].reverse().map((session) => {
              const summary = summarize(session.rounds);
              return (
                <tr key={session.id} data-current={session === state.session || undefined}>
                  <th scope="row">{session.id}</th>
                  <td>{integer(summary.all.played)}</td>
                  <td>{summary.stay.played ? ofTotal(summary.stay) : '—'}</td>
                  <td>{summary.switch.played ? ofTotal(summary.switch) : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="row-end">
        <button type="button" className="ghost" aria-disabled={!canCloseSession(state)} onClick={newSession}>
          Nuova sessione
        </button>
        <ClearButton label="Azzera tutto" confirm="Conferma: cancella tutte le sessioni" onConfirm={clearAll} />
      </div>
    </>
  );
}

export interface AnalyticsGame {
  state: State;
  newSession: () => void;
  clearAll: () => void;
}

interface Props {
  game: AnalyticsGame;
  lab: Lab;
  tab: Tab;
  onTab: (tab: Tab) => void;
  theory: boolean;
  onTheory: (value: boolean) => void;
  focused: boolean;
  onFocusToggle: () => void;
  onClose: () => void;
}

export default function Analytics({ game, lab, tab, onTab, theory, onTheory, focused, onFocusToggle, onClose }: Props) {
  return (
    <Panel
      label="Analisi"
      tabbed
      focused={focused}
      onFocusToggle={onFocusToggle}
      onClose={onClose}
      head={
        <div className="tabs" role="tablist" aria-label="Sezioni dell'analisi">
          {TABS.map(({ id, label }) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} data-lab={id === 'lab' || undefined} onClick={() => onTab(id)}>
              {label}
            </button>
          ))}
        </div>
      }
    >
      <label className="theory-switch">
        <input type="checkbox" checked={theory} onChange={(event) => onTheory(event.target.checked)} />
        <span aria-hidden="true" />
        Mostra le probabilità teoriche
      </label>
      {tab === 'session' && <SessionTab state={game.state} theory={theory} onNewSession={game.newSession} />}
      {tab === 'all' && <AllTab game={game} theory={theory} />}
      {tab === 'lab' && <LabTab lab={lab} theory={theory} />}
    </Panel>
  );
}
