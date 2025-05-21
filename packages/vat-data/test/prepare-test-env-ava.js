/**
 * Like prepare-test-env but also exports the AVA `test` function for
 * compatibility with earlier uses of @endo/ses-ava.
 */
import './prepare-test-env.js';

import test from 'ava';

export { test };
