/**
 * One vessel: a satin ceramic drum. The whole column is one button, so that the object itself is
 * the control and the target is large on a LIM.
 *
 * It is drawn in layers, back to front: the inside; the lid, a stack of discs in CSS 3D on a hinge
 * at the back of the rim; the object; the front wall. The object is therefore hidden behind the
 * wall until it rises, and it is in the DOM only once the vessel has started to open
 * (see game/view.ts). Opened, the lid stands behind the object as its backdrop.
 */
import { useEffect, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import type { Content, OptionView, Specimen as Label, Verdict } from '../game/view.ts';
import { optionLabel } from './copy.ts';
import { METEORITE_ART, STONE_ART } from './specimens.ts';

/** How long the old content stays while the lid closes over it, in step with the CSS. */
const CLOSING_MS = 340;

const ACTION: Record<string, string> = { stay: 'Confermo', switch: 'Cambio' };

const TAG: Record<Verdict, { name: string; note: string }> = {
  won: { name: 'Meteorite', note: 'la tua scelta' },
  lost: { name: 'Pietra terrestre', note: 'la tua scelta' },
  missed: { name: 'Il meteorite era qui', note: '' },
  other: { name: 'Pietra terrestre', note: '' },
};

function Slot({ view }: { view: OptionView }) {
  if (view.action === 'stay' || view.action === 'switch') {
    return <span className="slot-action">{ACTION[view.action]}</span>;
  }
  if (view.verdict) {
    const tag = TAG[view.verdict];
    return (
      <span className="tag" data-verdict={view.verdict}>
        <b>{tag.name}</b>
        {tag.note && <small>{tag.note}</small>}
      </span>
    );
  }
  if (view.open) {
    return (
      <span className="tag">
        <b>{view.specimen?.name}</b>
      </span>
    );
  }
  if (view.chosen) return <span className="slot-mark">La tua scelta</span>;
  return null;
}

/** The content leaves only after the lid has closed over it. */
function useKept(view: OptionView) {
  const [kept, setKept] = useState<{ content: Exclude<Content, null>; label: Label } | null>(null);
  useEffect(() => {
    if (view.content && view.specimen) {
      setKept({ content: view.content, label: view.specimen });
      return;
    }
    const timer = setTimeout(() => setKept(null), CLOSING_MS);
    return () => clearTimeout(timer);
  }, [view.content, view.specimen]);
  return view.content ?? kept?.content ?? null;
}

const DISCS = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9];

function Lid() {
  return (
    <span className="lid">
      <span className="lid-arm">
        <span className="lid-under" />
        <span className="glow" />
        {DISCS.map((i) => (
          <span key={i} className="lid-disc" data-seam={i === 0 || undefined} style={{ '--i': i } as CSSProperties} />
        ))}
        <span className="lid-cap" />
      </span>
    </span>
  );
}

function Held({ content, option, won }: { content: Exclude<Content, null>; option: number; won: boolean }) {
  const art = content === 'meteorite' ? METEORITE_ART : STONE_ART[option];
  return (
    <span className="held">
      <img className="specimen-art" src={art} alt="" draggable={false} />
      {won && <span className="sheen" style={{ '--art': `url(${art})` } as CSSProperties} />}
    </span>
  );
}

/** The shapes every vessel shares, defined once. */
export function VesselDefs() {
  return (
    <svg className="vessel-defs" width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="tp-glaze" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#5e5b55" />
          <stop offset="0.09" stopColor="#aba69a" />
          <stop offset="0.32" stopColor="#f1ebde" />
          <stop offset="0.52" stopColor="#dfd8c9" />
          <stop offset="0.86" stopColor="#9b968b" />
          <stop offset="1" stopColor="#514f4a" />
        </linearGradient>
        <linearGradient id="tp-falloff" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.1" />
          <stop offset="0.6" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#0a1024" stopOpacity="0.34" />
        </linearGradient>
        <linearGradient id="tp-clay" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#3f3730" />
          <stop offset="0.3" stopColor="#a28d78" />
          <stop offset="0.55" stopColor="#8e7a67" />
          <stop offset="1" stopColor="#332d28" />
        </linearGradient>
        <linearGradient id="tp-hollow" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#8d8a88" />
          <stop offset="0.55" stopColor="#3a3a44" />
          <stop offset="1" stopColor="#14151d" />
        </linearGradient>
        <filter id="tp-speckle" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="1.15" numOctaves="1" seed="5" />
          <feColorMatrix values="0 0 0 0 0.3  0 0 0 0 0.25  0 0 0 0 0.2  0 0 0 6 -4.3" />
        </filter>
        <clipPath id="tp-wall-shape">
          <path d="M0 34a100 34 0 0 0 200 0v110a100 34 0 0 1-200 0Z" />
        </clipPath>
      </defs>
    </svg>
  );
}

interface Props {
  view: OptionView;
  onPress: () => void;
}

export default function Vessel({ view, onPress }: Props) {
  const content = useKept(view);
  const onKeyDown = (event: KeyboardEvent) => {
    // Holding a key down must not play the game.
    if (event.repeat) event.preventDefault();
  };

  return (
    <button
      type="button"
      className="vessel"
      data-index={view.option}
      data-open={view.open || undefined}
      data-chosen={view.chosen || undefined}
      data-action={view.action ?? undefined}
      data-content={view.content ?? undefined}
      data-verdict={view.verdict ?? undefined}
      aria-disabled={!view.action}
      aria-label={optionLabel(view)}
      onClick={onPress}
      onKeyDown={onKeyDown}
    >
      <span className="scene">
        <span className="ring" />
        <span className="ground" />
        <svg className="inside" viewBox="0 0 200 180" aria-hidden="true">
          <ellipse cx="100" cy="34" rx="100" ry="34" fill="url(#tp-hollow)" />
          <ellipse cx="100" cy="34" rx="97.5" ry="32" fill="none" stroke="#e9e3d5" strokeWidth="4" />
        </svg>
        <Lid />
        {content && <Held content={content} option={view.option} won={view.verdict === 'won'} />}
        <svg className="wall" viewBox="0 0 200 180" aria-hidden="true">
          <path d="M0 34a100 34 0 0 0 200 0v110a100 34 0 0 1-200 0Z" fill="url(#tp-glaze)" />
          <g clipPath="url(#tp-wall-shape)">
            <rect width="200" height="180" filter="url(#tp-speckle)" />
            <rect width="200" height="180" fill="url(#tp-falloff)" />
            <path d="M0 129a100 34 0 0 0 200 0v15a100 34 0 0 1-200 0Z" fill="url(#tp-clay)" />
          </g>
          <path d="M0 34a100 34 0 0 0 200 0" fill="none" stroke="#fffaf0" strokeOpacity="0.5" strokeWidth="1" />
          <text className="numeral" x="100" y="122">
            {view.label}
          </text>
        </svg>
      </span>
      <span className="slot">
        <Slot view={view} />
      </span>
    </button>
  );
}
