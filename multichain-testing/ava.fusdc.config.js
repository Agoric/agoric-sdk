export default {
  extensions: {
    ts: 'module',
  },
  require: ['@endo/init/debug.js'],
  nodeArguments: ['--import=ts-blank-space/register'],
  files: ['test/fast-usdc/**/*.test.ts'],
  concurrency: 1,
  serial: true,
  timeout: '125s',
};
