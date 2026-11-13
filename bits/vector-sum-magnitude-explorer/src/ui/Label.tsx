/** A TeX label laid over the SVG at a pixel centre chosen by labels.ts. */
import Tex from './Tex.tsx';

export default function Label({
  tex,
  x,
  y,
  className,
}: {
  tex: string;
  x: number;
  y: number;
  className?: string;
}) {
  return (
    <div
      className={className ? `label ${className}` : 'label'}
      style={{ transform: `translate(${x}px, ${y}px) translate(-50%, -50%)` }}
    >
      <Tex tex={tex} />
    </div>
  );
}
