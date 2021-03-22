// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/zoe/tools/prepare-test-env';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';
import { parseAsValue } from '../../src/display/display';

test('parseAsValue', t => {
  t.is(parseAsValue('30'), 30n);
});

test.todo('parseAsAmount');
test.todo('stringifyValue');
test.todo('stringifyPurseValue');
test.todo('stringifyAmountValue');
