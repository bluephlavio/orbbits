/** Line icons on a 16-unit grid, drawn with currentColor. */
const PATHS = {
  eye: 'M1.5 8s2.4-4.5 6.5-4.5S14.5 8 14.5 8s-2.4 4.5-6.5 4.5S1.5 8 1.5 8zM8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  'eye-off':
    'M2 2l12 12M6.6 3.7A6.6 6.6 0 0 1 8 3.5c4.1 0 6.5 4.5 6.5 4.5a11 11 0 0 1-1.9 2.4M10.1 12.1A6 6 0 0 1 8 12.5C3.9 12.5 1.5 8 1.5 8a11.3 11.3 0 0 1 2.6-3',
  reset: 'M2.5 3v3.5H6M2.9 6.3A5.5 5.5 0 1 1 2.5 9',
  expand: 'M1.5 6V1.5H6M10 1.5h4.5V6M1.5 10v4.5H6M10 14.5h4.5V10',
  shrink: 'M6 1.5V6H1.5M10 1.5V6h4.5M6 14.5V10H1.5M10 14.5V10h4.5',
  plus: 'M8 3v10M3 8h10',
  minus: 'M3 8h10',
  target: 'M8 1.5v3M8 11.5v3M1.5 8h3M11.5 8h3M8 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  swap: 'M2 5h10l-2.5-2.5M14 11H4l2.5 2.5',
  chevron: 'M6 3.5 10.5 8 6 12.5',
  para: 'M1.5 12.5 4.5 3.5h10l-3 9z',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name }: { name: IconName }) {
  return (
    <svg className="icon" viewBox="0 0 16 16" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}
