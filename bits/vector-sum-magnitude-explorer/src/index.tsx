/**
 * Il modulo della somma: with |a⃗| and |b⃗| fixed, |a⃗ + b⃗| depends on the angle α between them.
 * Intent in brief.md, structure in README.md, conventions in docs/style/interactive.md.
 *
 *   model/  moduli, angle, the exact special cases: pure, tested;
 *   ui/     the diagram (Stage), the case readout, the range bar, the optional deepening.
 *
 * Layout: the construction is wide and low, so the stage spans the width and the controls sit
 * under it, unlike the two sibling Bits.
 */
import { useMemo, useRef, useState } from 'react';
import './styles.css';
import { caseOf, cosineRule, INITIAL, MOD_MAX, MOD_MIN, MOD_STEP, mixConfig, range, sumModulus } from './model/magnitude.ts';
import type { Case, Config } from './model/magnitude.ts';
import { text, tex, texValue } from './ui/format.ts';
import { caseReading, COSINE_RULE, INEQUALITY, MA, MB, MS, rangeTex } from './ui/formulas.ts';
import { Icon } from './ui/icons.tsx';
import type { IconName } from './ui/icons.tsx';
import Rich from './ui/Rich.tsx';
import Stage from './ui/Stage.tsx';
import type { Key } from './ui/Stage.tsx';
import Tex from './ui/Tex.tsx';
import { useFullscreen } from './ui/useFullscreen.ts';
import { useTween } from './ui/useTween.ts';

/** The three special configurations; the pictogram shows the two directions. */
const CASES: { alpha: number; kind: Case; label: string; picto: string }[] = [
  { alpha: 0, kind: 'concordant', label: 'Paralleli concordi', picto: 'M2 9h9M8.5 6.5 11 9l-2.5 2.5M2 5h12M11.5 2.5 14 5l-2.5 2.5' },
  { alpha: 90, kind: 'perpendicular', label: 'Perpendicolari', picto: 'M3 13h10M10.5 10.5 13 13l-2.5 2.5M3 13V3M.5 5.5 3 3l2.5 2.5' },
  { alpha: 180, kind: 'discordant', label: 'Paralleli discordi', picto: 'M8 8h7M12.5 5.5 15 8l-2.5 2.5M8 8H1M3.5 5.5 1 8l2.5 2.5' },
];

/** Glide to a special angle slowly enough to watch |a⃗ + b⃗| change on the way. */
const turnDuration = (from: number, to: number) => Math.min(1400, 250 + Math.abs(to - from) * 7);

function Slider({
  label,
  name,
  value,
  min,
  max,
  step,
  unit = '',
  onChange,
  className,
}: {
  label: string;
  name: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
  className?: string;
}) {
  return (
    <label className={className ? `slider ${className}` : 'slider'}>
      <span className="slider-name">
        <Tex tex={label} />
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={name}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <output className="slider-value">
        {text(value, step < 1 ? 1 : 0)}
        {unit}
      </output>
    </label>
  );
}

