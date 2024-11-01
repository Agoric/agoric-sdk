export default {
  extensions: {
    ts: 'module',
  },
  require: ['@endo/init/debug.js'],
  nodeArguments: ['--import=tsimp/import'],
  files: ['test/**/*.test.ts', '!test/fast-usdc/**/*.test.ts'],
  concurrency: 1,
  serial: true,
  timeout: '125s',
};
