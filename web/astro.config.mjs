// OrbBits web runtime.
//
// Run from the repository root:  pnpm dev  (= astro dev --root web)
// The runtime is a shell: the actual content lives in bits/<id>/src and is mounted
// by <BitHost id="..."/>. The same mount will be reused by Orbits later.
//
// Export mode (used by `orbbits export <id>`): ORBBITS_EXPORT_BIT=<id> renders that single
// Bit at the site root with relative asset links, into ORBBITS_OUT_DIR.
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import yaml from '@rollup/plugin-yaml';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const exportBit = process.env.ORBBITS_EXPORT_BIT ?? '';
const outDir = process.env.ORBBITS_OUT_DIR ?? './dist';

/**
 * In export mode, narrow the `bits/*` globs in web/src/lib to the exported Bit, so only
 * its sources, styles and outputs end up in the standalone bundle.
 */
function scopeGlobsToBit(bitId) {
  return {
    name: 'orbbits-export-scope',
    enforce: 'pre',
    transform(code, file) {
      if (!bitId || !file.includes('/web/src/lib/')) return;
      return { code: code.replaceAll('/bits/*/', `/bits/${bitId}/`), map: null };
    },
  };
}

export default defineConfig({
  integrations: [react()],
  outDir,
  trailingSlash: 'ignore',
  build: exportBit ? { assetsPrefix: '.' } : {},
  vite: {
    plugins: [yaml(), scopeGlobsToBit(exportBit)],
    define: {
      'import.meta.env.ORBBITS_EXPORT_BIT': JSON.stringify(exportBit),
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
