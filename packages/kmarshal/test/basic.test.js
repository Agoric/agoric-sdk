import test from 'ava';

import { kser, kunser, krefOf, kslot } from '../src/kmarshal.js';

test('sanity check', t => {
  const assertRoundTrip = (val, toComparable = v => v) => {
    const ser = kser(val);
    t.not(ser, val);
    const unser = kunser(ser);
    t.is(toComparable(unser), toComparable(val));
  };
  assertRoundTrip(undefined);
  assertRoundTrip(47);
  assertRoundTrip(-2n);
  assertRoundTrip('foo');

  const remotable = kslot('ko47');
  t.is(krefOf(remotable), 'ko47');
  assertRoundTrip(remotable, krefOf);
});
