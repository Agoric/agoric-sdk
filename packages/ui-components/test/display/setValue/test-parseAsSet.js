// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/zoe/tools/prepare-test-env-ava';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';
import { parseAsSet } from '../../../src/display/setValue/parseAsSet';

test('parseSet', t => {
  t.throws(() => parseAsSet(), { message: 'parseAsSet not yet implemented' });
});
