/**
 * Like prepare-strict-test-env but also sets up ses-ava and provides
 * the ses-ava `test` function to be used as if it is the ava
 * `test` function.
 */

import '@agoric/swingset-liveslots/tools/prepare-strict-test-env.js';

import { wrapTest } from '@endo/ses-ava';
import rawTest from 'ava';

export * from '@agoric/swingset-liveslots/tools/prepare-strict-test-env.js';

export const test = wrapTest(rawTest);

// Does not import from a module because we're testing the global env
/* global globalThis */
export const VatData = globalThis.VatData;
assert(VatData);
