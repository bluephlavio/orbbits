/**
 * The simulation: many independent players, each playing one session, with the doubling system
 * and with a flat stake on the same spins of the wheel. Its own visual register, so that it cannot
 * be mistaken for the sessions really played, which it never touches.
 *
 * Theory appears only where it is exact (one martingale cycle) and always beside the data; the
 * reasoning is in a closed section at the end.
 */
import { useMemo, useState } from 'react';
import { histogram, randomSeed, summarizeStrategy } from '../game/lab.ts';
import type { LabConfig, LabRun, StrategySummary } from '../game/lab.ts';
import { THEORY } from '../game/rules.ts';
import type { Setup } from '../game/session.ts';
import { cycleLoss, cycleTheory, martingaleStake, maxLevels, STRATEGIES } from '../game/strategy.ts';
import type { Strategy } from '../game/strategy.ts';
import Chart from './Chart.tsx';
import type { Series } from './Chart.tsx';
import ClearButton from './ClearButton.tsx';
import { COLORS, STRATEGY_COLOR, STRATEGY_NAME } from './colors.ts';
import { decimal, integer, orDash, percent, signed, signedPercent } from './format.ts';
import Histogram from './Histogram.tsx';
import { paddedDomain } from './scale.ts';
import type { Lab } from './useLab.ts';

const CAPITALS = [63, 100, 255, 1000] as const;
const BASES = [1, 5] as const;
const LIMITS = [50, 100, 500, null] as const;
const GOALS = [1, 10, 50, null] as const;
const PLAYERS = [100, 1000, 10_000] as const;
const CAPS = [100, 1000] as const;

const EDGE = signedPercent(THEORY.expectedPerToken);

function Choice<T extends number | null>({ legend, options, value, onChange, format, disabled }: {
  legend: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  format: (value: T) => string;
  disabled: boolean;
}) {
  return (
    <fieldset className="chips" disabled={disabled}>
      <legend>{legend}</legend>
      {options.map((option) => (
        <label key={String(option)}>
          <input type="radio" name={`isg-lab-${legend}`} checked={option === value} onChange={() => onChange(option)} />
          <span>{format(option)}</span>
        </label>
      ))}
    </fieldset>
  );
}

const goalName = (goal: number | null) => (goal === null ? 'nessuno' : `+${integer(goal)}`);
const limitName = (limit: number | null) => (limit === null ? 'nessuno' : integer(limit));

/** Exact values for the martingale, when the session is exactly one cycle. */
function exactCycle(config: LabConfig) {
  const t = cycleTheory(config.capital, config);
  const oneCycle = config.goal !== null && config.goal <= config.base && config.maxSpins >= t.levels && t.levels > 0;
  return oneCycle ? t : null;
}

