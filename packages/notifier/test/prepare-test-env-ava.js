import rawTest from 'ava';
import { wrapTest } from '@endo/ses-ava';

export const test = wrapTest(rawTest);
