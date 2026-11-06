/**
 * The Analysis panel: the second level of the experience. It can sit beside the game or take
 * the centre of the screen; its tabs read the session and the lab and never write to the game.
 * Statistics cover settled rolls only, so an open chart cannot spoil a throw.
 */
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { summarizeRun } from '../game/lab.ts';
import type { LabRun } from '../game/lab.ts';
import { meanSpread, rateSpread, RULES, THEORY, totalSpread } from '../game/rules.ts';
import { playedGames, settledBalance } from '../game/session.ts';
import type { Action, Game, Session } from '../game/session.ts';
import { balanceSeries, expectedBand, grid, netSeries, sixRateSeries, summarize } from '../game/stats.ts';
import type { Point, Summary } from '../game/stats.ts';
import Chart from './Chart.tsx';
import type { Series } from './Chart.tsx';
import { COLORS } from './colors.ts';
import { decimal, integer, orDash, percent, signed } from './format.ts';
import { paddedDomain } from './scale.ts';
import { Stat, Stats } from './Stats.tsx';
import type { Lab } from './useLab.ts';

export type Tab = 'game' | 'all' | 'lab';

const TABS: { id: Tab; label: string }[] = [
  { id: 'game', label: 'Partita' },
  { id: 'all', label: 'Storico' },
  { id: 'lab', label: 'Simulazione' },
];

const BAND_LABEL = 'Fascia tipica (circa 95 casi su 100)';
const THEORY_MEAN = decimal(THEORY.expectedNet);
const THEORY_RATE = percent(THEORY.winProbability);

const asPercent = (value: number) => percent(value, 0);
const asMean = (value: number) => signed(value, 2);

function Fraction({ top, bottom }: { top: ReactNode; bottom: ReactNode }) {
  return (
    <span className="frac">
      <span>{top}</span>
      <span>{bottom}</span>
    </span>
  );
}

function WhyTheHouseWins() {
  return (
    <details className="why">
      <summary>Perché il banco vince</summary>
      <p className="formula">
        E = <Fraction top="1" bottom="6" /> · (+{RULES.payout - RULES.stake}) +{' '}
        <Fraction top="5" bottom="6" /> · (−{RULES.stake}) = −<Fraction top="1" bottom="6" /> ≈ {THEORY_MEAN} gettoni a lancio
      </p>
      <p>
        Su ogni lancio il banco trattiene in media 1/6 di gettone: il {percent(THEORY.houseEdge, 2)} della puntata.
        Il gioco sarebbe equo se pagasse 6 gettoni: la differenza fra 5 e 6 è il guadagno del banco.
      </p>
      <p>
        Il valore atteso non dice come finirà <em>una</em> partita: indica attorno a quale valore si concentrano
        moltissime partite. Una partita sola può finire ben sopra o ben sotto.
      </p>
    </details>
  );
}

function GameStats({ summary }: { summary: Summary }) {
  return (
    <Stats>
      <Stat label="Lanci" value={integer(summary.rolls)} />
      <Stat label="Vittorie" value={integer(summary.wins)} />
      <Stat label="Sconfitte" value={integer(summary.losses)} />
      <Stat label="Frequenza del 6" value={orDash(summary.sixRate, percent)} note={`teorica ${THEORY_RATE}`} />
      <Stat label="Guadagno totale" value={signed(summary.net)} note="gettoni" />
      <Stat
        label="Guadagno medio a lancio"
        value={orDash(summary.meanNet, (v) => signed(v, 3))}
        note={`teorico ${THEORY_MEAN}`}
      />
    </Stats>
  );
}

const rateDomain = (points: readonly Point[]): [number, number] => {
  // The first rolls swing between 0% and 100%; once there are enough of them they would
  // flatten everything else, so the axis follows the later part and early points leave the top.
  const settled = points.slice(Math.min(9, Math.floor(points.length / 4)));
  const top = Math.max(0.35, ...settled.map((p) => p.y));
  return [0, Math.min(1, top * 1.08)];
};

