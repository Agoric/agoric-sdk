import process from 'process';

// Import rollup plugins
import html from '@web/rollup-plugin-html';
import { copy } from '@web/rollup-plugin-copy';
import resolve from '@rollup/plugin-node-resolve';
import multiInput from 'rollup-plugin-multi-input';
import { terser } from 'rollup-plugin-terser';
import minifyHTML from 'rollup-plugin-minify-html-literals';
import summary from 'rollup-plugin-summary';

export default {
  input: ['public/**/*-worker.js'],
  plugins: [
    multiInput({ relative: 'public/' }),
    // Entry point for application build; can specify a glob to build multiple
    // HTML files for non-SPA app
    html({
      input: '**/*.html',
      rootDir: 'public',
      flattenOutput: false,
      extractAssets: false,
    }),
    // Resolve bare module specifiers to relative paths
    resolve({
      jail: `${process.cwd()}/../../`,
      // dedupe: true,
    }),
    // Minify HTML template literals
    minifyHTML(),
    // Minify JS
    terser({
      ecma: 2020,
      module: true,
      warnings: true,
    }),
    // Print bundle summary
    summary(),
    // Optional: copy any static assets to build directory
    copy({
      patterns: ['**/*.{svg,json,png}', '_headers'],
      rootDir: 'public',
    }),
  ],
  output: {
    dir: 'build',
  },
  preserveEntrySignatures: 'strict',
};
