const { RuleTester } = require('eslint');
const rule = require('../../src/rules/no-typedef-import.js');

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('no-typedef-import', rule, {
  valid: [
    {
      code: `/**
 * @import {BundleCap} from './types.js';
 */`,
    },
    {
      code: `/** Just a doc block without typedef imports */`,
    },
    {
      // Not just an import; it's qualifying the type.
      code: `/**
 * @typedef { import('@endo/marshal').CapData<string> } SwingSetCapData
 */`,
    },
  ],
  invalid: [
    {
      code: `/** @typedef { import('./types.js').BundleCap } BundleCap */`,
      output: `/** @import {BundleCap} from './types.js'; */`,
      errors: [{ messageId: 'noTypedefImport' }],
    },
    {
      code: `/**
 * @typedef { import('./kvStore.js').KVStore } KVStore
 * @typedef { import('./kvStore.js').SnapshotResult } SnapshotResult
 */`,
      output: `/**
 * @import {KVStore} from './kvStore.js';
 * @import {SnapshotResult} from './kvStore.js';
 */`,
      errors: [{ messageId: 'noTypedefImport' }],
    },
    {
      code: `/**
 * @typedef { import('./smart-wallet-kit.js').SmartWalletKit } WalletUtils
 */`,
      output: `/**
 * @import {SmartWalletKit} from './smart-wallet-kit.js';
 */`,
      errors: [{ messageId: 'noTypedefImport' }],
    },
  ],
});
