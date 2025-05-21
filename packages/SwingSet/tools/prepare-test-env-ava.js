/**
 * Like prepare-test-env but also exports the AVA `test` function
 * for compatibility with earlier uses of @endo/ses-ava.
 */

import '@endo/init/pre-bundle-source.js';

import '@agoric/swingset-liveslots/tools/prepare-test-env.js';

import test from 'ava';

export { test };

// Does not import from a module because we're testing the global env
/* global globalThis */
export const VatData = globalThis.VatData;
assert(VatData);
