/**
 * Site-level helpers: base-path-aware links, licence pointers and the (Italian) chrome strings.
 *
 * The site may be served from a path prefix (GitHub project Pages: /orbbits/) or from the
 * root of a custom domain; `base` comes from astro.config (ORBBITS_BASE). Bits never import
 * this module: they know nothing about routes.
 *
 * The chrome is Italian only for now; a multilingual site (/en/bits/<id>/ …) would add
 * per-language strings here and a locale-prefixed route, never a change to Bit ids.
 */
import { DEFAULT_CONTENT_LICENSE, type BitKind, type BitStatus } from './catalog';

/**
 * Where the sources live, resolved at build time by astro.config (ORBBITS_REPO, or the
 * repository GitHub Actions is building); undefined when unknown, and then the footer shows
 * the licence names without linking into the repository. Never guessed.
 */
export const repoUrl: string | undefined = import.meta.env.ORBBITS_REPO || undefined;

/** A file in the repository's default branch, or undefined when the repository is unknown. */
export function repoFile(path: string): string | undefined {
  return repoUrl ? `${repoUrl}/blob/HEAD/${path}` : undefined;
}

export const LICENSES = {
  software: { name: 'MIT', url: repoFile('LICENSE') ?? 'https://opensource.org/license/mit' },
  content: {
    name: DEFAULT_CONTENT_LICENSE,
    url: 'https://creativecommons.org/licenses/by-sa/4.0/deed.it',
    file: repoFile('CONTENT-LICENSE.md'),
  },
} as const;

const rawBase: string = import.meta.env.BASE_URL || '/';
/** Base path without trailing slash: '' for the root, '/orbbits' for project Pages. */
export const basePath: string = rawBase.replace(/\/+$/, '');

/** Root-relative URL under the site base: withBase('/bits/x/') → '/orbbits/bits/x/'. */
export function withBase(path: string): string {
  return basePath + (path.startsWith('/') ? path : `/${path}`);
}

/** Absolute URL when ORBBITS_SITE is configured (canonical links); undefined otherwise. */
export function absoluteUrl(path: string): string | undefined {
  const site = import.meta.env.SITE;
  return site ? new URL(withBase(path), site).toString() : undefined;
}

// Everything shown on screen is Italian, like the Bits themselves (AGENTS.md language policy).
export const SITE = {
  name: 'OrbBits',
  tagline:
    'Animazioni, interattivi, figure e schede riutilizzabili per le lezioni di matematica e fisica. ' +
    'Ogni Bit ha un indirizzo stabile da condividere in classe.',
  home: 'Tutti i Bit',
  drafts: 'Bozze (solo in locale)',
  filterAll: 'tutti',
  filterHint: 'Filtra per tag',
  related: 'Bit collegati',
  about: 'Scheda',
  downloads: 'File',
  openPdf: 'Apri il PDF',
  download: 'scarica',
  address: 'Indirizzo',
  created: 'Creato',
  tags: 'Tag',
  languages: 'Lingue',
  license: 'Licenza',
  licenseOriginal: 'contenuti originali',
  sources: 'Fonti',
  sourcesNote: 'i materiali di terzi mantengono la propria licenza',
  footerRepository: 'sorgenti',
  footerSoftware: 'software',
  footerContent: 'contenuti originali',
  footerUnlessNoted: 'salvo diversa indicazione',
  footerThirdParty: 'i materiali di terzi mantengono la propria licenza',
  loading: 'Caricamento…',
  noOutput: {
    video: 'Video non ancora renderizzato',
    figure: 'Figura non ancora generata',
    document: 'Documento non ancora compilato',
    interactive: '',
  } satisfies Record<BitKind, string>,
} as const;

export const KIND_LABEL: Record<BitKind, string> = {
  video: 'video',
  interactive: 'interattivo',
  figure: 'figura',
  document: 'documento',
};

export const STATUS_LABEL: Record<BitStatus, string> = {
  draft: 'bozza',
  usable: 'usabile',
  curated: 'curato',
};
