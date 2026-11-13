/**
 * Trigonometria e componenti di un vettore: the right triangle of v⃗ read in both directions,
 * from modulus and direction to the components and back, first in the first quadrant (angle α)
 * and then in all four (reference angle β, signs from the quadrant).
 * Intent in brief.md, structure in README.md, conventions in docs/style/interactive.md.
 *
 *   model/  the tip, its analysis (modulus, reference angle, quadrant, special cases): pure, tested;
 *   ui/     the diagram (Stage), the panel, formulas and label placement.
 *
 * One state, the tip of v⃗; the two modes only change what is given and what is computed.
 */
import { useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent, PointerEvent } from 'react';
import './styles.css';
import {
  analyse,
  ANGLE_MAX,
  ANGLE_MIN,
  INITIAL,
  INITIAL_POLAR,
  intoFirst,
  MOD_MIN,
  mixTip,
  normalisePolar,
  givenPolar,
  polarOf,
  ROMAN,
  tipOf,
  toCartesian,
  toPolar,
} from './model/direction.ts';
import type { Polar, Quadrant } from './model/direction.ts';
import { vec } from './model/vec.ts';
import type { Vec } from './model/vec.ts';
import { formulaGroups, keysOf, notes, SYM } from './ui/formulas.ts';
import type { Key, Mode } from './ui/formulas.ts';
import NumberField from './ui/NumberField.tsx';
import Rich from './ui/Rich.tsx';
import Stage from './ui/Stage.tsx';
import type { Layers } from './ui/Stage.tsx';
import Tex from './ui/Tex.tsx';
import { Icon } from './ui/icons.tsx';
import type { IconName } from './ui/icons.tsx';
import { useFullscreen } from './ui/useFullscreen.ts';
import { useTween } from './ui/useTween.ts';

const START_LAYERS: Layers = { triangle: true, projections: false, components: false };
const ZOOMS = [4, 5.5, 7, 10, 14] as const;
const DEFAULT_ZOOM = 2;
const GLIDE = 380;
/** Largest modulus or component accepted by the fields (the zoom follows). */
const LIMIT = 13;

/** The keys of the innermost highlightable term under the pointer (hk-* classes), if any. */
function termKeys(target: EventTarget | null): Key[] | null {
  const element = target instanceof Element ? target.closest('[class*="hk-"]') : null;
  if (!element) return null;
  const keys = keysOf(element.classList);
  return keys.length > 0 ? keys : null;
}

/** The smallest zoom level (from the current one outwards) at which the tip is on stage. */
function zoomFor(tip: Vec, zoom: number, first: boolean): number {
  const need = Math.max(Math.abs(tip.x), Math.abs(tip.y)) + 0.6;
  const reach = (i: number) => ZOOMS[i] * (first ? 1.45 : 1);
  let i = zoom;
  while (i < ZOOMS.length - 1 && reach(i) < need) i += 1;
  return i;
}

/** The four quadrants as on the plane (II I / III IV), with the signs of the components. */
function QuadrantSigns({ current, masked }: { current: Quadrant | null; masked: boolean }) {
  const cells: [Quadrant, string, string][] = [
    [2, '-', '+'],
    [1, '+', '+'],
    [3, '-', '-'],
    [4, '+', '-'],
  ];
  return (
    <div className="signs" role="table" aria-label="Segni delle componenti nei quattro quadranti">
      {cells.map(([q, x, y]) => (
        <div key={q} role="cell" className={`signs-cell${!masked && current === q ? ' is-current' : ''}`}>
          <span className="signs-q">{ROMAN[q]}</span>
          <Tex tex={`${SYM.sx}\\,${x === '-' ? '<' : '>'}\\,0,\\ ${SYM.sy}\\,${y === '-' ? '<' : '>'}\\,0`} />
        </div>
      ))}
    </div>
  );
}

