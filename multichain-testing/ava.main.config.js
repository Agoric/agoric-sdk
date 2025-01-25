const skippedFailingTests = [
  /**
   * send-anywhere › before hook
   * Rejected promise returned by test. Reason:
   *
   * Error {
   *   message: 'failed to ibc transfer funds to cosmoshub',
   * }
   *
   * Error: failed to ibc transfer funds to cosmoshub
   *     at file:///.../multichain-testing/tools/ibc-transfer.ts:181:13
   *     at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
   *     at async Object.fundFaucet (file:///.../multichain-testing/tools/faucet-tools.ts:35:9)
   *     at async file:///.../multichain-testing/test/send-anywhere.test.ts:31:3
   */
  '!test/send-anywhere.test.ts',
];
console.warn(`Skipping failing test modules:`, ...skippedFailingTests);

export default {
  extensions: {
    ts: 'module',
  },
  // Each test imports `@endo/ses-ava/prepare-endo.js` which does its own @endo/init
  // require: ['@endo/init/debug.js'],
  nodeArguments: ['--import=ts-blank-space/register'],
  files: [
    'test/**/*.test.ts',
    '!test/fast-usdc/**/*.test.ts',
    ...skippedFailingTests,
  ],
  concurrency: 1,
  serial: true,
  timeout: '125s',
  failFast: false,
};
