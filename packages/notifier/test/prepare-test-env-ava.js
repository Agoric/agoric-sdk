import '@endo/init';

import { wrapTest } from '@endo/ses-ava';
import rawTest from 'ava';

// eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
// @ts-ignore -- https://github.com/endojs/endo/issues/1235
export const test = wrapTest(rawTest);