export default function VectorTrigonometryExplorer() {
  const root = useRef<HTMLDivElement>(null);
  const fullscreen = useFullscreen(root);
  const [tip, setTip, target] = useTween<Vec>(INITIAL, mixTip);
  const [mode, setMode] = useState<Mode>('polar');
  const [first, setFirst] = useState(true);
  const [layers, setLayers] = useState<Layers>(START_LAYERS);
  const [steps, setSteps] = useState(false);
  const [masked, setMasked] = useState(false);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [hover, setHover] = useState<Key[] | null>(null);
  const [pinned, setPinned] = useState<{ id: string; keys: Key[] } | null>(null);

  const focus = useMemo(() => new Set<Key>(hover ?? pinned?.keys ?? []), [hover, pinned]);
  const goal = target.current;
  // In 'polar' the data are round; while gliding between them the tip is read as it is.
  const polar = polarOf(tip);
  const goalPolar = givenPolar(goal) ?? INITIAL_POLAR;
  const groups = formulaGroups(mode, tip, polar, { first, steps, masked });
  const remarks = notes(mode, tip, { first, masked });
  const info = analyse(goal);
  const angleName = first ? '\\alpha' : '\\beta';

  /** Moves the tip (gliding when `duration` > 0) and zooms out if it would leave the stage. */
  const go = (next: Vec, duration = 0) => {
    setTip(next, duration);
    setZoom((z) => zoomFor(next, z, first));
  };

  const reset = () => {
    setTip(INITIAL, GLIDE);
    setMode('polar');
    setFirst(true);
    setLayers(START_LAYERS);
    setSteps(false);
    setMasked(false);
    setZoom(DEFAULT_ZOOM);
    setPinned(null);
  };

  const changeMode = (m: Mode) => {
    if (m === mode) return;
    setMode(m);
    setPinned(null);
    go(m === 'cartesian' ? toCartesian(goal, first) : tipOf(toPolar(goal, first, LIMIT, INITIAL_POLAR)), GLIDE);
  };

  const changeFirst = (f: boolean) => {
    if (f === first) return;
    setFirst(f);
    setPinned(null);
    if (f) {
      const mirrored = intoFirst(goal);
      const next = mode === 'polar' ? tipOf(toPolar(mirrored, true, LIMIT, INITIAL_POLAR)) : mirrored;
      setTip(next, GLIDE);
    }
  };

  const setPolar = (p: Polar) => go(tipOf(normalisePolar(p, LIMIT)), 260);

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

  const chip = (key: keyof Layers, label: string, swatch: string, tex?: string) => (
    <button
      key={key}
      type="button"
      className="chip"
      data-swatch={swatch}
      aria-pressed={layers[key]}
      onClick={() => setLayers({ ...layers, [key]: !layers[key] })}
    >
      <span className="chip-dot" aria-hidden="true" />
      {label}
      {tex && <Tex tex={tex} className="chip-tex" />}
    </button>
  );

  const segmented = <T extends string | boolean>(name: string, value: T, options: [T, string][], onChange: (v: T) => void) => (
    <div className="segmented" role="radiogroup" aria-label={name}>
      {options.map(([v, label]) => (
        <button key={String(v)} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  );

  const row = (id: string, keys: Key[]) => ({
    tabIndex: 0,
    role: 'button',
    'aria-pressed': pinned?.id.startsWith(`${id}:`) ?? false,
    onPointerMove: (e: PointerEvent) => e.pointerType === 'mouse' && setHover(termKeys(e.target) ?? keys),
    onPointerLeave: (e: PointerEvent) => e.pointerType === 'mouse' && setHover(null),
    onFocus: () => setHover(keys),
    onBlur: () => setHover(null),
    onClick: (e: MouseEvent) => {
      const k = termKeys(e.target) ?? keys;
      const pin = `${id}:${k.join(',')}`;
      setPinned(pinned?.id === pin ? null : { id: pin, keys: k });
    },
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      const pin = `${id}:${keys.join(',')}`;
      setPinned(pinned?.id === pin ? null : { id: pin, keys });
    },
  });

  return (
    <div className="vector-trigonometry-explorer" ref={root}>
      <div className="shell">
        <div className="stage-wrap">
          <Stage
            tip={tip}
            onChange={(next) => setTip(next)}
            mode={mode}
            first={first}
            layers={layers}
            focus={focus}
            onHover={setHover}
            half={ZOOMS[zoom]}
            masked={masked}
          >
            <div className="stage-tools" data-reserve>
              {tool(masked ? 'Mostra i risultati' : 'Nascondi i risultati', masked ? 'eye-off' : 'eye', () => setMasked(!masked), {
                pressed: masked,
                text: true,
              })}
              {tool('Ricomincia', 'reset', reset)}
              {fullscreen.supported &&
                tool(fullscreen.active ? 'Esci da schermo intero' : 'Schermo intero', fullscreen.active ? 'shrink' : 'expand', fullscreen.toggle)}
            </div>
            <div className="zoom" role="group" aria-label="Zoom" data-reserve>
              <button type="button" aria-label="Ingrandisci" disabled={zoom === 0} onClick={() => setZoom(zoom - 1)}>
                <Icon name="plus" />
              </button>
              <button type="button" aria-label="Riduci" disabled={zoom === ZOOMS.length - 1} onClick={() => setZoom(zoom + 1)}>
                <Icon name="minus" />
              </button>
            </div>
          </Stage>
        </div>

        <aside className="side">
          <section className="card">
            <h3>Che cosa conosciamo</h3>
            {segmented<Mode>('Che cosa è dato', mode, [
              ['polar', 'Modulo e angolo'],
              ['cartesian', 'Componenti'],
            ], changeMode)}
            {segmented<boolean>('Quadranti', first, [
              [true, 'Primo quadrante'],
              [false, 'Tutti i quadranti'],
            ], changeFirst)}

            <div className="value-grid">
              {mode === 'polar' ? (
                <>
                  <NumberField
                    className="tint-v"
                    label={<Tex tex="|\vec v|" />}
                    name="Modulo del vettore"
                    value={goalPolar.mod}
                    min={MOD_MIN}
                    max={LIMIT}
                    onChange={(mod) => setPolar({ ...goalPolar, mod })}
                  />
                  <NumberField
                    className="tint-ang"
                    label={<Tex tex={`${angleName}\\;(^\\circ)`} />}
                    name={first ? 'Angolo alfa in gradi' : 'Angolo di riferimento beta in gradi'}
                    value={goalPolar.angle}
                    min={ANGLE_MIN}
                    max={ANGLE_MAX}
                    onChange={(angle) => setPolar({ ...goalPolar, angle })}
                  />
                  {!first && (
                    <div className="quadrants" role="radiogroup" aria-label="Quadrante">
                      {([2, 1, 3, 4] as Quadrant[]).map((q) => (
                        <button
                          key={q}
                          type="button"
                          role="radio"
                          aria-checked={goalPolar.quadrant === q}
                          aria-label={`${ROMAN[q]} quadrante`}
                          onClick={() => setPolar({ ...goalPolar, quadrant: q })}
                        >
                          {ROMAN[q]}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <NumberField
                    className="tint-x"
                    label={<Tex tex="v_x" />}
                    name="Componente scalare v x"
                    value={goal.x}
                    min={first ? 0 : -LIMIT}
                    max={LIMIT}
                    onChange={(x) => go(vec(x, goal.y), 220)}
                  />
                  <NumberField
                    className="tint-y"
                    label={<Tex tex="v_y" />}
                    name="Componente scalare v y"
                    value={goal.y}
                    min={first ? 0 : -LIMIT}
                    max={LIMIT}
                    onChange={(y) => go(vec(goal.x, y), 220)}
                  />
                </>
              )}
            </div>
            <p className="given">
              {mode === 'polar'
                ? first
                  ? 'Dati: il modulo e l’angolo α con il semiasse x positivo.'
                  : 'Dati: il modulo, l’angolo di riferimento β con l’asse x e il quadrante.'
                : 'Dati: le componenti scalari, numeri con segno.'}
            </p>
          </section>

          <section className="card">
            <h3>Mostra</h3>
            <div className="chips">
              {chip('triangle', 'Triangolo', 'tri', '|v_x|,\\ |v_y|')}
              {chip('projections', 'Proiezioni', 'scalar', 'v_x,\\ v_y')}
              {chip('components', 'Componenti vettoriali', 'x', '\\vec v_x,\\ \\vec v_y')}
            </div>
          </section>

          <section className="card relations" data-focus={[...focus].join(' ')} onPointerLeave={() => setHover(null)}>
            <div className="card-head">
              <h3>Calcolo</h3>
              <button type="button" className="switch" role="switch" aria-checked={steps} onClick={() => setSteps(!steps)}>
                <span className="switch-track" aria-hidden="true" />
                Passaggi
              </button>
            </div>
            {groups.map((g, i) => (
              <div className="formula-group" key={`${mode}-${i}`} role="group" aria-label={g.title || undefined}>
                {g.title && <h4>{g.title}</h4>}
                <ul>
                  {g.rows.map((f) => {
                    const lit = f.keys.some((k) => focus.has(k));
                    return (
                      <li
                        key={f.id}
                        className={`formula${f.main ? ' formula-main' : ''}${lit ? ' is-lit' : ''}${pinned?.id.startsWith(`${f.id}:`) ? ' is-pinned' : ''}`}
                        {...row(f.id, f.keys)}
                      >
                        <Tex tex={f.tex} />
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            {!first && <QuadrantSigns current={info.kind === 'quadrant' ? info.quadrant : null} masked={masked && mode === 'cartesian'} />}
            {remarks.length > 0 && (
              <div className="notes">
                {remarks.map((r) => (
                  <p key={r}>
                    <Rich source={r} />
                  </p>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
