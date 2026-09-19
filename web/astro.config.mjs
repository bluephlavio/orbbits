// OrbBits web runtime and public site.
//
// Local runtime:  just web / just dev <id>      (astro dev --root web; every Bit, drafts included)
// Public site:    just site                     (astro build; usable/curated Bits only)
// Export:         just export <id>              (one Bit, relative URLs, into bits/<id>/dist/web/)
//
// The runtime is a shell: the content lives in bits/<id>/src and dist/, discovered from
// bits/*/bit.yml at build time (web/src/lib/catalog.ts). The same mount (BitHost) will be
// reused by Orbits later.
//
// Deployment target is configured from the environment so nothing here depends on GitHub
// Pages: ORBBITS_SITE (origin, e.g. https://user.github.io) and ORBBITS_BASE (path prefix,
// e.g. /orbbits/). Bit routes are always /bits/<id>/ below the base.
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import yaml from '@rollup/plugin-yaml';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const exportBit = process.env.ORBBITS_EXPORT_BIT ?? '';
const outDir = process.env.ORBBITS_OUT_DIR ?? './dist';
const site = process.env.ORBBITS_SITE || undefined;
const base = exportBit ? '/' : process.env.ORBBITS_BASE || '/';

/**
 * Where the sources live, for the site's footer and licence links: ORBBITS_REPO when set
 * (the justfile derives it from the git remote), otherwise what GitHub Actions knows about
 * the repository it is building; an empty string when nothing is known (the links are
 * simply omitted). Nothing is guessed.
 */
const repoUrl =
  process.env.ORBBITS_REPO ||
  (process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}`
    : '');

/**
 * Ids of the Bits whose status publishes them (usable | curated). A cheap look at bit.yml is
 * enough here: web/src/lib/catalog.ts applies the real rule on the parsed manifests, and
 * `orbbits check` validates the field.
 */
function publishedBitIds() {
  const dir = `${repoRoot}bits`;
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(`${dir}/${d.name}/bit.yml`))
    .filter((d) =>
      /^status:\s*["']?(usable|curated)\b/m.test(readFileSync(`${dir}/${d.name}/bit.yml`, 'utf8')),
    )
    .map((d) => d.name)
    .sort();
}

/**
 * Narrow the `bits/*` globs in web/src/lib (manifests, outputs, lazy components) to a set of
 * Bit ids, so nothing else is bundled: the exported Bit in export mode, the published Bits in
 * a production build (a draft's code and styles must not ship with the public site). The dev
 * server keeps every Bit.
 */
function scopeGlobs() {
  let ids = null;
  return {
    name: 'orbbits-scope-globs',
    enforce: 'pre',
    configResolved(config) {
      if (exportBit) ids = [exportBit];
      else if (config.command === 'build') ids = publishedBitIds();
    },
    transform(code, file) {
      if (!ids || !file.includes('/web/src/lib/')) return;
      const segment = ids.length === 1 ? ids[0] : ids.length ? `{${ids.join(',')}}` : '.none';
      return { code: code.replaceAll('/bits/*/', `/bits/${segment}/`), map: null };
    },
  };
}

export default defineConfig({
  integrations: [react()],
  site,
  base,
  outDir,
  trailingSlash: 'ignore',
  build: exportBit ? { assetsPrefix: '.' } : {},
  vite: {
    plugins: [yaml(), scopeGlobs()],
    define: {
      'import.meta.env.ORBBITS_EXPORT_BIT': JSON.stringify(exportBit),
      'import.meta.env.ORBBITS_REPO': JSON.stringify(repoUrl),
    },
    // Export mode: URLs inside JS/CSS are relative to the chunk itself (Astro's assetsPrefix
    // only knows how to prefix links from the HTML page).
    experimental: exportBit
      ? {
          renderBuiltUrl(filename, { hostType }) {
            return hostType === 'html' ? `./${filename}` : { relative: true };
          },
        }
      : {},
    // Bits live outside the Astro root (web/), so allow serving the whole repository.
    server: { fs: { allow: [repoRoot] } },
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        // jsxgraph's package "exports" hides distrib/, but Bits want its stylesheet.
        'jsxgraph/distrib/jsxgraph.css': `${repoRoot}node_modules/jsxgraph/distrib/jsxgraph.css`,
      },
    },
  },
});
