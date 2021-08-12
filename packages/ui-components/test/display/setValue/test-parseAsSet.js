// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { parseAsSet } from '../../../src/display/setValue/parseAsSet.js';

test('parseSet', t => {
  t.throws(() => parseAsSet(), { message: 'parseAsSet not yet implemented' });
});