function Comparison({ run, theory }: { run: LabRun; theory: boolean }) {
  const s = Object.fromEntries(STRATEGIES.map((k) => [k, summarizeStrategy(run.byStrategy[k])])) as Record<Strategy, StrategySummary>;
  const exact = theory ? exactCycle(run.config) : null;
  const rows: { label: string; note?: string; pick: (x: StrategySummary) => string; theory?: string }[] = [
    {
      label: 'Sessioni in vantaggio',
      pick: (x) => orDash(x.winShare, (v) => percent(v, 2)),
      theory: exact ? percent(exact.winProbability, 2) : undefined,
    },
    {
      label: 'Guadagno medio',
      note: 'per sessione',
      pick: (x) => orDash(x.meanNet, (v) => signed(v, 3)),
      theory: exact ? signed(exact.expected, 3) : undefined,
    },
    {
      label: 'Puntato in media',
      note: 'per sessione',
      pick: (x) => orDash(x.meanStaked, (v) => decimal(v, 1)),
      theory: exact ? decimal(exact.staked, 1) : undefined,
    },
    {
      label: 'Guadagno ÷ puntato',
      note: 'tutte le sessioni',
      pick: (x) => orDash(x.netPerStaked, (v) => signedPercent(v)),
      theory: theory ? EDGE : undefined,
    },
    { label: 'Giri in media', note: 'per sessione', pick: (x) => orDash(x.meanSpins, (v) => decimal(v, 1)) },
    { label: 'Risultato peggiore', pick: (x) => orDash(x.worst, (v) => signed(v)) },
    { label: 'Risultato migliore', pick: (x) => orDash(x.best, (v) => signed(v)) },
  ];
  const stops = [
    { key: 'goal' as const, label: run.config.goal === null ? null : `Obiettivo ${goalName(run.config.goal)} raggiunto` },
    { key: 'stuck' as const, label: 'Puntata successiva impossibile' },
    { key: 'cap' as const, label: `Limite di ${integer(run.config.maxSpins)} giri` },
  ].filter((r) => r.label);

  return (
    <div className="table-wrap table-plain">
      <table className="compare">
        <thead>
          <tr>
            <th scope="col" />
            {STRATEGIES.map((k) => (
              <th scope="col" key={k}>
                <span className="swatch" style={{ background: STRATEGY_COLOR[k] }} />
                {STRATEGY_NAME[k]}
              </th>
            ))}
            <th scope="col" className="theory-col">
              {theory ? 'Teoria' : ''}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th scope="row">
                {row.label}
                {row.note && <small> {row.note}</small>}
              </th>
              {STRATEGIES.map((k) => (
                <td key={k}>{row.pick(s[k])}</td>
              ))}
              <td className="theory-col">{row.theory ?? ''}</td>
            </tr>
          ))}
          <tr className="group">
            <th scope="rowgroup" colSpan={4}>
              Come si sono fermate le sessioni
            </th>
          </tr>
          {stops.map((row) => (
            <tr key={row.key}>
              <th scope="row">{row.label}</th>
              {STRATEGIES.map((k) => (
                <td key={k}>{integer(s[k].stops[row.key])}</td>
              ))}
              <td className="theory-col" />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Results({ run, theory }: { run: LabRun; theory: boolean }) {
  const { config, done } = run;
  const exact = theory ? exactCycle(config) : null;
  const domain = useMemo(() => {
    const values = STRATEGIES.flatMap((k) => run.byStrategy[k].results.map((r) => r.net));
    const lo = Math.min(0, ...values);
    const hi = Math.max(0, ...values);
    const pad = Math.max(1, (hi - lo) * 0.06);
    return [lo - pad, hi + pad] as const;
    // `done` stands for the results, which the simulator appends in place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, done]);

  const xDomain = useMemo(() => [0, config.players] as const, [config.players]);
  const playersHeading = (x: number) => `${integer(x)} ${x === 1 ? 'giocatore' : 'giocatori'}`;

  const meanSeries: Series[] = STRATEGIES.map((k) => ({
    kind: 'line',
    key: k,
    label: STRATEGY_NAME[k],
    color: STRATEGY_COLOR[k],
    points: run.byStrategy[k].running.map((p) => ({ x: p.n, y: p.meanNet })),
    endDot: true,
  }));
  const meanValues = STRATEGIES.flatMap((k) => run.byStrategy[k].running.slice(Math.floor(run.byStrategy[k].running.length / 10)).map((p) => p.meanNet));
  const meanDomain = paddedDomain([0, ...meanValues, ...(exact ? [exact.expected] : [])], { minSpan: 1, pad: 0.12 });
  if (exact) {
    meanSeries.unshift({
      kind: 'band',
      key: 'band',
      label: 'Fascia tipica (circa 95 serie su 100)',
      color: COLORS.band,
      points: Array.from({ length: 81 }, (_, i) => {
        const x = Math.max(1, (config.players * i) / 80);
        const half = (2 * exact.sd) / Math.sqrt(x);
        return { x, lo: exact.expected - half, hi: exact.expected + half };
      }),
    });
    meanSeries.push({ kind: 'rule', key: 'e', label: `Valore atteso (${signed(exact.expected, 3)})`, color: COLORS.theory, y: exact.expected, dashed: true });
  }

  const shareSeries: Series[] = STRATEGIES.map((k) => ({
    kind: 'line',
    key: k,
    label: STRATEGY_NAME[k],
    color: STRATEGY_COLOR[k],
    points: run.byStrategy[k].running.map((p) => ({ x: p.n, y: p.winShare })),
    endDot: true,
  }));
  if (exact) shareSeries.push({ kind: 'rule', key: 'p', label: `Probabilità (${percent(exact.winProbability, 2)})`, color: COLORS.theory, y: exact.winProbability, dashed: true });

  const traces = (k: Strategy): Series[] =>
    run.byStrategy[k].paths.map((path, i) => ({
      kind: 'line',
      key: `${k}${i}`,
      color: STRATEGY_COLOR[k],
      width: 1.4,
      opacity: 0.6,
      points: path.map((y, x) => ({ x, y })),
    }));
  const longest = (k: Strategy) => Math.max(4, ...run.byStrategy[k].paths.map((p) => p.length - 1));
  const traceValues = STRATEGIES.flatMap((k) => run.byStrategy[k].paths.flat());
  const traceDomain = paddedDomain([config.capital, ...traceValues], { minSpan: 8, pad: 0.06 });

  return (
    <>
      <div className="charts">
        {STRATEGIES.map((k) => (
          <Histogram
            key={k}
            title={`Come finiscono le sessioni · ${STRATEGY_NAME[k]}`}
            bins={histogram(run.byStrategy[k].results.map((r) => r.net), domain)}
            total={run.byStrategy[k].results.length}
            domain={domain}
            color={STRATEGY_COLOR[k]}
            mean={summarizeStrategy(run.byStrategy[k]).meanNet}
            formatMean={(v) => signed(v, 2)}
          />
        ))}
      </div>
      <div className="charts">
        <Chart
          title="Guadagno medio per sessione"
          summary="La media dei risultati al crescere del numero di giocatori simulati."
          caption="Ogni punto è la media dei risultati dei giocatori simulati fin lì. Con pochi giocatori può cambiare molto da un esperimento all’altro."
          xLabel="giocatori"
          yLabel="gettoni per sessione"
          xDomain={xDomain}
          yDomain={meanDomain}
          formatY={(v) => signed(v, Math.abs(meanDomain[1] - meanDomain[0]) < 4 ? 1 : 0)}
          heading={playersHeading}
          series={meanSeries}
        />
        <Chart
          title="Sessioni chiuse in vantaggio"
          summary="La frequenza delle sessioni vincenti al crescere del numero di giocatori simulati."
          xLabel="giocatori"
          yLabel="frequenza"
          xDomain={xDomain}
          yDomain={[0, 1]}
          formatY={(v) => percent(v, 0)}
          heading={playersHeading}
          series={shareSeries}
        />
      </div>
      <div className="charts">
        {STRATEGIES.map((k) => (
          <Chart
            key={k}
            title={`Le prime ${integer(run.byStrategy[k].paths.length)} sessioni · ${STRATEGY_NAME[k]}`}
            summary="Il capitale giro dopo giro, per i primi giocatori simulati."
            xLabel="giri"
            yLabel="capitale"
            xDomain={[0, longest(k)]}
            yDomain={traceDomain}
            formatY={integer}
            heading={(x) => `Giro ${integer(x)}`}
            series={[{ kind: 'rule', key: 'start', label: 'Capitale iniziale', color: COLORS.muted, y: config.capital }, ...traces(k)]}
          />
        ))}
      </div>
    </>
  );
}

function Why({ config }: { config: LabConfig }) {
  const t = cycleTheory(config.capital, config);
  const k = t.levels;
  const q = THEORY.loseProbability;
  const stakes = Array.from({ length: k }, (_, j) => integer(martingaleStake(config.base, j))).join(' + ');
  return (
    <details className="why">
      <summary>Perché il sistema non è infallibile</summary>
      {k > 0 && (
        <>
          <p>
            Con {integer(config.capital)} gettoni, base {integer(config.base)} e limite {limitName(config.limit)} il sistema può reggere{' '}
            {k === 1 ? 'una sola puntata' : `${k} puntate di fila`}: {stakes} = {integer(cycleLoss(config.base, k))} gettoni.
          </p>
          <p className="formula">
            P(perdere {k} volte di fila) = (19/37)<sup>{k}</sup> ≈ {percent(q ** k, 2)}
          </p>
          <p className="formula">
            E = {percent(1 - q ** k, 2)} · (+{integer(t.win)}) + {percent(q ** k, 2)} · (−{integer(t.loss)}) ≈ {signed(t.expected, 3)} gettoni per ciclo
          </p>
          <p>
            Il sistema trasforma tante piccole vincite in una perdita rara e grande. La vincita è frequente; la convenienza no: la perdita rara
            pesa più di tutte le vincite messe insieme.
          </p>
        </>
      )}
      <p>
        Ogni gettone puntato vale in media 18/37 · (+1) + 19/37 · (−1) = −1/37 ≈ {EDGE}. Nessuna strategia cambia questo numero: decide solo quanto si
        punta e quando ci si ferma. Per questo, in ogni simulazione, il guadagno diviso il puntato si avvicina a {EDGE} per il raddoppio come per la
        puntata fissa: si perde in media l’1/37 di ciò che si punta.
      </p>
      <p>
        La pallina non ricorda i giri precedenti: dopo cinque neri il rosso ha ancora probabilità 18/37. Raddoppiare dopo una sconfitta è inseguire le
        perdite, in forma matematica.
      </p>
    </details>
  );
}

const stopLabel = (config: LabConfig) =>
  `capitale ${integer(config.capital)} · base ${integer(config.base)} · limite ${limitName(config.limit)} · obiettivo ${goalName(config.goal)} · al più ${integer(config.maxSpins)} giri`;

interface Props {
  lab: Lab;
  setup: Setup;
}

export default function LabTab({ lab }: Props) {
  const [capital, setCapital] = useState<(typeof CAPITALS)[number]>(63);
  const [base, setBase] = useState<(typeof BASES)[number]>(1);
  const [limit, setLimit] = useState<(typeof LIMITS)[number]>(100);
  const [goal, setGoal] = useState<(typeof GOALS)[number]>(1);
  const [players, setPlayers] = useState<(typeof PLAYERS)[number]>(1000);
  const [maxSpins, setMaxSpins] = useState<(typeof CAPS)[number]>(1000);
  const [seed, setSeed] = useState(randomSeed);
  // Off at every load: at the LIM, the next class starts from the data.
  const [theory, setTheory] = useState(false);
  const { selected, running } = lab;

  const config: LabConfig = { capital, base, limit, goal, maxSpins, players, seed };
  const levels = maxLevels(capital, { base, limit });

  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const start = () => {
    if (running || !Number.isInteger(seed) || seed < 0) return;
    lab.start(config, reduced());
    setSeed(randomSeed());
  };
  const repeat = (run: LabRun) => !running && lab.start(run.config, reduced());

  return (
    <>
      <p className="lab-banner">
        <strong>Simulazione</strong> Giocatori indipendenti, una sessione ciascuno. Non tocca il tuo capitale né le tue sessioni. Ogni giocatore gioca
        con il raddoppio e con la puntata fissa sugli stessi giri della ruota, sempre sul rosso.
      </p>
      <div className="lab-controls">
        <Choice legend="Capitale" options={CAPITALS} value={capital} onChange={setCapital} format={integer} disabled={running} />
        <Choice legend="Puntata base" options={BASES} value={base} onChange={setBase} format={integer} disabled={running} />
        <Choice legend="Limite del tavolo" options={LIMITS} value={limit} onChange={setLimit} format={limitName} disabled={running} />
        <Choice legend="Obiettivo" options={GOALS} value={goal} onChange={setGoal} format={goalName} disabled={running} />
        <Choice legend="Giocatori" options={PLAYERS} value={players} onChange={setPlayers} format={integer} disabled={running} />
        <Choice legend="Giri al massimo" options={CAPS} value={maxSpins} onChange={setMaxSpins} format={integer} disabled={running} />
        <label className="seed">
          <span>Seme</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={999999}
            value={seed}
            disabled={running}
            onChange={(e) => setSeed(Math.max(0, Math.min(999_999, Math.floor(Number(e.target.value) || 0))))}
          />
        </label>
        <button type="button" className="primary" aria-disabled={running} onClick={start}>
          {running ? 'Simulazione in corso…' : 'Avvia la simulazione'}
        </button>
      </div>
      <p className="note">
        Una sessione finisce quando raggiunge l’obiettivo, quando la puntata successiva non è possibile (capitale o limite del tavolo) o dopo{' '}
        {integer(maxSpins)} giri. Con queste regole il raddoppio regge {levels} {levels === 1 ? 'sconfitta' : 'sconfitte'} di fila. Lo stesso seme
        ripete lo stesso esperimento.
      </p>

      {selected ? (
        <>
          <h3 className="run-title">
            Esperimento {selected.id} · {integer(selected.done)}
            {selected.done < selected.config.players ? ` di ${integer(selected.config.players)}` : ''} giocatori · seme {selected.config.seed}
            <small>{stopLabel(selected.config)}</small>
          </h3>
          <label className="switch">
            <input type="checkbox" checked={theory} onChange={(e) => setTheory(e.target.checked)} />
            <span>Mostra i valori teorici</span>
          </label>
          <Comparison run={selected} theory={theory} />
          <Results run={selected} theory={theory} />
          {lab.runs.length > 0 && (
            <div className="table-wrap">
              <table className="games">
                <thead>
                  <tr>
                    <th scope="col">N.</th>
                    <th scope="col">Regole</th>
                    <th scope="col">Seme</th>
                    <th scope="col">Raddoppio</th>
                    <th scope="col" />
                  </tr>
                </thead>
                <tbody>
                  {[...lab.runs].reverse().map((run) => {
                    const m = summarizeStrategy(run.byStrategy.martingale);
                    return (
                      <tr key={run.id} data-current={run === selected || undefined}>
                        <th scope="row">
                          <button type="button" className="link" onClick={() => lab.select(run.id)}>
                            {run.id}
                          </button>
                        </th>
                        <td className="rules-cell">
                          {integer(run.config.players)} giocatori, capitale {integer(run.config.capital)}, obiettivo {goalName(run.config.goal)}
                        </td>
                        <td>{run.config.seed}</td>
                        <td>
                          {orDash(m.winShare, (v) => percent(v, 1))} in vantaggio
                          <br />
                          media {orDash(m.meanNet, (v) => signed(v, 2))}
                        </td>
                        <td>
                          <button type="button" className="link" aria-disabled={running} onClick={() => repeat(run)}>
                            Ripeti
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="row-end">
            <ClearButton label="Azzera le simulazioni" confirm="Conferma: cancella gli esperimenti" onConfirm={lab.clear} />
          </div>
        </>
      ) : (
        <p className="empty">Scegli le regole e quanti giocatori, poi avvia. Ogni esperimento è indipendente e resta separato dagli altri.</p>
      )}
      <Why config={config} />
    </>
  );
}
