/**
 * Operazioni con i vettori: sum, difference and multiplication by a scalar as constructions
 * with arrows, and the same operations done in components. Intent in brief.md, structure in
 * README.md, conventions in docs/style/interactive.md.
 *
 *   model/  the vectors, the operations and their constructions as pieces: pure, tested;
 *   ui/     the diagram (Stage), the panel, formulas, the Cartesian reading, label placement.
 */
import { useMemo, useRef, useState } from 'react';
import type { MouseEvent, PointerEvent, ReactNode } from 'react';
import './styles.css';
import { INITIAL, K_MAX, K_MIN, mixMotion, mixVectors, motionFor, REST } from './model/operations.ts';
import type { Construction, DiffMode, Key, Operation, SumOrder, Vectors } from './model/operations.ts';
import { clamp, snap, vec } from './model/vec.ts';
import { text } from './ui/format.ts';
import { algebra, keysOf, reading, SYM } from './ui/formulas.ts';
import type { Formula } from './ui/formulas.ts';
import { Icon } from './ui/icons.tsx';
import type { IconName } from './ui/icons.tsx';
import NumberField from './ui/NumberField.tsx';
import Rich from './ui/Rich.tsx';
import Stage from './ui/Stage.tsx';
import Tex from './ui/Tex.tsx';
import { useFullscreen } from './ui/useFullscreen.ts';
import { useTween } from './ui/useTween.ts';

const ZOOMS = [4, 5.5, 7, 10, 14] as const;
const DEFAULT_ZOOM = 2;
const LIMIT = 30;
const START: Construction = { order: 'ab', diff: 'opposite', parallelogram: false };

const OPERATIONS: [Operation, string, string][] = [
  ['sum', 'Somma', `${SYM.a} + ${SYM.b}`],
  ['difference', 'Differenza', `${SYM.a} - ${SYM.b}`],
  ['scalar', 'Per uno scalare', `k\\,${SYM.a}`],
];

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: T;
  options: readonly (readonly [T, ReactNode])[];
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={className ? `segmented ${className}` : 'segmented'} role="radiogroup" aria-label={label}>
      {options.map(([v, content]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)}>
          {content}
        </button>
      ))}
    </div>
  );
}

/** The keys of the innermost highlightable term under the pointer (hk-* classes), if any. */
function termKeys(target: EventTarget | null): Key[] | null {
  const element = target instanceof Element ? target.closest('[class*="hk-"]') : null;
  if (!element) return null;
  const keys = keysOf(element.classList);
  return keys.length > 0 ? keys : null;
}

