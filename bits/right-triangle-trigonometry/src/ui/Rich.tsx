/** Text with $TeX$ pieces, for the short remarks under the formulas. */
import Tex from './Tex.tsx';

export default function Rich({ source }: { source: string }) {
  return (
    <>
      {source.split('$').map((part, i) => (i % 2 === 1 ? <Tex key={i} tex={part} /> : part))}
    </>
  );
}
