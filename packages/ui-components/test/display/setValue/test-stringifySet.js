// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/zoe/tools/prepare-test-env';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';
import { stringifySet } from '../../../src/display/setValue/stringifySet';

test('stringifySet', t => {
  t.throws(() => stringifySet(), {
    message: 'stringifySet not yet implemented',
  });
});
