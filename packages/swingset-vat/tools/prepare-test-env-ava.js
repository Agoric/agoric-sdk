/**
 * Like prepare-test-env but also sets up ses-ava and provides
 * the ses-ava `test` function to be used as if it is the ava
 * `test` function.
 */

import '@endo/init/pre-bundle-source.js';

import './prepare-test-env.js';

// eslint thinks these are extraneous dependencies because this file
// is in the tools/ directory rather than the test/ directory.
// TODO How do we tell eslint that tools/ is dev-only? Either
// that, or should we just move tools/* into test/ ?
//
// eslint-disable-next-line import/no-extraneous-dependencies
import { wrapTest } from '@endo/ses-ava';
// eslint-disable-next-line import/no-extraneous-dependencies
import rawTest from 'ava';

/** @type {typeof rawTest} */
export const test = wrapTest(rawTest);
