/**
 * Geometric view: unit circle with draggable point P
 *
 * Owned by JSXGraph; communicates angle back to React through board update events.
 */
import JXG from 'jsxgraph';
import { useEffect, useId, useRef, forwardRef, useImperativeHandle } from 'react';
import type { ForwardedRef } from 'react';

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

export interface GeometricBoardHandle {
  moveTo: (degrees: number) => void;
}

interface GeometricBoardProps {
  initialDeg: number;
  onAngleChange: (angle: number) => void;
  locale: string;
}

const GeometricBoard = forwardRef<GeometricBoardHandle, GeometricBoardProps>(
  ({ initialDeg, onAngleChange }, ref: ForwardedRef<GeometricBoardHandle>) => {
    const containerId = useId().replace(/:/g, '');
    const boardRef = useRef<JXG.Board | null>(null);
    const pointPRef = useRef<JXG.Glider | null>(null);

    // Expose moveTo method for parent control
    useImperativeHandle(ref, () => ({
      moveTo: (degrees: number) => {
        if (!boardRef.current || !pointPRef.current) return;
        const rad = toRad(degrees);
        pointPRef.current.moveTo([Math.cos(rad), Math.sin(rad)]);
        boardRef.current.update();
      },
    }), []);

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
      boardRef.current = board;

      // Build the construction
      const O = board.create('point', [0, 0], {
        name: 'O',
        fixed: true,
        size: 2,
        color: COLOR.muted,
        label: { offset: [-14, -12] },
      });
      const X = board.create('point', [1, 0], { visible: false, fixed: true });
      const circle = board.create('circle', [O, X], {
        strokeColor: COLOR.circle,
        strokeWidth: 2,
        fixed: true,
      });

      const P = board.create('glider', [Math.cos(toRad(initialDeg)), Math.sin(toRad(initialDeg)), circle], {
        name: 'P',
        size: 5,
        color: COLOR.point,
        label: { offset: [10, 10] },
      });
      pointPRef.current = P;

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

      board.create('text', [() => P.X() / 2, -0.08, 'x'], {
        anchorX: 'middle',
        anchorY: 'top',
        fontSize: 13,
        color: COLOR.cos,
        fixed: true,
      });
      board.create('text', [-0.08, () => P.Y() / 2, 'y'], {
        anchorX: 'right',
        anchorY: 'middle',
        fontSize: 13,
        color: COLOR.sin,
        fixed: true,
      });

      // Sync angle change back to React
      const sync = () => {
        const rad = Math.atan2(P.Y(), P.X());
        const deg = normalizeDeg(toDeg(rad));
        onAngleChange(deg);
      };
      board.on('update', sync);
      sync();

      return () => {
        JXG.JSXGraph.freeBoard(board);
        boardRef.current = null;
        pointPRef.current = null;
      };
    }, [containerId, initialDeg, onAngleChange]);

    return <div id={containerId} className="board jxgbox" />;
  }
);

GeometricBoard.displayName = 'GeometricBoard';

export default GeometricBoard;