function GameTab({ game }: { game: Game }) {
  const summary = useMemo(() => summarize(game.events), [game.events]);
  const n = game.events.length;
  const xMax = Math.max(n, 10);
  const xDomain = useMemo(() => [0, xMax] as const, [xMax]);

  const balance = useMemo(() => balanceSeries(game.initialBalance, game.events), [game]);
  const rates = useMemo(() => sixRateSeries(game.events), [game.events]);
  const you = settledBalance(game);

  const expected = useMemo(() => grid(0, xMax).map((x) => expectedBand(x, game.initialBalance)), [xMax, game.initialBalance]);
  const expectedLine = useMemo(() => expected.map((p) => ({ x: p.x, y: (p.lo + p.hi) / 2 })), [expected]);

  const balanceDomain = useMemo(() => {
    const [lo, hi] = paddedDomain(balance.map((p) => p.y), { minSpan: 8 });
    return [Math.max(0, lo), hi] as const;
  }, [balance]);

  const compareDomain = useMemo(() => {
    const [lo, hi] = paddedDomain([...balance.map((p) => p.y), ...expected.flatMap((p) => [p.lo, p.hi])], { pad: 0.04 });
    return [Math.max(0, lo), hi] as const;
  }, [balance, expected]);

  const rateBand = useMemo(
    () =>
      grid(1, xMax).map((x) => ({
        x,
        lo: Math.max(0, THEORY.winProbability - rateSpread(x)),
        hi: THEORY.winProbability + rateSpread(x),
      })),
    [xMax],
  );

  const yourLine = (key: string): Series => ({
    kind: 'line',
    key,
    label: 'Il tuo saldo',
    color: COLORS.you,
    points: balance,
    endDot: true,
  });

  if (n === 0) {
    return (
      <>
        <p className="empty">
          Nessun lancio in questa partita. Gioca qualche turno: qui vedrai il saldo prendere forma, un lancio alla volta.
        </p>
        <WhyTheHouseWins />
      </>
    );
  }

  return (
    <>
      <GameStats summary={summary} />
      <div className="charts">
        <Chart
          title="Il saldo, lancio dopo lancio"
          summary={`Dopo ${n} lanci il saldo è ${you} gettoni, partendo da ${game.initialBalance}.`}
          xLabel="lanci"
          yLabel="gettoni"
          xDomain={xDomain}
          yDomain={balanceDomain}
          formatY={integer}
          series={[
            { kind: 'rule', key: 'start', label: 'Saldo iniziale', color: COLORS.muted, y: game.initialBalance },
            yourLine('balance'),
          ]}
        />
        <Chart
          title="Il saldo e l'andamento atteso"
          summary={`Saldo ${you}, valore atteso ${decimal(game.initialBalance + n * THEORY.expectedNet, 1)}, con la fascia tipica attorno.`}
          caption="La linea tratteggiata non predice la tua partita: è il centro attorno a cui si distribuiscono tante partite. È calcolata come se il saldo non finisse mai."
          xLabel="lanci"
          yLabel="gettoni"
          xDomain={xDomain}
          yDomain={compareDomain}
          formatY={integer}
          series={[
            { kind: 'band', key: 'band', label: BAND_LABEL, color: COLORS.band, points: expected },
            { kind: 'line', key: 'expected', label: 'Andamento atteso', color: COLORS.theory, points: expectedLine, dashed: true },
            yourLine('compare'),
          ]}
        />
        <Chart
          title="Quanto spesso esce il 6"
          summary={`Frequenza del 6: ${orDash(summary.sixRate, percent)} su ${n} lanci; probabilità teorica ${THEORY_RATE}.`}
          xLabel="lanci"
          yLabel="frequenza relativa"
          xDomain={xDomain}
          yDomain={rateDomain(rates)}
          formatY={asPercent}
          series={[
            { kind: 'band', key: 'band', label: BAND_LABEL, color: COLORS.band, points: rateBand },
            { kind: 'rule', key: 'p', label: `Probabilità teorica 1/6 (${THEORY_RATE})`, color: COLORS.theory, y: THEORY.winProbability, dashed: true },
            { kind: 'line', key: 'rate', label: 'Frequenza del 6', color: COLORS.you, points: rates, endDot: true },
          ]}
        />
      </div>
      <WhyTheHouseWins />
    </>
  );
}

