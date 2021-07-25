// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { Far } from '../src/marshal.js';
import { passStyleOf } from '../src/passStyleOf.js';

test('Far functions', t => {
  t.notThrows(() => Far('MyHandle', a => a + 1), 'Far function');
  const farFunc = Far('MyHandle', a => a + 1);
  t.is(passStyleOf(farFunc), 'remotable');
});
