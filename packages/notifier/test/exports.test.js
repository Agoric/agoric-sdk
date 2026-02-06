import test from 'ava';

import * as index from '@agoric/notifier';

test('index', t => {
  t.snapshot(Object.keys(index).sort());
});
