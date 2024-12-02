export default {
  // FIXME this isn't preventing the error: TypeError: Cannot redefine property: Symbol(async_id_symbol)
  // Neither does using @endo/init/legacy.js
  /*
    Uncaught exception in test/fast-usdc/noble-forwarding.test.ts
  TypeError: Cannot redefine property: Symbol(async_id_symbol)
  TypeError: Cannot redefine property: Symbol(async_id_symbol)
      at InertConstructor.defineProperty (<anonymous>)
      at setup (file:///home/runner/work/agoric-sdk/agoric-sdk/agoric-sdk/multichain-testing/node_modules/@endo/ses-ava/node_modules/@endo/init/src/node-async_hooks.js:216:10)
      at file:///home/runner/work/agoric-sdk/agoric-sdk/agoric-sdk/multichain-testing/node_modules/@endo/ses-ava/node_modules/@endo/init/src/node-async_hooks-patch.js:4:1
      at ModuleJob.run (node:internal/modules/esm/module_job:195:25)
      at async ModuleLoader.import (node:internal/modules/esm/loader:337:24)
      at async run (file:///home/runner/work/agoric-sdk/agoric-sdk/agoric-sdk/multichain-testing/node_modules/ava/lib/worker/base.js:244:3)
      at async file:///home/runner/work/agoric-sdk/agoric-sdk/agoric-sdk/multichain-testing/node_modules/ava/lib/worker/base.js:281:2
*/
  environmentVariables: {
    LOCKDOWN_OVERRIDE_TAMING: 'severe',
  },
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
