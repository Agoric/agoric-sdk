export default {
  extensions: {
    ts: 'module',
  },
  // Each test imports `@endo/ses-ava/prepare-endo.js` which does its own @endo/init
  // require: ['@endo/init/debug.js'],
  nodeArguments: ['--import=@aglocal/strict-ts-loader'],
  files: ['test/**/*.test.*'],
  concurrency: 1,
  serial: true,
  timeout: '125s',
  failFast: true,
  environmentVariables: {
    LOCKDOWN_HARDEN_TAMING: 'unsafe',
  },
};
