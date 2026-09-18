/**
 * Unit circle explorer
 *
 * Drag P around the unit circle (or use the slider) and read the angle, cos θ and sin θ.
 * JSXGraph owns the geometry; React owns the controls and the readout.
 * Conventions: docs/style/interactive.md.
 */
import JXG from 'jsxgraph';
import 'jsxgraph/distrib/jsxgraph.css';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import './styles.css';

const INITIAL_DEG = 40;
const BOUNDING_BOX: [number, number, number, number] = [-1.5, 1.5, 1.5, -1.5];

const COLOR = {
  circle: '#1f5fbf',
  point: '#e0a100',
  cos: '#d1495b',
  sin: '#2a9d8f',
  muted: '#7a7a7a',
};

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;
const normalizeDeg = (deg: number) => ((deg % 360) + 360) % 360;

interface Construction {
  board: JXG.Board;
  P: JXG.Glider;
}

/** The whole construction. Everything draggable or readable is created here. */
function build(board: JXG.Board, initialDeg: number): Construction {
  const O = board.create('point', [0, 0], { name: 'O', fixed: true, size: 2, color: COLOR.muted, label: { offset: [-14, -12] } });
  const X = board.create('point', [1, 0], { visible: false, fixed: true });
  const circle = board.create('circle', [O, X], { strokeColor: COLOR.circle, strokeWidth: 2, fixed: true });

  const P = board.create('glider', [Math.cos(toRad(initialDeg)), Math.sin(toRad(initialDeg)), circle], {
    name: 'P',
    size: 5,
    color: COLOR.point,
    label: { offset: [10, 10] },
  });

  const Px = board.create('point', [() => P.X(), 0], { visible: false });
  const Py = board.create('point', [0, () => P.Y()], { visible: false });

  board.create('segment', [O, P], { strokeColor: COLOR.point, strokeWidth: 2, fixed: true });
  board.create('segment', [P, Px], { strokeColor: COLOR.muted, dash: 2, strokeWidth: 1, fixed: true });
  board.create('segment', [P, Py], { strokeColor: COLOR.muted, dash: 2, strokeWidth: 1, fixed: true });
  board.create('segment', [O, Px], { strokeColor: COLOR.cos, strokeWidth: 4, fixed: true });
  board.create('segment', [O, Py], { strokeColor: COLOR.sin, strokeWidth: 4, fixed: true });

  board.create('angle', [X, O, P], {
    radius: 0.28,
    name: 'θ',
    fillColor: COLOR.point,
    fillOpacity: 0.2,
    strokeColor: COLOR.point,
    label: { fontSize: 14 },
  });

  board.create('text', [() => P.X() / 2, -0.08, 'cos θ'], {
    anchorX: 'middle',
    anchorY: 'top',
    fontSize: 13,
    color: COLOR.cos,
    fixed: true,
  });
  board.create('text', [-0.08, () => P.Y() / 2, 'sin θ'], {
    anchorX: 'right',
    anchorY: 'middle',
    fontSize: 13,
    color: COLOR.sin,
    fixed: true,
  });

  return { board, P };
}

export default function UnitCircleExplorer() {
  const containerId = useId().replace(/:/g, '');
  const ref = useRef<Construction | null>(null);
  const [deg, setDeg] = useState(INITIAL_DEG);

  useEffect(() => {
    const board = JXG.JSXGraph.initBoard(containerId, {
      boundingbox: BOUNDING_BOX,
      axis: true,
      keepaspectratio: true,
      showCopyright: false,
      showNavigation: false,
      pan: { enabled: false },
      zoom: { wheel: false, pinchHorizontal: false, pinchVertical: false },
      resize: { enabled: true, throttle: 100 },
      defaultAxes: {
        x: { ticks: { insertTicks: false, ticksDistance: 0.5, minorTicks: 1, label: { fontSize: 11 } } },
        y: { ticks: { insertTicks: false, ticksDistance: 0.5, minorTicks: 1, label: { fontSize: 11 } } },
      },
    });
    const construction = build(board, INITIAL_DEG);
    ref.current = construction;

    // Keep the React readout in sync with the geometry whenever P moves.
    const { P } = construction;
    const sync = () => setDeg(normalizeDeg(toDeg(Math.atan2(P.Y(), P.X()))));
    board.on('update', sync);
    sync();

    return () => {
      JXG.JSXGraph.freeBoard(board);
      ref.current = null;
    };
  }, [containerId]);

  const moveTo = useCallback((degrees: number) => {
    const c = ref.current;
    if (!c) return;
    const r = toRad(degrees);
    c.P.moveTo([Math.cos(r), Math.sin(r)]);
    c.board.update();
  }, []);

  const rad = toRad(deg);
  return (
    <div className="unit-circle-explorer">
      <div id={containerId} className="board jxgbox" />
      <div className="controls">
        <label>
          θ
          <input
            type="range"
            min="0"
            max="360"
            step="1"
            value={Math.round(deg)}
            onChange={(e) => moveTo(Number(e.target.value))}
            aria-label="angle in degrees"
          />
          <output>{deg.toFixed(0)}°</output>
        </label>
        <button type="button" onClick={() => moveTo(INITIAL_DEG)}>
          Reset
        </button>
      </div>
      <dl className="readout">
        <div>
          <dt>θ</dt>
          <dd>{deg.toFixed(1)}° = {(rad / Math.PI).toFixed(3)}π rad</dd>
        </div>
        <div>
          <dt style={{ color: COLOR.cos }}>cos θ</dt>
          <dd>{Math.cos(rad).toFixed(3)}</dd>
        </div>
        <div>
          <dt style={{ color: COLOR.sin }}>sin θ</dt>
          <dd>{Math.sin(rad).toFixed(3)}</dd>
        </div>
      </dl>
    </div>
  );
}
