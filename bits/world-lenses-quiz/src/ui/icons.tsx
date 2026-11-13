/** Line icons on a 16×16 grid, stroked with currentColor (sizes and strokes in styles.css). */

const PATHS = {
  back: 'M10 3 5 8l5 5',
  next: 'M2.5 8h11M9 3.5 13.5 8 9 12.5',
  plus: 'M8 3v10M3 8h10',
  check: 'M3 8.5 6.5 12 13 4.5',
  cross: 'M4 4l8 8M12 4l-8 8',
  up: 'M8 13V3M3.5 7.5 8 3l4.5 4.5',
  down: 'M8 3v10M3.5 8.5 8 13l4.5-4.5',
  shuffle: 'M1.5 4.5h3c3 0 4 7 7 7h3M12 9l2.5 2.5L12 14M1.5 11.5h3c1.3 0 2.2-1.2 3-2.6M9 6.5c.7-1.2 1.4-2 2.5-2h3M12 2l2.5 2.5L12 7',
  save: 'M3 2.5h8l2.5 2.5v8.5h-11zM5.5 2.5v3.5h4.5v-3.5M5 13.5V9.5h6v4',
  trash: 'M2.5 4.5h11M6 4.5V2.5h4v2M4 4.5l.7 9h6.6l.7-9',
  search: 'M7 12A5 5 0 1 0 7 2a5 5 0 0 0 0 10zM10.6 10.6 14 14',
  restart: 'M2.5 8a5.5 5.5 0 1 0 1.6-3.9M2.5 2.5v3.5H6',
  chevron: 'M4 6l4 4 4-4',
  download: 'M8 2v8.5M4.5 7 8 10.5 11.5 7M2.5 13.5h11',
  upload: 'M8 10.5V2M4.5 5.5 8 2l3.5 3.5M2.5 13.5h11',
  dice: 'M3 2.5h10a.5.5 0 0 1 .5.5v10a.5.5 0 0 1-.5.5H3a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5zM5.5 5.5h.01M10.5 5.5h.01M8 8h.01M5.5 10.5h.01M10.5 10.5h.01',
  route: 'M3.5 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM12.5 5.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM3.5 10.5V7a3 3 0 0 1 3-3H11',
  list: 'M5.5 4h8M5.5 8h8M5.5 12h8M2.5 4h.01M2.5 8h.01M2.5 12h.01',
  calendar: 'M2.5 3.5h11v10h-11zM2.5 6.5h11M5.5 2v3M10.5 2v3',
  book: 'M2.5 3c2-.8 4-.8 5.5.5 1.5-1.3 3.5-1.3 5.5-.5v10c-2-.8-4-.8-5.5.5-1.5-1.3-3.5-1.3-5.5-.5zM8 3.5v10',
  grip: 'M6 4h.01M10 4h.01M6 8h.01M10 8h.01M6 12h.01M10 12h.01',
  expand: 'M1.5 6V1.5H6M10 1.5h4.5V6M1.5 10v4.5H6M10 14.5h4.5V10',
  collapse: 'M6 1.5V6H1.5M10 1.5V6h4.5M6 14.5V10H1.5M10 14.5V10h4.5',
  link: 'M6.5 3.5h-3v9h9v-3M9 2.5h4.5V7M13.5 2.5 7.5 8.5',
  question: 'M2.5 3.5h11v7.5H7.5L4.5 13.5V11h-2zM6.3 5.8a1.7 1.7 0 1 1 2.4 1.6c-.5.2-.7.6-.7 1.1M8 9.6h.01',
  note: 'M3.5 2.5h6l3 3v8h-9zM9.5 2.5v3h3M5.5 8.5h5M5.5 11h3.5',
  info: 'M8 14.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM8 7.5v4M8 5h.01',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={className ? `icon ${className}` : 'icon'}>
      <path d={PATHS[name]} />
    </svg>
  );
}

/** Two overlapping lenses, a cool one and a warm one: the Bit's mark. */
export function LensMark({ className = 'lens-mark' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 24" aria-hidden="true" className={className}>
      <circle cx="14" cy="12" r="10" className="lens-cool" />
      <circle cx="26" cy="12" r="10" className="lens-warm" />
    </svg>
  );
}
