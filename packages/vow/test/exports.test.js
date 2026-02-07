import test from 'ava';

import * as index from '@agoric/vow';

test('index', t => {
  t.snapshot(Object.keys(index).sort());
});
