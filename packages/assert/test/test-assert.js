import '@endo/init';
// eslint-disable-next-line import/no-unresolved -- lint error not worth solving; test passes
import test from 'ava';

import { NonNullish, Fail } from '../src/assert.js';

test('NonNullish', t => {
  assert.equal(NonNullish('defined'), 'defined');
  t.throws(() => NonNullish(null), {
    message: 'unexpected null',
  });
  t.throws(() => NonNullish(undefined), {
    message: 'unexpected "[undefined]"',
  });
});

test('Fail', t => {
  t.notThrows(() => true || Fail`Should not be thrown`);
  t.throws(() => false || Fail`Should be thrown`, {
    message: 'Should be thrown',
  });
});
