/**
 * Vettori, componenti e versori: a precision blackboard for v⃗ = v_x x̂ + v_y ŷ.
 * Intent in brief.md, structure in README.md, conventions in docs/style/interactive.md.
 *
 *   model/  the arrow (tail A, tip B) and vector arithmetic: pure, tested;
 *   ui/     the diagram (Stage), the panel, formulas and label placement.
 *
 * One state, many views: the diagram, the inputs and the formulas all read the same ArrowState,
 * and pointing at a formula or at an object highlights the other.
 */
import { useMemo, useRef, useState } from 'react';
import './styles.css';
import { componentsOf, INITIAL, mixArrow, translateTo, withComponents } from './model/arrow.ts';
import type { ArrowState, Construction } from './model/arrow.ts';
import { vec } from './model/vec.ts';

import { formulaGroups, keysOf, notes, SYM } from './ui/formulas.ts';
import type { Key } from './ui/formulas.ts';
import NumberField from './ui/NumberField.tsx';
import Rich from './ui/Rich.tsx';
import Stage from './ui/Stage.tsx';
import type { Layers } from './ui/Stage.tsx';
import Tex from './ui/Tex.tsx';
import { Icon } from './ui/icons.tsx';
import type { IconName } from './ui/icons.tsx';
import { useFullscreen } from './ui/useFullscreen.ts';
import { useTween } from './ui/useTween.ts';

const NO_LAYERS: Layers = {
  versors: false,
  components: false,
  scalars: false,
  projections: false,
  coordinates: false,
};
const ZOOMS = [4, 5.5, 7, 10, 14] as const;
const DEFAULT_ZOOM = 2;
const GLIDE = 380;
const LIMIT = 30;

interface Chip {
  key: keyof Layers;
  label: string;
  /** Accessible name when the visible label is short. */
  name?: string;
  tex?: string;
  swatch: string;
}

const LAYER_CHIPS: Chip[] = [
  { key: 'versors', label: 'Versori', tex: `${SYM.xh},\\ ${SYM.yh}`, swatch: 'xh' },
  { key: 'projections', label: 'Proiezioni', swatch: 'aux' },
  { key: 'coordinates', label: 'Coordinate', swatch: 'point' },
];

/** The two kinds of component, side by side so that the distinction is the first thing read. */
const COMPONENT_CHIPS: Chip[] = [
  { key: 'components', label: 'vettoriali', name: 'Componenti vettoriali', tex: `${SYM.vx},\\ ${SYM.vy}`, swatch: 'x' },
  { key: 'scalars', label: 'scalari', name: 'Componenti scalari', tex: `${SYM.sx},\\ ${SYM.sy}`, swatch: 'scalar' },
];

/** The keys of the innermost highlightable term under the pointer (hk-* classes), if any. */
function termKeys(target: EventTarget | null): Key[] | null {
  const element = target instanceof Element ? target.closest('[class*="hk-"]') : null;
  if (!element) return null;
  const keys = keysOf(element.classList);
  return keys.length > 0 ? keys : null;
}

