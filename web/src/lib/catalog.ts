/**
 * Bit catalog for the web runtime.
 *
 * Every bits/<id>/bit.yml is the source of truth. Discovery happens at build time via
 * import.meta.glob; nothing here needs a generated index.
 */

export interface BitOutput {
  format: string;
  file: string;
  description?: string;
}

export interface BitManifest {
  id: string;
  title: string;
  kind: 'video' | 'interactive' | 'figure' | 'document';
  role: string;
  engine: string;
  status: 'draft' | 'usable' | 'curated';
  description?: string;
  language?: string;
  outputs?: BitOutput[];
  subjects?: string[];
  topics?: string[];
  levels?: string[];
  tags?: string[];
}

const manifests = import.meta.glob<BitManifest>('../../../bits/*/bit.yml', {
  eager: true,
  import: 'default',
});

/** Classroom-ready outputs under bits/<id>/dist/, exposed as URLs (copied into the site build). */
const outputs = import.meta.glob<string>(
  '../../../bits/*/dist/*.{svg,png,webp,jpg,jpeg,gif,mp4,webm,pdf}',
  { eager: true, import: 'default', query: '?url' },
);

export const exportBitId: string = import.meta.env.ORBBITS_EXPORT_BIT || '';

export const bits: BitManifest[] = Object.values(manifests).sort((a, b) =>
  a.id.localeCompare(b.id),
);

export function getBit(id: string): BitManifest | undefined {
  return bits.find((b) => b.id === id);
}

/** URL of a declared output (`file` is relative to the Bit directory, e.g. dist/figure.svg). */
export function outputUrl(id: string, file: string): string | undefined {
  return outputs[`../../../bits/${id}/${file}`];
}

export function firstOutput(bit: BitManifest, ...formats: string[]): BitOutput | undefined {
  for (const format of formats) {
    const found = bit.outputs?.find((o) => o.format === format);
    if (found) return found;
  }
  return undefined;
}
