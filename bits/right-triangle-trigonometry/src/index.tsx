/**
 * Triangoli rettangoli e rapporti trigonometrici: a geometric lab in which, for a fixed acute
 * angle, the sides of a right triangle change with its size and their ratios do not. The ratios
 * are shown first as ratios of sides; their names (sen, cos, tan) come on request.
 * Intent in brief.md, structure in README.md, conventions in docs/style/interactive.md.
 *
 *   model/  the triangle (α, AB), its sides, roles and ratios: pure, tested;
 *   ui/     the diagram (Stage), the panel, formulas and label placement.
 */
import { useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent, PointerEvent } from 'react';
import './styles.css';
import {
  ALPHA_MAX,
  ALPHA_MIN,
  beta,
  HYP_MIN,
  INITIAL,
  maxHyp,
  mixTriangle,
  normalise,
} from './model/triangle.ts';
import type { Reference, Triangle } from './model/triangle.ts';
import { text } from './ui/format.ts';
import {
  angleRow,
  cell,
  keysOf,
  LEN,
  notes,
  RAT,
  RATIO_ROLES,
  ratioName,
  ratioRows,
  ROLE_WORD,
  similarColumns,
} from './ui/formulas.ts';
import type { Key, RatioId } from './ui/formulas.ts';
import NumberField from './ui/NumberField.tsx';
import Rich from './ui/Rich.tsx';
import Stage from './ui/Stage.tsx';
import Tex from './ui/Tex.tsx';
import { Icon } from './ui/icons.tsx';
import type { IconName } from './ui/icons.tsx';
import { useFullscreen } from './ui/useFullscreen.ts';
import { useTween } from './ui/useTween.ts';

const GLIDE = 420;
const PRESETS = [30, 45, 60] as const;
/** Role words in the table's narrow first column. */
const SHORT = { opp: 'opp.', adj: 'adiac.', hyp: 'ipot.' } as const;

/** The keys of the innermost highlightable term under the pointer (hk-* classes), if any. */
function termKeys(target: EventTarget | null): Key[] | null {
  const element = target instanceof Element ? target.closest('[class*="hk-"]') : null;
  if (!element) return null;
  const keys = keysOf(element.classList);
  return keys.length > 0 ? keys : null;
}