export default function VectorComponentsExplorer() {
  const root = useRef<HTMLDivElement>(null);
  const fullscreen = useFullscreen(root);
  const [arrow, setArrow, target] = useTween<ArrowState>(INITIAL, mixArrow);
  const [layers, setLayers] = useState<Layers>(NO_LAYERS);
  const [construction, setConstruction] = useState<Construction>('tip-to-tail');
  const [masked, setMasked] = useState(false);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [hover, setHover] = useState<Key[] | null>(null);
  const [pinned, setPinned] = useState<{ id: string; keys: Key[] } | null>(null);

  const focus = useMemo(() => new Set<Key>(hover ?? pinned?.keys ?? []), [hover, pinned]);
  const groups = formulaGroups(arrow, masked);
  const remarks = notes(arrow, masked);
  const goal = target.current;
  const v = componentsOf(goal);
  const atOrigin = goal.A.x === 0 && goal.A.y === 0;

  const reset = () => {
    setArrow(INITIAL, GLIDE);
    setLayers(NO_LAYERS);
    setConstruction('tip-to-tail');
    setMasked(false);
    setZoom(DEFAULT_ZOOM);
    setPinned(null);
  };

  const chip = (c: Chip) => (
    <button
      key={c.key}
      type="button"
      className="chip"
      data-swatch={c.swatch}
      aria-pressed={layers[c.key]}
      aria-label={c.name}
      onClick={() => setLayers({ ...layers, [c.key]: !layers[c.key] })}
    >
      <span className="chip-dot" aria-hidden="true" />
      {c.label}
      {c.tex && <Tex tex={c.tex} className="chip-tex" />}
    </button>
  );

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

  return (
    <div className="vector-components-explorer" ref={root}>
      <div className="shell">
        <div className="stage-wrap">
          <Stage
            state={arrow}
            onChange={(next) => setArrow(next)}
            layers={layers}
            construction={construction}
            focus={focus}
            onHover={setHover}
            half={ZOOMS[zoom]}
            masked={masked}
          >
            <div className="stage-tools" data-reserve>
              {tool(masked ? 'Mostra i valori' : 'Nascondi i valori', masked ? 'eye-off' : 'eye', () => setMasked(!masked), { pressed: masked, text: true })}
              {tool('Ricomincia', 'reset', reset)}
              {fullscreen.supported &&
                tool(fullscreen.active ? 'Esci da schermo intero' : 'Schermo intero', fullscreen.active ? 'shrink' : 'expand', fullscreen.toggle)}
            </div>
            <div className="zoom" role="group" aria-label="Zoom" data-reserve>
              <button type="button" aria-label="Ingrandisci" disabled={zoom === 0} onClick={() => setZoom(zoom - 1)}>
                <Icon name="plus" />
              </button>
              <button
                type="button"
                aria-label="Riduci"
                disabled={zoom === ZOOMS.length - 1}
                onClick={() => setZoom(zoom + 1)}
              >
                <Icon name="minus" />
              </button>
            </div>
          </Stage>
        </div>

        <aside className="side">
          <section className="card">
            <h3>Mostra</h3>
            <div className="chips">{LAYER_CHIPS.map(chip)}</div>
            <div className="chips chips-group" role="group" aria-label="Componenti">
              <span className="chips-label">Componenti</span>
              {COMPONENT_CHIPS.map(chip)}
            </div>
            <div className="segmented" role="radiogroup" aria-label="Costruzione delle componenti">
              {(
                [
                  ['tip-to-tail', 'Punta-coda'],
                  ['common-tail', 'Code coincidenti'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={construction === value}
                  onClick={() => {
                    setConstruction(value);
                    if (!layers.components) setLayers({ ...layers, components: true });
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section className="card values">
            <h3>Valori</h3>
            <div className="value-grid">
              <NumberField
                label={<Tex tex="x_A" />}
                name="Ascissa della coda A"
                value={goal.A.x}
                min={-LIMIT}
                max={LIMIT}
                onChange={(x) => setArrow(translateTo(goal, vec(x, goal.A.y)), 220)}
              />
              <NumberField
                label={<Tex tex="y_A" />}
                name="Ordinata della coda A"
                value={goal.A.y}
                min={-LIMIT}
                max={LIMIT}
                onChange={(y) => setArrow(translateTo(goal, vec(goal.A.x, y)), 220)}
              />
              <button
                type="button"
                className="square"
                disabled={atOrigin}
                aria-label="Coda nell’origine"
                title="Coda nell’origine: trasla il vettore"
                onClick={() => setArrow(translateTo(goal, vec(0, 0)), GLIDE)}
              >
                <Icon name="target" />
              </button>
              <NumberField
                className="tint-x"
                label={<Tex tex={SYM.sx} />}
                name="Componente scalare v x"
                value={v.x}
                masked={masked}
                min={-LIMIT}
                max={LIMIT}
                onChange={(x) => setArrow(withComponents(goal, vec(x, v.y)), 220)}
              />
              <NumberField
                className="tint-y"
                label={<Tex tex={SYM.sy} />}
                name="Componente scalare v y"
                value={v.y}
                masked={masked}
                min={-LIMIT}
                max={LIMIT}
                onChange={(y) => setArrow(withComponents(goal, vec(v.x, y)), 220)}
              />
            </div>
          </section>

          <section
            className="card relations"
            data-focus={[...focus].join(' ')}
            onPointerLeave={() => setHover(null)}
          >
            <h3>Relazioni</h3>
            {groups.map((g, i) => (
              <div className="formula-group" key={i} aria-label={g.title || undefined} role="group">
                {g.title && <h4>{g.title}</h4>}
                <ul>
                  {g.rows.map((f) => {
                    const lit = f.keys.some((k) => focus.has(k));
                    return (
                      <li
                        key={f.id}
                        className={`formula${f.main ? ' formula-main' : ''}${lit ? ' is-lit' : ''}${pinned?.id.startsWith(`${f.id}:`) ? ' is-pinned' : ''}`}
                        tabIndex={0}
                        aria-pressed={pinned?.id.startsWith(`${f.id}:`) ?? false}
                        role="button"
                        onPointerMove={(e) => e.pointerType === 'mouse' && setHover(termKeys(e.target) ?? f.keys)}
                        onPointerLeave={(e) => e.pointerType === 'mouse' && setHover(null)}
                        onFocus={() => setHover(f.keys)}
                        onBlur={() => setHover(null)}
                        onClick={(e) => {
                          // A tap on a term pins that object; on the rest of the row, the row.
                          const keys = termKeys(e.target) ?? f.keys;
                          const id = `${f.id}:${keys.join(',')}`;
                          setPinned(pinned?.id === id ? null : { id, keys });
                        }}
                      >
                        <Tex tex={f.tex} />
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
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
