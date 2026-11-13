/**
 * TeX typeset by KaTeX. Rendering is synchronous and cached by source, so formulas can follow a
 * drag frame by frame. Only \htmlClass is trusted: it carries the colour classes and the masks
 * defined in format.ts and styled in styles.css.
 */
import katex from 'katex';
import 'katex/dist/katex.min.css';

const cache = new Map<string, string>();

export function texToHtml(source: string, display = false): string {
  const key = `${display ? 'D' : 'I'}${source}`;
  let html = cache.get(key);
  if (html === undefined) {
    html = katex.renderToString(source, {
      displayMode: display,
      throwOnError: false,
      strict: 'ignore',
      trust: (context) => context.command === '\\htmlClass',
    });
    if (cache.size > 800) cache.clear();
    cache.set(key, html);
  }
  return html;
}

export default function Tex({
  tex,
  display = false,
  className,
}: {
  tex: string;
  display?: boolean;
  className?: string;
}) {
  return (
    <span
      className={className ? `tex ${className}` : 'tex'}
      dangerouslySetInnerHTML={{ __html: texToHtml(tex, display) }}
    />
  );
}
