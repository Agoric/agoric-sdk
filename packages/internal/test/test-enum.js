// @ts-check
import test from 'ava';
import '@endo/init';

import { makeKeyEnum } from '../src/enum.js';

test('invalid keys', t => {
  const e = makeKeyEnum({ High: null, Low: null });
  t.is(e.High, 'High');
  t.is(e.Low, 'Low');

  // @ts-expect-error not a valid key, but it will resolve anyway
  t.is(e.Medium, 'Medium');
});