/** |a⃗ + b⃗| as a function of α, with the current point: the continuous picture. */
function Curve({ config, masked }: { config: Config; masked: boolean }) {
  const W = 320;
  const H = 150;
  const m = { l: 34, r: 12, t: 12, b: 26 };
  const [lo, hi] = range(config);
  const x = (alpha: number) => m.l + (alpha / 180) * (W - m.l - m.r);
  const y = (v: number) => H - m.b - (v / Math.max(hi, 1e-9)) * (H - m.t - m.b);
  const points = Array.from({ length: 91 }, (_, i) => {
    const alpha = i * 2;
    return `${x(alpha).toFixed(1)},${y(cosineRule({ ...config, alpha })).toFixed(1)}`;
  }).join(' ');
  const current = sumModulus(config);
  return (
    <svg className="curve" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Modulo della somma in funzione di alfa">
      {[lo, hi].map((v, i) => (
        <g key={i}>
          <line className="curve-guide" x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} />
          <text className="curve-tick" x={m.l - 6} y={y(v)} textAnchor="end" dominantBaseline="central">
            {text(v, 2)}
          </text>
        </g>
      ))}
      <line className="curve-axis" x1={m.l} x2={W - m.r} y1={H - m.b} y2={H - m.b} />
      {[0, 90, 180].map((a) => (
        <g key={a}>
          <line className="curve-axis" x1={x(a)} x2={x(a)} y1={H - m.b} y2={H - m.b + 4} />
          <text className="curve-tick" x={x(a)} y={H - m.b + 15} textAnchor="middle">
            {a}°
          </text>
        </g>
      ))}
      <polyline className="curve-line" points={points} />
      {!masked && <circle className="curve-point" cx={x(config.alpha)} cy={y(current)} r={4.5} />}
    </svg>
  );
}

