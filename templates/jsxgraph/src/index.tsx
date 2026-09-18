/**
 * __BIT_TITLE__
 *
 * JSXGraph inside React: the board is created once in an effect and freed on unmount;
 * React owns the surrounding controls, JSXGraph owns the geometry.
 * Conventions: docs/style/interactive.md.
 */
import JXG from 'jsxgraph';
import 'jsxgraph/distrib/jsxgraph.css';
import { useEffect, useId, useRef, useState } from 'react';
import './styles.css';

const BOUNDING_BOX: [number, number, number, number] = [-5, 5, 5, -5];

/** The construction. Everything the user can drag or read lives here. */
function build(board: JXG.Board) {
  const A = board.create('point', [-2, -1], { name: 'A', size: 4, color: '#1f5fbf' });
  const B = board.create('point', [2, 2], { name: 'B', size: 4, color: '#1f5fbf' });
  board.create('line', [A, B], { strokeColor: '#e0a100', strokeWidth: 2 });
  board.create('text', [-4.5, 4.3, () => `slope = ${((B.Y() - A.Y()) / (B.X() - A.X())).toFixed(2)}`], {
    fontSize: 16,
    fixed: true,
  });
}

export default function __BIT_CLASS__() {
  const containerId = useId().replace(/:/g, '');
  const boardRef = useRef<JXG.Board | null>(null);
  const [generation, setGeneration] = useState(0); // bump to rebuild the board (reset)

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
    });
    build(board);
    boardRef.current = board;
    return () => {
      JXG.JSXGraph.freeBoard(board);
      boardRef.current = null;
    };
  }, [containerId, generation]);

  return (
    <div className="__BIT_ID__">
      <div id={containerId} className="board jxgbox" />
      <div className="controls">
        <button type="button" onClick={() => setGeneration((g) => g + 1)}>
          Reset
        </button>
      </div>
    </div>
  );
}
