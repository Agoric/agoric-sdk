// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { parseAsValue } from '../../src/display/display.js';

test('parseAsValue', t => {
  t.is(parseAsValue('30'), 30n);
});

test.todo('parseAsAmount');
test.todo('stringifyValue');
test.todo('stringifyPurseValue');
test.todo('stringifyAmountValue');
