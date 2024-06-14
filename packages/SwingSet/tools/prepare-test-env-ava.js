/**
 * Like prepare-test-env but also sets up ses-ava and provides
 * the ses-ava `test` function to be used as if it is the ava
 * `test` function.
 */

import '@endo/init/pre-bundle-source.js';

import '@agoric/swingset-liveslots/tools/prepare-test-env.js';

import { wrapTest } from '@endo/ses-ava';
import rawTest from 'ava';

export const test = wrapTest(rawTest);

// Does not import from a module because we're testing the global env
/* global globalThis */
export const VatData = globalThis.VatData;
assert(VatData);
