// We are testing normal lockdown behavior in this test
// Unlike in error-unsafe-fast.test.js
import '@endo/init/debug.js';

import { wrapTest } from '@endo/ses-ava';
import rawTest from 'ava';

import { cases } from './error-test-cases.js';

const test = wrapTest(rawTest);

for (const [title, impl] of Object.entries(cases)) {
  test(title, impl);
}
