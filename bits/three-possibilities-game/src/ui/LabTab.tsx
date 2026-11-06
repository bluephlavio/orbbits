/**
 * The simulation: both strategies applied to the same random games. Its own visual register, so
 * that it cannot be mistaken for the games really played, which it never touches.
 */
import { useMemo, useState } from 'react';
import { summarizeRun } from '../game/lab.ts';
import type { LabRun, LabSample, PairedGame } from '../game/lab.ts';
import { LABELS, STRATEGIES, THEORY } from '../game/rules.ts';
import type { Strategy } from '../game/rules.ts';
import Chart from './Chart.tsx';
import type { Series } from './Chart.tsx';
import ClearButton from './ClearButton.tsx';
import { FRACTION, STRATEGY_COLOR, STRATEGY_NAME } from './colors.ts';
import { asPercent, games, integer, orDash, percent } from './format.ts';
import RatePlot from './RatePlot.tsx';
import { Stat, Stats } from './Stats.tsx';
import type { Lab } from './useLab.ts';

const GAME_OPTIONS = [100, 1000, 10000] as const;
const SERIES_OPTIONS = [1, 10, 30, 100] as const;

const sampleOf: Record<Strategy, (s: LabSample) => number> = {
  stay: (s) => s.stay,
  switch: (s) => s.change,
};

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
          <input type="radio" name={`tp-${legend}`} checked={option === value} onChange={() => onChange(option)} />
          <span>{integer(option)}</span>
        </label>
      ))}
    </fieldset>
  );
}

function Won({ win }: { win: boolean }) {
  return <span className="verdict-mark" data-win={win || undefined}>{win ? 'vince' : 'perde'}</span>;
}

