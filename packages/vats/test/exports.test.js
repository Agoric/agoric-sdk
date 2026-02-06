import test from 'ava';

import * as index from '@agoric/vats';

test('index', t => {
  t.snapshot(Object.keys(index).sort());
});
