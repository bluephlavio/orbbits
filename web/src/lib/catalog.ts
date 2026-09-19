/**
 * Bit catalog for the web runtime and the public site.
 *
 * Every bits/<id>/bit.yml is the source of truth. Discovery happens at build time via
 * import.meta.glob; nothing here needs a generated index or a registry.
 *
 * Publication is derived from `status` (see docs/publishing.md): usable and curated Bits are
 * public, drafts exist only in the local runtime (`astro dev`) and in single-Bit exports.
 * The Python side (`orbbits list --published`, `orbbits check`) applies the same rule.
 *
 * Language is metadata (docs/localization.md): `default_locale` is what the canonical page
 * /bits/<id>/ renders, `locales` every language the Bit is realised in. Localised outputs
 * carry a `locale`; the others belong to every language.
 */

export type BitKind = 'video' | 'interactive' | 'figure' | 'document';
export type BitStatus = 'draft' | 'usable' | 'curated';

export interface BitOutput {
  format: string;
  file: string;
  description?: string;
  /** Set when the file exists in one language only; absent = locale-independent. */
  locale?: string;
}

export interface BitProvenance {
  source: string;
  author?: string;
  url?: string;
  license?: string;
  modifications?: string;
  retrieved?: string;
  notes?: string;
}

export interface BitManifest {
  id: string;
  title: string;
  kind: BitKind;
  role: string;
  engine: string;
  status: BitStatus;
  description?: string;
  default_locale?: string;
  locales?: string[];
  /** Legacy spelling of default_locale; `orbbits check` asks to rename it. */
  language?: string;
  created?: string;
  /** Licence of the Bit's original content when it differs from the repository default. */
  license?: string;
  outputs?: BitOutput[];
  provenance?: BitProvenance[];
  subjects?: string[];
  topics?: string[];
  levels?: string[];
  tags?: string[];
}

/** Same defaults as src/orbbits/manifest.py. */
export const DEFAULT_LOCALE = 'it';
export const DEFAULT_CONTENT_LICENSE = 'CC BY-SA 4.0';

const manifests = import.meta.glob<BitManifest>('../../../bits/*/bit.yml', {
  eager: true,
  import: 'default',
});

/**
 * Classroom-ready outputs under bits/<id>/dist/, exposed as URLs (copied into the site build):
 * dist/<file> and one level of subdirectory for localised outputs (dist/en/<file>); the
 * standalone export dist/web/ is never part of the site.
 */
const outputs = import.meta.glob<string>(
  ['../../../bits/*/dist/{*,*/*}.{svg,png,webp,jpg,jpeg,gif,mp4,webm,pdf}', '!**/dist/web/**'],
  { eager: true, import: 'default', query: '?url' },
);

export const exportBitId: string = import.meta.env.ORBBITS_EXPORT_BIT || '';

/** The YAML plugin turns `created: 2026-09-18` (and `retrieved:`) into Dates; keep ISO day strings. */
function isoDay(value: unknown): string | undefined {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value === undefined || value === null ? undefined : String(value);
}

function normalize(m: BitManifest): BitManifest {
  return {
    ...m,
    created: isoDay(m.created),
    provenance: m.provenance?.map((p) => ({ ...p, retrieved: isoDay(p.retrieved) })),
  };
}

/** Every Bit in the repository, drafts included. */
export const bits: BitManifest[] = Object.values(manifests)
  .map(normalize)
  .sort((a, b) => a.id.localeCompare(b.id));

/** Whether a Bit belongs to the public site. Maturity doubles as publication state. */
export function isPublished(bit: BitManifest): boolean {
  return bit.status === 'usable' || bit.status === 'curated';
}

export const publishedBits: BitManifest[] = bits.filter(isPublished);

/**
 * Bits that get a page in the current build: the public set in a production build, every
 * Bit in the local dev server, and the exported Bit (whatever its status) in export mode.
 */
export const visibleBits: BitManifest[] =
  exportBitId || import.meta.env.DEV ? bits : publishedBits;

export function getBit(id: string): BitManifest | undefined {
  return bits.find((b) => b.id === id);
}

/** Canonical route of a Bit: depends on the id only, never on kind/engine/technology. */
export function bitPath(id: string): string {
  return `/bits/${id}/`;
}

/** Language of the canonical realisation (title, description, the page at /bits/<id>/). */
export function bitLocale(bit: BitManifest): string {
  return bit.default_locale ?? bit.language ?? DEFAULT_LOCALE;
}

/** Every language the Bit is realised in, the default first. */
export function bitLocales(bit: BitManifest): string[] {
  const main = bitLocale(bit);
  return [main, ...(bit.locales ?? []).filter((l) => l !== main)];
}

/** Licence of the Bit's original content (third-party material: see `provenance`). */
export function contentLicense(bit: BitManifest): string {
  return bit.license ?? DEFAULT_CONTENT_LICENSE;
}

/** URL of a declared output (`file` is relative to the Bit directory, e.g. dist/figure.svg). */
export function outputUrl(id: string, file: string): string | undefined {
  return outputs[`../../../bits/${id}/${file}`];
}

/** Outputs that belong to a language: its own plus the locale-independent ones. */
export function outputsFor(bit: BitManifest, locale: string): BitOutput[] {
  return (bit.outputs ?? []).filter((o) => !o.locale || o.locale === locale);
}

export function firstOutput(list: BitOutput[], ...formats: string[]): BitOutput | undefined {
  for (const format of formats) {
    const found = list.find((o) => o.format === format);
    if (found) return found;
  }
  return undefined;
}

/** Tags used by the given Bits with their frequency, most used first. */
export function tagCounts(list: BitManifest[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const bit of list) for (const tag of bit.tags ?? []) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/** Other visible Bits sharing at least one tag, most shared tags first. */
export function relatedBits(bit: BitManifest, pool: BitManifest[] = visibleBits): BitManifest[] {
  const mine = new Set(bit.tags ?? []);
  if (mine.size === 0) return [];
  return pool
    .filter((other) => other.id !== bit.id)
    .map((other) => ({ other, shared: (other.tags ?? []).filter((t) => mine.has(t)).length }))
    .filter(({ shared }) => shared > 0)
    .sort((a, b) => b.shared - a.shared || a.other.title.localeCompare(b.other.title))
    .map(({ other }) => other);
}
