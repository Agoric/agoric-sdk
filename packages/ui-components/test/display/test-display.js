// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/swingset-vat/tools/prepare-test-env-ava';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava'; // TODO ses-ava doesn't yet have test.todo

import { parseAsValue } from '../../src/display/display';

test('parseAsValue', t => {
  t.is(parseAsValue('30'), 30n);
});

test.todo('parseAsAmount');
test.todo('stringifyValue');
test.todo('stringifyPurseValue');
test.todo('stringifyAmountValue');
