const { RuleTester } = require('eslint');
const rule = require('../../src/rules/group-jsdoc-imports.js');

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('group-jsdoc-imports', rule, {
  valid: [
    {
      code: `
/** @type {FollowerOptions} */
const options = {};
      `,
      options: [{ paths: ['@agoric/'] }],
    },
    {
      code: `
/**
 * @import {FollowerOptions} from '@agoric/casting';
 */
/** @type {FollowerOptions} */
const options = {};
      `,
      options: [{ paths: ['@agoric/'] }],
    },
  ],
  invalid: [
    {
      code: `/** @import {VBankAssetDetail} from '@agoric/vats/tools/board-utils.js'; */
/** @type {import('@agoric/casting').FollowerOptions} */
const options = {};`,
      options: [{ paths: ['@agoric/'] }],
      output: `/** @import {VBankAssetDetail} from '@agoric/vats/tools/board-utils.js';
 * @import {FollowerOptions} from '@agoric/casting';
 */
/** @type {FollowerOptions} */
const options = {};`,
      errors: [
        { message: 'Move inline type import to top-level JSDoc import block' },
      ],
    },
    {
      code: `/**
 * @import {Something} from '@agoric/other';
 */
/** @type {import('@agoric/casting').FollowerOptions} */
const options = {};`,
      options: [{ paths: ['@agoric/'] }],
      output: `/**
 * @import {Something} from '@agoric/other';
 * @import {FollowerOptions} from '@agoric/casting';
 */
/** @type {FollowerOptions} */
const options = {};`,
      errors: [
        { message: 'Move inline type import to top-level JSDoc import block' },
      ],
    },
    {
      code: `
/**
 * @param {import('@agoric/swingset-liveslots').MapStore<string, any>} [backingStore]
 */`,
      options: [{ paths: ['@agoric/'] }],
      output: `
/**
 * @import {MapStore} from '@agoric/swingset-liveslots';
 */
/**
 * @param {MapStore<string, any>} [backingStore]
 */`,
      errors: [
        { message: 'Move inline type import to top-level JSDoc import block' },
      ],
    },
    {
      // Ensure @import block lands after the last module import
      // and after the first blank newline separating imports from runnable code.
      // Also handle multiple package prefixes.
      code: `#!/usr/bin/env node
// @ts-check
import '@endo/init';

/**
 * @param {typeof import('fs/promises').readFile} io.readFile
 */`,
      options: [{ paths: ['@agoric/', 'fs/'] }],
      output: `#!/usr/bin/env node
// @ts-check
import '@endo/init';

/**
 * @import {readFile} from 'fs/promises';
 */

/**
 * @param {typeof readFile} io.readFile
 */`,
      errors: [
        { message: 'Move inline type import to top-level JSDoc import block' },
      ],
    },
    {
      // Handle insertion when there are no runtime imports.
      code: `// @ts-check

/** @param {string} label */
const kind = 'hi';

/**
 * @type {import('./types.js').KeyMakers}
 */
`,
      options: [{ paths: ['@agoric/', 'fs/'] }],
      output: `// @ts-check

/**
 * @import {KeyMakers} from './types.js';
 */

/** @param {string} label */
const kind = 'hi';

/**
 * @type {KeyMakers}
 */
`,
      errors: [
        { message: 'Move inline type import to top-level JSDoc import block' },
      ],
    },
    {
      // Handle blocks containing both @import and @typedef with import
      code: `
/**
 * @import {SnapStoreInternal} from './snapStore.js';
 *
 * @typedef {{
 *    dirPath: string | null,
 *    kvStore: import('./kvStore.js').KVStore,
 * }} SwingStoreInternal
 */`,
      options: [{ paths: ['@agoric/', 'fs/'] }],
      output: `
/**
 * @import {KVStore} from './kvStore.js';
 */

/**
 * @import {SnapStoreInternal} from './snapStore.js';
 *
 * @typedef {{
 *    dirPath: string | null,
 *    kvStore: KVStore,
 * }} SwingStoreInternal
 */`,
      errors: [
        { message: 'Move inline type import to top-level JSDoc import block' },
      ],
    },
  ],
});
