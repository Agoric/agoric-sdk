export default {
  extensions: {
    ts: 'module',
  },
  // Each test imports `@endo/ses-ava/prepare-endo.js` which does its own @endo/init
  // require: ['@endo/init/debug.js'],
  nodeArguments: ['--import=ts-blank-space/register'],
  files: ['test/**/*.test.ts', '!test/fast-usdc/**/*.test.ts'],
  concurrency: 1,
  serial: true,
  timeout: '125s',
  failFast: true,
};
