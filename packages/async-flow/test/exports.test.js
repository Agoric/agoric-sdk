import test from 'ava';

import * as index from '@agoric/async-flow';

test('index', t => {
  t.snapshot(Object.keys(index).sort());
});
