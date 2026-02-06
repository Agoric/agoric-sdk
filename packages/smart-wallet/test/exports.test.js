import test from 'ava';

import * as index from '@agoric/smart-wallet';

test('index', t => {
  t.snapshot(Object.keys(index).sort());
});
