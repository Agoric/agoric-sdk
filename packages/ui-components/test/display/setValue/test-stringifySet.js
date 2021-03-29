// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava';

import { stringifySet } from '../../../src/display/setValue/stringifySet';

test('stringifySet', t => {
  t.throws(() => stringifySet(), {
    message: 'stringifySet not yet implemented',
  });
});
