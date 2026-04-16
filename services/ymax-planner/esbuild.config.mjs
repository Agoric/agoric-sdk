// ESM esbuild config to bundle the service into a single file
import { build } from 'esbuild';

await build({
  entryPoints: ['src/entrypoint.ts'],
  outfile: 'dist/entrypoint.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: ['node20'],
  sourcemap: true,
  legalComments: 'none',
  banner: {
    js: `#!/usr/bin/env node

    // XXX for require(''node:crypto'), https://github.com/evanw/esbuild/issues/1944#issuecomment-1491472647
import { fileURLToPath } from 'url';
import { createRequire as topLevelCreateRequire } from 'module';
import path from 'node:path';
const require = topLevelCreateRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

`,
  },
  // Avoid bundling optional native deps and OS-specific modules
  external: ['bufferutil', 'utf-8-validate', 'fsevents'],
  logLevel: 'info',
});

console.log('Built single-file ESM bundle at dist/entrypoint.js');