function ComparisonTable({ current, all }: { current: Summary; all: Summary }) {
  const rows: { label: string; pick: (s: Summary) => string; theory: string }[] = [
    { label: 'Lanci', pick: (s) => integer(s.rolls), theory: '—' },
    { label: 'Frequenza del 6', pick: (s) => orDash(s.sixRate, percent), theory: THEORY_RATE },
    { label: 'Guadagno medio a lancio', pick: (s) => orDash(s.meanNet, (v) => signed(v, 3)), theory: THEORY_MEAN },
  ];
  return (
    <table className="compare">
      <thead>
        <tr>
          <th scope="col" />
          <th scope="col">Questa partita</th>
          <th scope="col">Tutte le partite</th>
          <th scope="col">Teoria</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <th scope="row">{row.label}</th>
            <td>{row.pick(current)}</td>
            <td>{row.pick(all)}</td>
            <td>{row.theory}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ClearButton({ label, confirm, onConfirm }: { label: string; confirm: string; onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);
  return (
    <button
      type="button"
      className="ghost danger"
      data-armed={armed || undefined}
      onBlur={() => setArmed(false)}
      onClick={() => {
        if (armed) onConfirm();
        setArmed(!armed);
      }}
    >
      {armed ? confirm : label}
    </button>
  );
}

function AllGamesTab({ session, dispatch }: { session: Session; dispatch: (action: Action) => void }) {
  const games = playedGames(session);
  const current = summarize(session.game.events);
  const all = useMemo(() => summarize(games.flatMap((g) => g.events)), [games]);

  const lines = useMemo(() => games.map((g) => ({ game: g, points: netSeries(g.events) })), [games]);
  const xMax = Math.max(10, ...lines.map((l) => l.points.at(-1)!.x));
  const xDomain = useMemo(() => [0, xMax] as const, [xMax]);
  const band = useMemo(() => grid(0, xMax).map((x) => expectedBand(x)), [xMax]);
  const theory = useMemo(() => band.map((p) => ({ x: p.x, y: (p.lo + p.hi) / 2 })), [band]);
  const yDomain = useMemo(
    () => paddedDomain([0, ...lines.flatMap((l) => l.points.map((p) => p.y)), ...band.flatMap((p) => [p.lo, p.hi])], { pad: 0.04 }),
    [lines, band],
  );

  if (games.length === 0) {
    return <p className="empty">Nessuna partita ancora. Passa il dispositivo: ogni partita si aggiunge qui.</p>;
  }

  const series: Series[] = [
    { kind: 'band', key: 'band', label: BAND_LABEL, color: COLORS.band, points: band },
    ...lines
      .filter((l) => l.game !== session.game)
      .map((l): Series => ({ kind: 'line', key: `g${l.game.id}`, color: COLORS.muted, points: l.points, width: 1.5, opacity: 0.65 })),
    { kind: 'line', key: 'theory', label: 'Media teorica', color: COLORS.theory, points: theory, dashed: true },
  ];
  if (session.game.events.length) {
    series.push({
      kind: 'line',
      key: 'current',
      label: 'Questa partita',
      color: COLORS.you,
      points: netSeries(session.game.events),
      endDot: true,
    });
  }

  return (
    <>
      <p className="note">Tutte le partite giocate su questo dispositivo. I dati restano qui e non vengono inviati a nessuno.</p>
      <ComparisonTable current={current} all={all} />
      <div className="charts charts-single">
        <Chart
          title="Ogni partita è una traiettoria"
          summary={`${games.length} partite, ${all.rolls} lanci in totale, guadagno medio ${orDash(all.meanNet, (v) => signed(v, 3))} a lancio.`}
          caption="Le singole partite si disperdono, ma insieme tendono a scendere: più sono i lanci, meno conta la fortuna."
          xLabel="lanci"
          yLabel="guadagno netto (gettoni)"
          xDomain={xDomain}
          yDomain={yDomain}
          formatY={integer}
          series={series}
          extraLegend={games.length > 1 ? { label: 'Altre partite', color: COLORS.muted } : undefined}
        />
      </div>
      <div className="table-wrap">
        <table className="games">
          <thead>
            <tr>
              <th scope="col">Partita</th>
              <th scope="col">Lanci</th>
              <th scope="col">Saldo</th>
              <th scope="col">Risultato</th>
              <th scope="col">Esito</th>
            </tr>
          </thead>
          <tbody>
            {[...games].reverse().map((g) => {
              const balance = settledBalance(g);
              return (
                <tr key={g.id} data-current={g === session.game || undefined}>
                  <th scope="row">{g.id}</th>
                  <td>{integer(g.events.length)}</td>
                  <td>
                    {integer(g.initialBalance)} → {integer(balance)}
                  </td>
                  <td>{signed(balance - g.initialBalance)}</td>
                  <td>{g.ended === 'broke' ? 'Saldo esaurito' : g.ended === 'stopped' ? 'Fermata' : 'In corso'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="row-end">
        <ClearButton label="Azzera tutte le partite" confirm="Conferma: cancella tutto" onConfirm={() => dispatch({ type: 'clearAll' })} />
      </div>
    </>
  );
}

const ROLL_OPTIONS = [100, 1000, 10000] as const;
const PLAYER_OPTIONS = [1, 10, 30, 100] as const;

function Choice<T extends number>({ legend, options, value, onChange }: {
  legend: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="chips">
      <legend>{legend}</legend>
      {options.map((option) => (
        <label key={option}>
          <input type="radio" name={`hdg-${legend}`} checked={option === value} onChange={() => onChange(option)} />
          <span>{integer(option)}</span>
        </label>
      ))}
    </fieldset>
  );
}

function LabCharts({ run }: { run: LabRun }) {
  const { rolls, players, referenceBalance } = run.config;
  const progress = run.trajectories[0]?.rolled ?? 0;
  const single = players === 1;
  const lineStyle = { color: COLORS.you, width: single ? 2 : 1.25, opacity: single ? 1 : Math.max(0.28, Math.min(0.75, 7 / players)) };
  const xDomain = useMemo(() => [0, rolls] as const, [rolls]);
  const xs = useMemo(() => grid(1, rolls, 80), [rolls]);
  const E = THEORY.expectedNet;
  const p = THEORY.winProbability;

  const name = single ? { label: 'Giocatore simulato' } : {};

  const trajectories = (key: string, value: (s: LabRun['trajectories'][0]['samples'][0]) => number, withOrigin: boolean) =>
    run.trajectories.map((t, i): Series => ({
      kind: 'line',
      key: `${key}${i}`,
      ...lineStyle,
      ...name,
      points: [...(withOrigin ? [{ x: 0, y: 0 }] : []), ...t.samples.map((s) => ({ x: s.n, y: value(s) }))],
    }));

  // Axes are fixed from the theory, not from the data, so they hold still while trajectories grow.
  const total = useMemo(() => {
    const reach = 3.6 * THEORY.sd * Math.sqrt(rolls);
    return [rolls * E - reach, Math.max(rolls * E + reach, reach * 0.3)] as const;
  }, [rolls, E]);
  const meanHalf = Math.min(1.4, (2 * meanSpread(Math.max(1, rolls / 50))));
  const rateTop = Math.min(0.6, p + 2 * rateSpread(Math.max(1, rolls / 50)));
  const rateBottom = Math.max(0, p - 2 * rateSpread(Math.max(1, rolls / 50)));

  const totalBand = useMemo(() => [{ x: 0, lo: 0, hi: 0 }, ...xs.map((x) => expectedBand(x))], [xs]);
  const totalTheory = useMemo(() => totalBand.map((b) => ({ x: b.x, y: b.x * E })), [totalBand, E]);
  const meanBand = useMemo(() => xs.map((x) => ({ x, lo: E - meanSpread(x), hi: E + meanSpread(x) })), [xs, E]);
  const rateBand = useMemo(() => xs.map((x) => ({ x, lo: Math.max(0, p - rateSpread(x)), hi: p + rateSpread(x) })), [xs, p]);

  const series = useMemo(
    () => ({
      total: trajectories('t', (s) => s.net, true),
      mean: trajectories('m', (s) => s.net / s.n, false),
      rate: trajectories('r', (s) => s.sixes / s.n, false),
    }),
    // `progress` stands for the samples, which the simulator appends in place.
    [run, progress],
  );

  const extraLegend = single ? undefined : { label: 'Giocatori simulati', color: COLORS.you };
  const label = single ? 'un giocatore' : `${integer(players)} giocatori`;

  return (
    <div className="charts">
      <Chart
        title="Guadagno netto cumulato"
        summary={`${label} per ${integer(rolls)} lanci, confrontati con la media teorica e la fascia tipica.`}
        caption={`La fortuna cresce come √n, lo svantaggio come n. Da circa 500 lanci anche il bordo alto della fascia è sotto zero. Tratteggio rosso: dove finirebbero i ${integer(referenceBalance)} gettoni di un saldo reale.`}
        xLabel="lanci"
        yLabel="guadagno netto (gettoni)"
        xDomain={xDomain}
        yDomain={total}
        formatY={integer}
        extraLegend={extraLegend}
        series={[
          { kind: 'band', key: 'band', label: BAND_LABEL, color: COLORS.band, points: totalBand },
          ...series.total,
          { kind: 'line', key: 'theory', label: 'Media teorica', color: COLORS.theory, points: totalTheory, dashed: true },
          { kind: 'rule', key: 'ruin', label: `Saldo di ${integer(referenceBalance)} esaurito`, color: COLORS.loss, y: -referenceBalance, dashed: true },
        ]}
      />
      <Chart
        title="Guadagno medio a lancio"
        summary={`La media empirica si avvicina al valore teorico ${THEORY_MEAN} al crescere dei lanci.`}
        caption="Legge dei grandi numeri: la media di molti lanci si stringe attorno al valore teorico. Non è un riequilibrio: il caso non ha memoria."
        xLabel="lanci"
        yLabel="gettoni a lancio"
        xDomain={xDomain}
        yDomain={[E - meanHalf, E + meanHalf]}
        formatY={asMean}
        extraLegend={extraLegend}
        series={[
          { kind: 'band', key: 'band', label: BAND_LABEL, color: COLORS.band, points: meanBand },
          ...series.mean,
          { kind: 'rule', key: 'e', label: `Valore teorico (${THEORY_MEAN})`, color: COLORS.theory, y: E, dashed: true },
        ]}
      />
      <Chart
        title="Frequenza relativa del 6"
        summary={`La frequenza del 6 si avvicina a ${THEORY_RATE} al crescere dei lanci.`}
        xLabel="lanci"
        yLabel="frequenza relativa"
        xDomain={xDomain}
        yDomain={[rateBottom, rateTop]}
        formatY={asPercent}
        extraLegend={extraLegend}
        series={[
          { kind: 'band', key: 'band', label: BAND_LABEL, color: COLORS.band, points: rateBand },
          ...series.rate,
          { kind: 'rule', key: 'p', label: `Probabilità teorica 1/6 (${THEORY_RATE})`, color: COLORS.theory, y: p, dashed: true },
        ]}
      />
    </div>
  );
}

function LabTab({ lab, referenceBalance }: { lab: Lab; referenceBalance: number }) {
  const [rolls, setRolls] = useState<(typeof ROLL_OPTIONS)[number]>(1000);
  const [players, setPlayers] = useState<(typeof PLAYER_OPTIONS)[number]>(30);
  const { selected, running } = lab;
  const summary = selected ? summarizeRun(selected) : null;

  const start = () => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    lab.start({ rolls, players, referenceBalance }, reduced);
  };

  return (
    <>
      <p className="lab-banner">
        <strong>Simulazione</strong> Non tocca il tuo saldo né le statistiche delle partite. I giocatori simulati non hanno
        saldo: registrano il guadagno netto, che può scendere sotto zero.
      </p>
      <div className="lab-controls">
        <Choice legend="Lanci per giocatore" options={ROLL_OPTIONS} value={rolls} onChange={setRolls} />
        <Choice legend="Giocatori simulati" options={PLAYER_OPTIONS} value={players} onChange={setPlayers} />
        <button type="button" className="primary" aria-disabled={running} onClick={start}>
          {running ? 'Simulazione in corso…' : 'Avvia la simulazione'}
        </button>
      </div>

      {selected && summary ? (
        <>
          <h3 className="run-title">
            Serie {selected.id}: {integer(selected.config.players)} × {integer(selected.config.rolls)} lanci
          </h3>
          <Stats>
            <Stat label="Lanci simulati" value={integer(summary.rolls)} />
            <Stat label="Frequenza del 6" value={orDash(summary.sixRate, percent)} note={`teorica ${THEORY_RATE}`} />
            <Stat label="Guadagno medio a lancio" value={orDash(summary.meanNet, (v) => signed(v, 3))} note={`teorico ${THEORY_MEAN}`} />
            <Stat label="In vantaggio alla fine" value={`${integer(summary.ahead)} su ${integer(selected.config.players)}`} />
            <Stat
              label="Saldo esaurito"
              value={`${integer(summary.ruined)} su ${integer(selected.config.players)}`}
              note={`partendo da ${integer(selected.config.referenceBalance)} gettoni`}
            />
          </Stats>
          <LabCharts run={selected} />
          {lab.runs.length > 1 && (
            <div className="table-wrap">
              <table className="games">
                <thead>
                  <tr>
                    <th scope="col">Serie</th>
                    <th scope="col">Giocatori × lanci</th>
                    <th scope="col">Frequenza del 6</th>
                    <th scope="col">Guadagno medio</th>
                  </tr>
                </thead>
                <tbody>
                  {[...lab.runs].reverse().map((run) => {
                    const s = summarizeRun(run);
                    return (
                      <tr key={run.id} data-current={run === selected || undefined}>
                        <th scope="row">
                          <button type="button" className="link" onClick={() => lab.select(run.id)}>
                            Serie {run.id}
                          </button>
                        </th>
                        <td>
                          {integer(run.config.players)} × {integer(run.config.rolls)}
                        </td>
                        <td>{orDash(s.sixRate, percent)}</td>
                        <td>{orDash(s.meanNet, (v) => signed(v, 3))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="row-end">
            <ClearButton label="Azzera le simulazioni" confirm="Conferma: cancella le serie" onConfirm={lab.clear} />
          </div>
        </>
      ) : (
        <p className="empty">
          Scegli quanti lanci e quanti giocatori, poi avvia. Ogni serie è un esperimento indipendente e resta separata dalle altre.
        </p>
      )}
      <p className="note">
        Teoria: ogni lancio ha deviazione standard σ = {decimal(THEORY.sd, 2)} gettoni; dopo n lanci il guadagno atteso è
        n·({THEORY_MEAN}) con dispersione tipica ±2σ√n (a 100 lanci: ±{integer(totalSpread(100))} gettoni).
      </p>
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
  return (
    <aside className="panel" aria-label="Analisi">
      <header className="panel-head">
        <div className="tabs" role="tablist" aria-label="Sezioni dell'analisi">
          {TABS.map(({ id, label }) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} data-lab={id === 'lab' || undefined} onClick={() => onTab(id)}>
              {label}
            </button>
          ))}
        </div>
        <div className="panel-tools">
          <button
            type="button"
            className="icon focus-toggle"
            aria-pressed={focused}
            aria-label={focused ? 'Affianca al gioco' : "Porta l'analisi al centro"}
            title={focused ? 'Affianca al gioco' : "Porta l'analisi al centro"}
            onClick={onFocusToggle}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              {focused ? <path d="M1.5 3v10M14.5 3v10M12 8H6.5M9 5.5 6.5 8 9 10.5" /> : <path d="M1.5 3v10M14.5 3v10M4 8h8M6 5.5 3.75 8 6 10.5M10 5.5 12.25 8 10 10.5" />}
            </svg>
          </button>
          <button type="button" className="icon" aria-label="Chiudi l'analisi" title="Chiudi l'analisi" onClick={onClose}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>
      </header>
      <div className="panel-body" role="tabpanel">
        {tab === 'game' && <GameTab game={session.game} />}
        {tab === 'all' && <AllGamesTab session={session} dispatch={dispatch} />}
        {tab === 'lab' && <LabTab lab={lab} referenceBalance={session.game.initialBalance} />}
      </div>
    </aside>
  );
}
