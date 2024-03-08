import '@endo/init/debug.js';

import rawTest from 'ava';
import { wrapTest } from '@endo/ses-ava';

/** @type {typeof rawTest} */
export const test = wrapTest(rawTest);