export default function VectorSumMagnitudeExplorer() {
  const root = useRef<HTMLDivElement>(null);
  const fullscreen = useFullscreen(root);
  const [config, setConfig, target] = useTween<Config>(INITIAL, mixConfig);
  const [parallelogram, setParallelogram] = useState(false);
  const [masked, setMasked] = useState(false);
  const [deep, setDeep] = useState(false);
  const [hover, setHover] = useState<Key[] | null>(null);
  const focus = useMemo(() => new Set<Key>(hover ?? []), [hover]);

  const goal = target.current;
  // During a glide α is fractional; the readout follows it, the case is the exact one.
  const shown: Config = config;
  const reading = caseReading(shown, masked);
  const [lo, hi] = range(shown);
  const s = sumModulus(shown);
  const kind = caseOf(shown.alpha);

  const reset = () => {
    setConfig(INITIAL, 500);
    setParallelogram(false);
    setMasked(false);
    setDeep(false);
  };

  const tool = (label: string, icon: IconName, onClick: () => void, o: { pressed?: boolean; text?: boolean } = {}) => (
    <button
      type="button"
      className={o.text ? 'tool' : 'tool tool-icon'}
      aria-pressed={o.pressed}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <Icon name={icon} />
      {o.text && <span className="tool-text">{label}</span>}
    </button>
  );

  const pct = (v: number) => `${(100 * v) / Math.max(hi, 1e-9)}%`;

  return (
    <div className="vector-sum-magnitude-explorer" ref={root}>
      <div className="shell">
        <div className="stage-wrap">
          <Stage config={config} onChange={(next) => setConfig(next)} parallelogram={parallelogram} focus={focus} onHover={setHover}>
            <div className="stage-tools" data-reserve>
              {tool(masked ? 'Mostra i valori' : 'Nascondi i valori', masked ? 'eye-off' : 'eye', () => setMasked(!masked), {
                pressed: masked,
                text: true,
              })}
              {tool('Parallelogramma', 'para', () => setParallelogram(!parallelogram), { pressed: parallelogram })}
              {tool('Ricomincia', 'reset', reset)}
              {fullscreen.supported &&
                tool(fullscreen.active ? 'Esci da schermo intero' : 'Schermo intero', fullscreen.active ? 'shrink' : 'expand', fullscreen.toggle)}
            </div>
          </Stage>
        </div>

        <div className="strip">
          <section className="card controls">
            <h3>Vettori e angolo</h3>
            <Slider
              className="tint-a"
              label={MA}
              name="Modulo di a"
              value={goal.a}
              min={MOD_MIN}
              max={MOD_MAX}
              step={MOD_STEP}
              onChange={(a) => setConfig({ ...goal, a })}
            />
            <Slider
              className="tint-b"
              label={MB}
              name="Modulo di b"
              value={goal.b}
              min={MOD_MIN}
              max={MOD_MAX}
              step={MOD_STEP}
              onChange={(b) => setConfig({ ...goal, b })}
            />
            <Slider
              className="slider-alpha"
              label="\alpha"
              name="Angolo alfa fra i vettori"
              value={Math.round(shown.alpha)}
              min={0}
              max={180}
              step={1}
              unit="°"
              onChange={(alpha) => setConfig({ ...goal, alpha })}
            />
            <div className="cases" role="group" aria-label="Casi particolari">
              {CASES.map((c) => (
                <button
                  key={c.alpha}
                  type="button"
                  className="case"
                  aria-pressed={kind === c.kind}
                  onClick={() => setConfig({ ...goal, alpha: c.alpha }, turnDuration(shown.alpha, c.alpha))}
                >
                  <svg viewBox="0 0 16 16" aria-hidden="true" className="case-picto">
                    <path d={c.picto} />
                  </svg>
                  <span className="case-angle">{c.alpha}°</span>
                  <span className="case-label">{c.label}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="card result" aria-live="polite">
            <h3>{reading.title}</h3>
            <div className="big" onPointerEnter={() => setHover(['s'])} onPointerLeave={() => setHover(null)}>
              <Tex tex={reading.worked} />
            </div>
            {reading.rule && (
              <p className="rule">
                <Tex tex={reading.rule} />
              </p>
            )}
            {reading.note && (
              <p className="note">
                <Rich source={reading.note} />
              </p>
            )}
            <div className="compare">
              <Tex tex={`${MA} + ${MB} = ${tex(shown.a + shown.b, 2)}`} />
              {kind !== 'concordant' && !masked && (
                <span className="neq">
                  <Tex tex={`${MS} ${s < shown.a + shown.b - 1e-9 ? '<' : '='} ${MA} + ${MB}`} />
                </span>
              )}
            </div>
            <div className="range" aria-label="Intervallo dei valori possibili">
              <div className="range-track">
                <div className="range-span" style={{ left: pct(lo) }} />
                {!masked && <div className="range-mark" style={{ left: pct(s) }} />}
              </div>
              <div className="range-ticks">
                <span style={{ left: '0%' }}>0</span>
                {lo > hi * 0.14 && lo < hi * 0.86 && <span style={{ left: pct(lo) }}>{text(lo, 2)}</span>}
                <span style={{ left: '100%' }}>{text(hi, 2)}</span>
              </div>
            </div>
            <button type="button" className="disclosure" aria-expanded={deep} onClick={() => setDeep(!deep)}>
              <Icon name="chevron" />
              Approfondimento
            </button>
          </section>
        </div>

        {deep && (
          <section className="card deep">
            <h3>Approfondimento</h3>
            <div className="deep-grid">
              <div className="deep-text">
                <p>Fissati i moduli, il modulo della somma è compreso fra due valori:</p>
                <p className="deep-formula">
                  <Tex tex={INEQUALITY} />
                </p>
                <p className="deep-formula">
                  <Tex tex={rangeTex(shown)} />
                </p>
                <p>Con la trigonometria, per ogni angolo:</p>
                <p className="deep-formula">
                  <Tex tex={COSINE_RULE} />
                </p>
                {!masked && (
                  <p className="deep-formula">
                    <Tex
                      tex={`${MS} = \\sqrt{${tex(shown.a, 2)}^2 + ${tex(shown.b, 2)}^2 + 2 \\cdot ${tex(shown.a, 2)} \\cdot ${tex(shown.b, 2)} \\cos ${text(shown.alpha, 0)}^\\circ} ${texValue(cosineRule(shown))}`}
                    />
                  </p>
                )}
              </div>
              <figure className="deep-chart">
                <Curve config={shown} masked={masked} />
                <figcaption>
                  <Tex tex={`${MS}`} /> al variare di <Tex tex="\alpha" />, con <Tex tex={`${MA}`} /> e <Tex tex={`${MB}`} /> fissi
                </figcaption>
              </figure>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