export default function RightTriangleTrigonometry() {
  const root = useRef<HTMLDivElement>(null);
  const fullscreen = useFullscreen(root);
  const [tri, setTri, target] = useTween<Triangle>(INITIAL, mixTriangle);
  const [reference, setReference] = useState<Reference>('alpha');
  const [names, setNames] = useState(false);
  const [copies, setCopies] = useState(false);
  const [lengths, setLengths] = useState(true);
  const [masked, setMasked] = useState(false);
  const [hover, setHover] = useState<Key[] | null>(null);
  const [pinned, setPinned] = useState<{ id: string; keys: Key[] } | null>(null);

  const focus = useMemo(() => new Set<Key>(hover ?? pinned?.keys ?? []), [hover, pinned]);
  const goal = target.current;
  const rows = ratioRows(tri, reference, names, masked);
  const remarks = notes(tri, reference, { names, copies, masked });
  const columns = similarColumns(tri, reference);
  const angleSym = reference === 'alpha' ? '\\alpha' : '\\beta';

  const reset = () => {
    setTri(INITIAL, GLIDE);
    setReference('alpha');
    setNames(false);
    setCopies(false);
    setLengths(true);
    setMasked(false);
    setPinned(null);
  };

  const change = (next: Triangle, duration = 0) => setTri(normalise(next), duration);

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

  const chip = (label: string, pressed: boolean, onClick: () => void, swatch: string, tex?: string) => (
    <button type="button" className="chip" data-swatch={swatch} aria-pressed={pressed} onClick={onClick}>
      <span className="chip-dot" aria-hidden="true" />
      {label}
      {tex && <Tex tex={tex} className="chip-tex" />}
    </button>
  );

  /** Pointer and focus handlers of a row that lights its objects (and pins them on click). */
  const lit = (id: string, keys: Key[]) => ({
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
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const pin = `${id}:${keys.join(',')}`;
        setPinned(pinned?.id === pin ? null : { id: pin, keys });
      }
    },
  });
  const isLit = (keys: Key[]) => keys.some((k) => focus.has(k));
  const isPinned = (id: string) => pinned?.id.startsWith(`${id}:`) ?? false;

  const ratioHead = (id: RatioId) =>
    names
      ? ratioName(id, reference)
      : `\\dfrac{\\text{${SHORT[RATIO_ROLES[id][0]]}}}{\\text{${SHORT[RATIO_ROLES[id][1]]}}}`;

  return (
    <div className="right-triangle-trigonometry" ref={root}>
      <div className="shell">
        <div className="stage-wrap">
          <Stage
            tri={tri}
            onChange={(next) => setTri(next)}
            reference={reference}
            copies={copies}
            lengths={lengths}
            focus={focus}
            onHover={setHover}
            masked={masked}
          >
            <div className="stage-tools" data-reserve>
              {tool(masked ? 'Mostra i valori' : 'Nascondi i valori', masked ? 'eye-off' : 'eye', () => setMasked(!masked), { pressed: masked, text: true })}
              {tool('Ricomincia', 'reset', reset)}
              {fullscreen.supported &&
                tool(fullscreen.active ? 'Esci da schermo intero' : 'Schermo intero', fullscreen.active ? 'shrink' : 'expand', fullscreen.toggle)}
            </div>
          </Stage>
        </div>

        <aside className="side">
          <section className="card">
            <h3>Triangolo</h3>
            <div className="value-grid">
              <NumberField
                className="tint-ang"
                label={<Tex tex="\alpha\;(^\circ)" />}
                name="Angolo alfa in gradi"
                value={goal.alpha}
                min={ALPHA_MIN}
                max={ALPHA_MAX}
                onChange={(alpha) => change({ alpha, hyp: Math.min(goal.hyp, maxHyp(alpha)) }, 260)}
              />
              <div className="presets" role="group" aria-label="Angoli notevoli">
                {PRESETS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    aria-pressed={goal.alpha === a}
                    onClick={() => change({ alpha: a, hyp: Math.min(goal.hyp, maxHyp(a)) }, GLIDE)}
                  >
                    {a}°
                  </button>
                ))}
              </div>
              <NumberField
                className="tint-hyp"
                label={<Tex tex="AB" />}
                name="Ipotenusa AB"
                value={goal.hyp}
                min={HYP_MIN}
                max={maxHyp(goal.alpha)}
                onChange={(hyp) => change({ alpha: goal.alpha, hyp }, 260)}
              />
              <p className="readout">
                <Tex tex={angleRow(tri, 'alpha')} />
              </p>
            </div>
          </section>

          <section className="card">
            <h3>Mostra</h3>
            <div className="segmented" role="radiogroup" aria-label="Angolo di riferimento">
              {(['alpha', 'beta'] as const).map((r) => (
                <button key={r} type="button" role="radio" aria-checked={reference === r} onClick={() => setReference(r)}>
                  <span>Riferimento</span> <Tex tex={r === 'alpha' ? `\\alpha` : `\\beta`} />
                </button>
              ))}
            </div>
            <div className="chips">
              {chip('Lunghezze', lengths, () => setLengths(!lengths), 'len')}
              {chip('Triangoli simili', copies, () => setCopies(!copies), 'copy')}
              {chip('Nomi', names, () => setNames(!names), 'name', `\\operatorname{sen},\\ \\cos,\\ \\tan`)}
            </div>
          </section>

          <section className="card relations" data-focus={[...focus].join(' ')} onPointerLeave={() => setHover(null)}>
            <h3>Rapporti fra i lati</h3>
            <ul className={`ratios${names ? ' has-names' : ''}`}>
              {rows.map((r) => (
                <li
                  key={r.id}
                  className={`ratio${isLit(r.keys) ? ' is-lit' : ''}${isPinned(r.id) ? ' is-pinned' : ''}`}
                  {...lit(r.id, r.keys)}
                >
                  {r.name && <Tex tex={r.name} className="ratio-name" />}
                  <Tex tex={r.body} className="ratio-body" />
                </li>
              ))}
            </ul>
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

          {copies && (
            <section className="card similar" data-focus={[...focus].join(' ')} onPointerLeave={() => setHover(null)}>
              <h3>Triangoli simili</h3>
              <table className="similar-table">
                <caption className="sr-only">
                  Lati e rapporti di tre triangoli rettangoli con lo stesso angolo
                </caption>
                <thead>
                  <tr>
                    <th scope="col">
                      <span className="sr-only">Grandezza</span>
                    </th>
                    {columns.map((c) => (
                      <th key={c.name} scope="col" className={c.k === 1 ? 'is-main' : undefined}>
                        <Tex tex={c.name} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(['opp', 'adj', 'hyp'] as const).map((role) => (
                    <tr key={role} className={`row-len role-${role}${isLit([role]) ? ' is-lit' : ''}`} {...lit(`len-${role}`, [role])}>
                      <th scope="row">{ROLE_WORD[role]}</th>
                      {columns.map((c) => (
                        <td key={c.name} className={c.k === 1 ? 'is-main' : undefined}>
                          {cell(c.lengths[role], LEN, masked && !(role === 'hyp'))}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {(['sin', 'cos', 'tan'] as const).map((id, i) => (
                    <tr
                      key={id}
                      className={`row-ratio${i === 0 ? ' row-first' : ''}${isLit(RATIO_ROLES[id]) ? ' is-lit' : ''}`}
                      {...lit(`tab-${id}`, [...RATIO_ROLES[id], 'ang'])}
                    >
                      <th scope="row">
                        <Tex tex={ratioHead(id)} />
                      </th>
                      {columns.map((c) => (
                        <td key={c.name} className={c.k === 1 ? 'is-main' : undefined}>
                          {cell(c.ratios[id], RAT, masked)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="table-note">
                Scale <Tex tex="\tfrac12" />, <Tex tex="\tfrac34" /> e <Tex tex="1" /> dello stesso triangolo; lunghezze al
                centesimo, rapporti al millesimo. Lo stesso angolo <Tex tex={angleSym} /> in tutti e tre.
              </p>
            </section>
          )}

          <p className="legend">
            <span className="legend-item role-hyp">ipotenusa: il lato opposto all’angolo retto</span>
            <span className="legend-item">
              opposto e adiacente: rispetto all’angolo <Tex tex={angleSym} /> ({text(reference === 'alpha' ? goal.alpha : beta(goal), 1)}°)
            </span>
          </p>
        </aside>
      </div>
    </div>
  );
}

