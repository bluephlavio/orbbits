/**
 * Unit circle explorer: multiple representations of one mathematical state
 *
 * The learner explores a unit circle, observing how angle α simultaneously determines:
 * - coordinates (xP, yP) of point P;
 * - function values cos α and sin α;
 * - points on the graphs of sin and cos.
 *
 * All views are kept in sync through a single authoritative source: the angle α.
 *
 * JSXGraph owns the geometry; React owns the state, controls, and other representations.
 * Conventions: docs/style/interactive.md.
 *
 * Localised: every string the learner reads comes from locales/<tag>.yml.
 * The runtime passes the language to render as `locale` (docs/localization.md).
 */
import 'jsxgraph/distrib/jsxgraph.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import en from '../locales/en.yml';
import it from '../locales/it.yml';
import './styles.css';

import GeometricBoard from './components/GeometricBoard';
import ObservationTable from './components/ObservationTable';
import FunctionGraphs from './components/FunctionGraphs';
import ControlPanel from './components/ControlPanel';

interface Messages {
  angle_slider: string;
  reset: string;
  cos: string;
  sin: string;
  rad: string;
  angle: string;
  point_P: string;
  coordinates: string;
  alpha: string;
  reference_values: string;
  functions: string;
}

const MESSAGES: Record<string, Messages> = { it: it as Messages, en: en as Messages };
const DEFAULT_LOCALE = 'it';

const INITIAL_DEG = 40;

const toRad = (deg: number) => (deg * Math.PI) / 180;
const normalizeDeg = (deg: number) => ((deg % 360) + 360) % 360;

export default function UnitCircleExplorer({ locale = DEFAULT_LOCALE }: { locale?: string }) {
  const t = MESSAGES[locale] ?? MESSAGES[DEFAULT_LOCALE];
  const [angleDeg, setAngleDeg] = useState(INITIAL_DEG);
  const geometricBoardRef = useRef<any>(null);

  const angleRad = toRad(angleDeg);
  const cosVal = Math.cos(angleRad);
  const sinVal = Math.sin(angleRad);

  const handleAngleChange = useCallback((angle: number) => {
    const normalized = normalizeDeg(angle);
    setAngleDeg(normalized);
    if (geometricBoardRef.current) {
      geometricBoardRef.current.moveTo(normalized);
    }
  }, []);

  const handleReset = useCallback(() => {
    handleAngleChange(INITIAL_DEG);
  }, [handleAngleChange]);

  const handleTableAngleClick = useCallback(
    (angle: number) => {
      handleAngleChange(angle);
    },
    [handleAngleChange]
  );

  return (
    <div className="unit-circle-explorer">
      {/* Top: Circle + Symbolic */}
      <div className="workspace">
        {/* Left: Geometric view */}
        <div className="column column-geometry">
          <GeometricBoard
            ref={geometricBoardRef}
            initialDeg={INITIAL_DEG}
            onAngleChange={setAngleDeg}
            locale={locale}
          />
        </div>

        {/* Right: Value table */}
        <div className="column column-center">
          <ObservationTable
            currentAngle={angleDeg}
            onAngleClick={handleTableAngleClick}
            t={t}
          />
        </div>
      </div>

      {/* Bottom: Function graphs */}
      <div className="graphs-section">
        <div className="column column-graphs">
          <FunctionGraphs
            currentAngle={angleDeg}
            currentSin={sinVal}
            currentCos={cosVal}
            t={t}
          />
        </div>
      </div>

      {/* Controls */}
      <ControlPanel
        angle={angleDeg}
        onAngleChange={handleAngleChange}
        onReset={handleReset}
        t={t}
      />
    </div>
  );
}
