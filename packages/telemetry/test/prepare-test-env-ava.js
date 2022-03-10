// @ts-check
import '@endo/init';

import { wrapTest } from '@endo/ses-ava';
import rawTest from 'ava';

/** @type {typeof rawTest} */
export const test = wrapTest(rawTest);
