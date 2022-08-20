import '@endo/init';
// eslint-disable-next-line import/no-unresolved -- lint error not worth solving; test passes
import test from 'ava';

import { NonNullish } from '../src/assert.js';

test('NonNullish', t => {
  assert.equal(NonNullish('defined'), 'defined');
  t.throws(() => NonNullish(null), {
    message: 'unexpected null',
  });
  t.throws(() => NonNullish(undefined), {
    message: 'unexpected "[undefined]"',
  });
});
