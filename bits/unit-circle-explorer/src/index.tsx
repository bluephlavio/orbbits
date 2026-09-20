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
import SymbolicBox from './components/SymbolicBox';
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
  record: string;
  alpha: string;
}

const MESSAGES: Record<string, Messages> = { it: it as Messages, en: en as Messages };
const DEFAULT_LOCALE = 'it';

const INITIAL_DEG = 40;
const NOTABLE_ANGLES = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330];
const MAX_OBSERVATIONS = 10;

const toRad = (deg: number) => (deg * Math.PI) / 180;
const normalizeDeg = (deg: number) => ((deg % 360) + 360) % 360;

function isNotableAngle(deg: number, tolerance = 2): boolean {
  return NOTABLE_ANGLES.some((angle) => Math.abs(normalizeDeg(deg - angle)) <= tolerance);
}

interface Observation {
  angle: number;
  xP: number;
  yP: number;
  isNotable: boolean;
}

export default function UnitCircleExplorer({ locale = DEFAULT_LOCALE }: { locale?: string }) {
  const t = MESSAGES[locale] ?? MESSAGES[DEFAULT_LOCALE];
  const [angleDeg, setAngleDeg] = useState(INITIAL_DEG);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [graphPoints, setGraphPoints] = useState<{ sin: [number, number][]; cos: [number, number][] }>({
    sin: [],
    cos: [],
  });
  const [lastGraphAngle, setLastGraphAngle] = useState(INITIAL_DEG);
  const geometricBoardRef = useRef<any>(null);

  const angleRad = toRad(angleDeg);
  const cosVal = Math.cos(angleRad);
  const sinVal = Math.sin(angleRad);

  // Initialize observations with the initial angle
  useEffect(() => {
    const initialObs: Observation = {
      angle: INITIAL_DEG,
      xP: Math.cos(toRad(INITIAL_DEG)),
      yP: Math.sin(toRad(INITIAL_DEG)),
      isNotable: isNotableAngle(INITIAL_DEG),
    };
    setObservations([initialObs]);
    setGraphPoints({
      sin: [[INITIAL_DEG, Math.sin(toRad(INITIAL_DEG))]],
      cos: [[INITIAL_DEG, Math.cos(toRad(INITIAL_DEG))]],
    });
    setLastGraphAngle(INITIAL_DEG);
  }, []);

  // Record an observation: add to table if notable angle or explicitly recorded
  const recordObservation = useCallback(
    (angle: number) => {
      const xP = Math.cos(toRad(angle));
      const yP = Math.sin(toRad(angle));
      const notable = isNotableAngle(angle);
      const obs: Observation = { angle, xP, yP, isNotable: notable };

      setObservations((prev) => {
        // Don't add if already present
        const exists = prev.some((o) => Math.abs(o.angle - angle) < 1);
        if (exists) return prev;

        const updated = [obs, ...prev].slice(0, MAX_OBSERVATIONS);
        return updated;
      });
    },
    []
  );

  // Update graph points if angle has moved significantly
  const updateGraphPoints = useCallback((angle: number) => {
    setGraphPoints((prev) => {
      // Add point if it's at least 5° away from the last recorded point
      if (Math.abs(angle - lastGraphAngle) >= 5) {
        const rad = toRad(angle);
        const newSinPoints = [...prev.sin, [angle, Math.sin(rad)] as [number, number]];
        const newCosPoints = [...prev.cos, [angle, Math.cos(rad)] as [number, number]];
        setLastGraphAngle(angle);
        return { sin: newSinPoints, cos: newCosPoints };
      }
      return prev;
    });
  }, [lastGraphAngle]);

  // When angle changes, update graphs and check for notable angles
  useEffect(() => {
    updateGraphPoints(angleDeg);

    // Record notable angles automatically
    if (isNotableAngle(angleDeg)) {
      recordObservation(angleDeg);
    }
  }, [angleDeg, updateGraphPoints, recordObservation]);

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

  const handleObservationClick = useCallback(
    (observation: Observation) => {
      handleAngleChange(observation.angle);
    },
    [handleAngleChange]
  );

  return (
    <div className="unit-circle-explorer">
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

        {/* Center: Symbolic and observational views */}
        <div className="column column-center">
          <SymbolicBox angle={angleDeg} xP={cosVal} yP={sinVal} t={t} />
          <ObservationTable
            observations={observations}
            currentAngle={angleDeg}
            onObservationClick={handleObservationClick}
            onRecordObservation={recordObservation}
            t={t}
          />
        </div>

        {/* Right: Function graphs */}
        <div className="column column-graphs">
          <FunctionGraphs
            sinPoints={graphPoints.sin}
            cosPoints={graphPoints.cos}
            currentAngle={angleDeg}
            currentSin={sinVal}
            currentCos={cosVal}
            t={t}
          />
        </div>
      </div>

      {/* Controls below */}
      <ControlPanel
        angle={angleDeg}
        onAngleChange={handleAngleChange}
        onReset={handleReset}
        t={t}
      />
    </div>
  );
}
