/**
 * Runs simulations a slice per animation frame, so that distributions can be seen filling and the
 * interface stays responsive. With reduced motion a run completes at once. The state lives outside
 * the Analysis panel: closing the panel neither loses nor interrupts a run.
 *
 * Every run has its seed: running the same configuration with the same seed gives the same
 * results, which is what `repeat` offers.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { advanceRun, createRun } from '../game/lab.ts';
import type { LabConfig, LabRun } from '../game/lab.ts';

const FRAMES = 60;
const MAX_RUNS = 12;
/** Spins to simulate per frame, roughly, whatever the configuration. */
const SPINS_PER_FRAME = 120_000;

export function useLab() {
  const [runs, setRuns] = useState<LabRun[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [runningId, setRunningId] = useState<number | null>(null);
  const [, repaint] = useState(0);
  const nextId = useRef(1);
  const frame = useRef(0);
  const busy = useRef(false);

  const finish = useCallback(() => {
    busy.current = false;
    setRunningId(null);
  }, []);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const start = useCallback(
    (config: LabConfig, reducedMotion: boolean) => {
      if (busy.current) return;
      const run = createRun(nextId.current++, config);
      setRuns((previous) => [...previous, run].slice(-MAX_RUNS));
      setSelectedId(run.id);

      if (reducedMotion) {
        advanceRun(run, config.players);
        repaint((v) => v + 1);
        return;
      }

      busy.current = true;
      setRunningId(run.id);
      // Enough frames to watch it fill, never so few players per frame that a long run drags,
      // never so many spins per frame that the page stutters.
      const bySpins = Math.max(1, Math.floor(SPINS_PER_FRAME / (2 * config.maxSpins)));
      const slice = Math.max(1, Math.min(Math.ceil(config.players / FRAMES), Math.max(bySpins, Math.ceil(config.players / 400))));
      const step = () => {
        const done = advanceRun(run, slice);
        repaint((v) => v + 1);
        if (done) finish();
        else frame.current = requestAnimationFrame(step);
      };
      frame.current = requestAnimationFrame(step);
    },
    [finish],
  );

  const clear = useCallback(() => {
    cancelAnimationFrame(frame.current);
    finish();
    setRuns([]);
    setSelectedId(null);
  }, [finish]);

  const selected = runs.find((run) => run.id === selectedId) ?? runs.at(-1) ?? null;

  return { runs, selected, running: runningId !== null, select: setSelectedId, start, clear };
}

export type Lab = ReturnType<typeof useLab>;
