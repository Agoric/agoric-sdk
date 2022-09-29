import resolve from '@rollup/plugin-node-resolve';

export default [
  {
    input: 'test/perf-patterns.js',
    output: {
      file: `dist/bundle-perf-patterns.mjs`,
      format: 'es',
      name: 'perfPatterns',
    },
    plugins: [resolve()],
  },
];