function FirstGames({ rows }: { rows: readonly PairedGame[] }) {
  return (
    <div className="table-wrap table-plain">
      <table className="games">
        <caption>Le prime partite, una per riga: stessa configurazione, due strategie</caption>
        <thead>
          <tr>
            <th scope="col">Meteorite</th>
            <th scope="col">Prima scelta</th>
            <th scope="col">Rivelata</th>
            <th scope="col">Conferma</th>
            <th scope="col">Cambia</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((game, i) => (
            <tr key={i}>
              <th scope="row">{LABELS[game.prize]}</th>
              <td>{LABELS[game.pick]}</td>
              <td>{LABELS[game.opened]}</td>
              <td><Won win={game.stayWins} /></td>
              <td><Won win={game.switchWins} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Crossing({ run }: { run: LabRun }) {
  const s = summarizeRun(run);
  return (
    <div>
      <table className="crossing">
        <caption>Sulle stesse {integer(s.played)} partite</caption>
        <thead>
          <tr>
            <td />
            <th scope="col">Cambiare vince</th>
            <th scope="col">Cambiare perde</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Confermare vince</th>
            <td data-empty>{integer(s.bothWin)}</td>
            <td>{integer(s.stayWins - s.bothWin)}</td>
          </tr>
          <tr>
            <th scope="row">Confermare perde</th>
            <td>{integer(s.switchWins - s.bothWin)}</td>
            <td data-empty>{integer(s.bothLose)}</td>
          </tr>
        </tbody>
      </table>
      <p className="note table-note">
        Le due strategie non vincono mai insieme e non perdono mai insieme. «Conferma» vince esattamente quando la prima
        scelta era giusta: i due numeri coincidono.
      </p>
    </div>
  );
}

function LabCharts({ run, theory }: { run: LabRun; theory: boolean }) {
  const { games: total, series: count } = run.config;
  const progress = run.series[0]?.played ?? 0;
  const single = count === 1;
  const opacity = single ? 1 : Math.max(0.22, Math.min(0.7, 6 / count));
  const xDomain = useMemo(() => [0, total] as const, [total]);
  const yDomain = useMemo(() => [0, 1] as const, []);

  const series = useMemo(() => {
    const drawn: Series[] = [];
    for (const strategy of STRATEGIES) {
      const pick = sampleOf[strategy];
      const color = STRATEGY_COLOR[strategy];
      if (single) {
        drawn.push({
          kind: 'line',
          key: strategy,
          label: STRATEGY_NAME[strategy],
          color,
          points: run.series[0].samples.map((s) => ({ x: s.n, y: pick(s) })),
          endDot: true,
        });
        continue;
      }
      run.series.forEach((s, i) => {
        drawn.push({
          kind: 'line',
          key: `${strategy}${i}`,
          color,
          width: 1.25,
          opacity,
          points: s.samples.map((sample) => ({ x: sample.n, y: pick(sample) })),
        });
      });
      // The average of the series, sample by sample: what the crosshair reads.
      drawn.push({
        kind: 'line',
        key: `mean-${strategy}`,
        label: `Media delle serie: ${STRATEGY_NAME[strategy]}`,
        color,
        width: 2.5,
        points: run.series[0].samples.map((sample, i) => ({
          x: sample.n,
          y: run.series.reduce((sum, s) => sum + pick(s.samples[i] ?? sample), 0) / count,
        })),
      });
    }
    return drawn;
    // `progress` stands for the samples, which the simulator appends in place.
  }, [run, progress, single, opacity, count]);

  const rules: Series[] = theory
    ? STRATEGIES.map((strategy) => ({
        kind: 'rule',
        key: `theory-${strategy}`,
        label: `Teoria ${FRACTION[strategy]}`,
        color: STRATEGY_COLOR[strategy],
        y: THEORY[strategy],
        dashed: true,
      }))
    : [];

  const finals = STRATEGIES.map((strategy) => ({
    key: strategy,
    label: STRATEGY_NAME[strategy],
    color: STRATEGY_COLOR[strategy],
    marks: run.series
      .filter((s) => s.played > 0)
      .map((s) => (strategy === 'stay' ? s.stayWins : s.switchWins) / s.played),
    theory: theory ? THEORY[strategy] : undefined,
    note: `${integer(count)} serie`,
  }));

  const s = summarizeRun(run);
  const against = s.seriesAgainst;

  return (
    <div className="charts">
      <Chart
        title="Frequenza di vittoria, sulle stesse partite"
        summary={`Conferma ${orDash(s.stayRate, percent)}, Cambia ${orDash(s.switchRate, percent)} su ${integer(s.played)} partite simulate.`}
        caption="All’inizio ogni serie oscilla molto, poi si stabilizza. Le due linee di una serie sono speculari: quello che guadagna l’una lo perde l’altra."
        xLabel="partite simulate"
        yLabel="frequenza di vittoria"
        xDomain={xDomain}
        yDomain={yDomain}
        formatY={asPercent}
        heading={(x) => `Dopo ${games(x)}`}
        series={[...series, ...rules]}
      />
      {!single && (
        <RatePlot
          title="Da una serie all’altra"
          summary={`Risultati finali di ${integer(count)} serie da ${integer(total)} partite.`}
          caption={`Ogni punto è il risultato finale di una serie da ${games(total)}. In ${integer(against)} ${against === 1 ? 'serie' : 'serie su ' + integer(count)} cambiare non ha fatto meglio di confermare.`}
          rows={finals}
          legend={{ marks: 'Una serie', theory }}
        />
      )}
    </div>
  );
}

export default function LabTab({ lab, theory }: { lab: Lab; theory: boolean }) {
  const [gamesPerSeries, setGames] = useState<(typeof GAME_OPTIONS)[number]>(1000);
  const [series, setSeries] = useState<(typeof SERIES_OPTIONS)[number]>(30);
  const { selected, running } = lab;
  const summary = selected ? summarizeRun(selected) : null;

  const start = () => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    lab.start({ games: gamesPerSeries, series }, reduced);
  };

  return (
    <>
      <p className="lab-banner">
        <strong>Simulazione</strong> Non tocca le partite che hai giocato. Ogni configurazione casuale viene risolta due volte,
        con entrambe le strategie: stessa posizione del meteorite, stessa prima scelta, stessa pietra rivelata.
      </p>
      <div className="lab-controls">
        <Choice legend="Partite per serie" options={GAME_OPTIONS} value={gamesPerSeries} onChange={setGames} />
        <Choice legend="Serie indipendenti" options={SERIES_OPTIONS} value={series} onChange={setSeries} />
        <button type="button" className="primary" aria-disabled={running} onClick={start}>
          {running ? 'Simulazione in corso…' : 'Avvia la simulazione'}
        </button>
      </div>

      {selected && summary ? (
        <>
          <h3 className="run-title">
            Prova {selected.id}: {selected.config.series === 1 ? '1 serie' : `${integer(selected.config.series)} serie`} da {games(selected.config.games)}
          </h3>
          <Stats>
            <Stat label="Partite simulate" value={integer(summary.played)} />
            <Stat
              label="Vince «Conferma»"
              value={orDash(summary.stayRate, percent)}
              note={theory ? `teorica ${FRACTION.stay}` : `${integer(summary.stayWins)} partite`}
            />
            <Stat
              label="Vince «Cambia»"
              value={orDash(summary.switchRate, percent)}
              note={theory ? `teorica ${FRACTION.switch}` : `${integer(summary.switchWins)} partite`}
            />
            <Stat label="Prima scelta giusta" value={orDash(summary.firstRightRate, percent)} note={`${integer(summary.firstRight)} partite`} />
          </Stats>
          <div className="charts">
            <Crossing run={selected} />
            <FirstGames rows={selected.firstGames} />
          </div>
          <LabCharts run={selected} theory={theory} />
          {lab.runs.length > 1 && (
            <div className="table-wrap">
              <table className="games">
                <thead>
                  <tr>
                    <th scope="col">Prova</th>
                    <th scope="col">Serie × partite</th>
                    <th scope="col">Conferma</th>
                    <th scope="col">Cambia</th>
                  </tr>
                </thead>
                <tbody>
                  {[...lab.runs].reverse().map((run) => {
                    const s = summarizeRun(run);
                    return (
                      <tr key={run.id} data-current={run === selected || undefined}>
                        <th scope="row">
                          <button type="button" className="link" onClick={() => lab.select(run.id)}>
                            Prova {run.id}
                          </button>
                        </th>
                        <td>
                          {integer(run.config.series)} × {integer(run.config.games)}
                        </td>
                        <td>{orDash(s.stayRate, percent)}</td>
                        <td>{orDash(s.switchRate, percent)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="row-end">
            <ClearButton label="Azzera le simulazioni" confirm="Conferma: cancella le prove" onConfirm={lab.clear} />
          </div>
        </>
      ) : (
        <p className="empty">
          Scegli quante partite e quante serie, poi avvia. Ogni prova è un esperimento indipendente e resta separata dalle altre.
        </p>
      )}
    </>
  );
}
