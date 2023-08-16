import { wrapTest } from '@endo/ses-ava';
import rawTest from 'ava';

export const test = wrapTest(rawTest);
