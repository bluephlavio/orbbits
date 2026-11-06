/**
 * Runs simulations a slice per animation frame, so that the two bundles of trajectories can be
 * seen growing and the interface stays responsive. With reduced motion a run completes at once.
 * The state lives outside the Analysis panel: closing the panel neither loses nor interrupts a run.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { advanceRun, createRun } from '../game/lab.ts';
import type { LabConfig, LabRun } from '../game/lab.ts';
import { createRandom } from '../game/rules.ts';

const FRAMES = 70;
const MAX_RUNS = 12;

export function useLab() {
  const [runs, setRuns] = useState<LabRun[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [runningId, setRunningId] = useState<number | null>(null);
  const [, repaint] = useState(0);
  const nextId = useRef(1);
  const frame = useRef(0);
  const busy = useRef(false);
  const random = useRef(createRandom());

  const finish = useCallback(() => {
    busy.current = false;
    setRunningId(null);
  }, []);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const start = useCallback((config: LabConfig, reducedMotion: boolean) => {
    if (busy.current) return;
    const run = createRun(nextId.current++, config);
    setRuns((previous) => [...previous, run].slice(-MAX_RUNS));
    setSelectedId(run.id);

    if (reducedMotion) {
      advanceRun(run, config.games, random.current);
      repaint((v) => v + 1);
      return;
    }

    busy.current = true;
    setRunningId(run.id);
    const slice = Math.max(1, Math.ceil(config.games / FRAMES));
    // Redrawing every trajectory costs more than simulating it: crowded runs repaint less often.
    const repaintEvery = Math.ceil(config.series / 30);
    let frames = 0;
    const step = () => {
      const done = advanceRun(run, slice, random.current);
      frames += 1;
      if (done || frames % repaintEvery === 0) repaint((v) => v + 1);
      if (done) finish();
      else frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
  }, [finish]);

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