export default function VectorOperationsExplorer() {
  const root = useRef<HTMLDivElement>(null);
  const fullscreen = useFullscreen(root);
  const [vectors, setVectors, target] = useTween<Vectors>(INITIAL, mixVectors);
  const [op, setOp] = useState<Operation>('sum');
  const [construction, setConstruction] = useState<Construction>(START);
  const [motion, setMotion] = useTween(() => motionFor('sum', START), mixMotion);
  const [masked, setMasked] = useState(false);
  const [showComponents, setShowComponents] = useState(false);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [hover, setHover] = useState<Key[] | null>(null);
  const [pinned, setPinned] = useState<{ id: string; keys: Key[] } | null>(null);

  const focus = useMemo(() => new Set<Key>(hover ?? pinned?.keys ?? []), [hover, pinned]);
  const goal = target.current;
  const info = reading(vectors, op, construction, masked);

  /** Changes the operation or the construction; `fromRest` replays it from the common tail. */
  const construct = (next: { op?: Operation } & Partial<Construction>, fromRest = false) => {
    const o = next.op ?? op;
    const c: Construction = {
      order: next.order ?? construction.order,
      diff: next.diff ?? construction.diff,
      parallelogram: next.parallelogram ?? construction.parallelogram,
    };
    setOp(o);
    setConstruction(c);
    if (fromRest) setMotion({ ...REST, fill: c.parallelogram ? 1 : 0 });
    const flipping = o === 'difference' && c.diff === 'opposite' && (fromRest || next.diff === 'opposite');
    setMotion(motionFor(o, c), flipping ? 850 : 480);
    setPinned(null);
  };

  const reset = () => {
    setVectors(INITIAL, 380);
    setOp('sum');
    setConstruction(START);
    setMotion(REST);
    setMotion(motionFor('sum', START), 480);
    setMasked(false);
    setShowComponents(false);
    setZoom(DEFAULT_ZOOM);
    setPinned(null);
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

  /** Pointer and keyboard behaviour shared by formula rows and the algebra block. */
  const highlight = (id: string, keys: Key[]) => ({
    tabIndex: 0,
    role: 'button',
    'aria-pressed': pinned?.id.startsWith(`${id}:`) ?? false,
    onPointerMove: (e: PointerEvent) => e.pointerType === 'mouse' && setHover(termKeys(e.target) ?? keys),
    onPointerLeave: (e: PointerEvent) => e.pointerType === 'mouse' && setHover(null),
    onFocus: () => setHover(keys),
    onBlur: () => setHover(null),
    onClick: (e: MouseEvent) => {
      // A tap on a term pins that object (or direction); elsewhere, the whole row.
      const k = termKeys(e.target) ?? keys;
      const pin = `${id}:${k.join(',')}`;
      setPinned(pinned?.id === pin ? null : { id: pin, keys: k });
    },
  });

  const row = (f: Formula, main = false) => {
    const lit = f.keys.some((k) => focus.has(k));
    return (
      <li
        key={f.id}
        className={`formula${main ? ' formula-main' : ''}${lit ? ' is-lit' : ''}${pinned?.id.startsWith(`${f.id}:`) ? ' is-pinned' : ''}`}
        {...highlight(f.id, f.keys)}
      >
        <Tex tex={f.tex} />
      </li>
    );
  };

  const setComponent = (which: 'a' | 'b', axis: 'x' | 'y') => (value: number) =>
    setVectors({ ...goal, [which]: vec(axis === 'x' ? value : goal[which].x, axis === 'y' ? value : goal[which].y) }, 220);

  const parallelogramToggle = (
    <button
      type="button"
      className="toggle"
      aria-pressed={construction.parallelogram}
      onClick={() => construct({ parallelogram: !construction.parallelogram })}
    >
      <Icon name="para" />
      Parallelogramma
    </button>
  );

  return (
    <div className="vector-operations-explorer" ref={root}>
      <div className="shell">
        <div className="stage-wrap">
          <Stage
            state={vectors}
            onChange={(next) => setVectors(next)}
            op={op}
            order={construction.order}
            motion={motion}
            focus={focus}
            onHover={setHover}
            half={ZOOMS[zoom]}
          >
            <div className="stage-tools" data-reserve>
              {tool(masked ? 'Mostra i valori' : 'Nascondi i valori', masked ? 'eye-off' : 'eye', () => setMasked(!masked), {
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
            <h3>Operazione</h3>
            <Segmented
              label="Operazione"
              className="segmented-large"
              value={op}
              options={OPERATIONS.map(([value, name, formula]) => [
                value,
                <span key={value} className="op-option">
                  <Tex tex={formula} />
                  <span>{name}</span>
                </span>,
              ])}
              onChange={(o) => construct({ op: o }, true)}
            />
            {op === 'sum' && (
              <div className="construction">
                <Segmented
                  label="Ordine degli addendi"
                  value={construction.order}
                  options={[
                    ['ab', <Tex key="ab" tex={`${SYM.a} + ${SYM.b}`} />],
                    ['ba', <Tex key="ba" tex={`${SYM.b} + ${SYM.a}`} />],
                  ]}
                  onChange={(order: SumOrder) => construct({ order })}
                />
                {parallelogramToggle}
              </div>
            )}
            {op === 'difference' && (
              <div className="construction">
                <Segmented
                  label="Costruzione della differenza"
                  value={construction.diff}
                  options={[
                    ['opposite', <Tex key="o" tex={`${SYM.a} + (${SYM.nb})`} />],
                    ['tips', 'Fra le punte'],
                  ]}
                  onChange={(diff: DiffMode) => construct({ diff })}
                />
                {parallelogramToggle}
              </div>
            )}
            {op === 'scalar' && (
              <div className="k-control">
                <label className="k-slider">
                  <span className="k-name">
                    <Tex tex={SYM.k} />
                  </span>
                  <input
                    type="range"
                    min={K_MIN}
                    max={K_MAX}
                    step={0.1}
                    list="vector-operations-k-ticks"
                    value={goal.k}
                    aria-label="Scalare k"
                    onChange={(e) => {
                      const raw = Number(e.target.value);
                      // A gentle pull towards whole numbers and halves.
                      const near = Math.round(raw * 2) / 2;
                      setVectors({ ...goal, k: clamp(snap(Math.abs(raw - near) < 0.06 ? near : raw, 0.1), K_MIN, K_MAX) });
                    }}
                  />
                  <datalist id="vector-operations-k-ticks">
                    {[-3, -2, -1, 0, 1, 2, 3].map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                  <output className="k-value">{text(goal.k, 1)}</output>
                </label>
                <div className="k-presets" role="group" aria-label="Valori di k">
                  {[-2, -1, -0.5, 0, 0.5, 1, 2].map((k) => (
                    <button
                      key={k}
                      type="button"
                      aria-pressed={Math.abs(goal.k - k) < 1e-9}
                      onClick={() => setVectors({ ...goal, k }, 380)}
                    >
                      {text(k, 1)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="card relations" data-focus={[...focus].join(' ')} onPointerLeave={() => setHover(null)}>
            <h3>Relazioni</h3>
            <ul>{row(info.main, true)}</ul>
            <ul className="formula-group">{info.rows.map((f) => row(f))}</ul>
            {info.notes.length > 0 && (
              <div className="notes">
                {info.notes.map((n) => (
                  <p key={n}>
                    <Rich source={n} />
                  </p>
                ))}
              </div>
            )}
            <button
              type="button"
              className="disclosure"
              aria-expanded={showComponents}
              onClick={() => setShowComponents(!showComponents)}
            >
              <Icon name="chevron" />
              In componenti cartesiane
            </button>
            {showComponents && (
              <div className="components">
                <div className="value-grid">
                  <NumberField className="tint-a" label={<Tex tex="a_x" />} name="Componente a x" value={goal.a.x} min={-LIMIT} max={LIMIT} onChange={setComponent('a', 'x')} />
                  <NumberField className="tint-a" label={<Tex tex="a_y" />} name="Componente a y" value={goal.a.y} min={-LIMIT} max={LIMIT} onChange={setComponent('a', 'y')} />
                  {op !== 'scalar' && (
                    <>
                      <NumberField className="tint-b" label={<Tex tex="b_x" />} name="Componente b x" value={goal.b.x} min={-LIMIT} max={LIMIT} onChange={setComponent('b', 'x')} />
                      <NumberField className="tint-b" label={<Tex tex="b_y" />} name="Componente b y" value={goal.b.y} min={-LIMIT} max={LIMIT} onChange={setComponent('b', 'y')} />
                    </>
                  )}
                </div>
                <div
                  className={`algebra${pinned?.id.startsWith('algebra:') ? ' is-pinned' : ''}`}
                  aria-label="Calcolo in componenti"
                  {...highlight('algebra', ['x', 'y'])}
                >
                  <Tex tex={algebra(vectors, op, masked)} display />
                </div>
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
