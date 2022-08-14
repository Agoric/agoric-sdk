// @ts-check

import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import { makeCopyBag } from '../src/keys/checkKey.js';

import '../src/types.js';

test('duplicate keys', t => {
  t.throws(
    () =>
      makeCopyBag([
        ['a', 1n],
        ['a', 1n],
      ]),
    { message: 'value has duplicate keys: "a"' },
  );
});
