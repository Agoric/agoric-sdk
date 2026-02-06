import test from 'ava';

import * as index from '@agoric/inter-protocol';

test('index', t => {
  t.snapshot(Object.keys(index).sort());
});
