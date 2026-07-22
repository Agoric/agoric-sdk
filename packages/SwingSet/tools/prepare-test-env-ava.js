/**
 * Like prepare-test-env but also sets up ses-ava and provides
 * the ses-ava `test` function to be used as if it is the ava
 * `test` function.
 */

import '@endo/init/pre-bundle-source.js';

import '@agoric/swingset-liveslots/tools/prepare-test-env.js';

import { wrapTest } from '@endo/ses-ava';
import rawTest from 'ava';

// XXX @endo/ses-ava's `wrapTest` is typed `<T>(avaTest: T) => T`, but its
// `OnlyFn` type-parameter constraint makes TS resolve the result to `any`,
// which silently untypes `t` (and `t.context`) in every consumer. Annotate
// to recover ava's `TestFn` typing.
/** @type {import('ava').TestFn} */
export const test = wrapTest(rawTest);

// Does not import from a module because we're testing the global env
/* global globalThis */
assert(globalThis.VatData, 'VatData is present on globalThis');
