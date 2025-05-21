/**
 * Like prepare-strict-test-env but also exports the AVA `test` function
 * for compatibility with earlier uses of @endo/ses-ava.
 */

import '@agoric/swingset-liveslots/tools/prepare-strict-test-env.js';

import test from 'ava';

export * from '@agoric/swingset-liveslots/tools/prepare-strict-test-env.js';

export { test };

// Does not import from a module because we're testing the global env
/* global globalThis */
export const VatData = globalThis.VatData;
assert(VatData);
