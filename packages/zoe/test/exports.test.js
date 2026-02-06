import test from 'ava';

import * as index from '@agoric/zoe';

test('index', t => {
  t.snapshot(Object.keys(index).sort());
});
