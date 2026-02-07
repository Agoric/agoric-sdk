import test from 'ava';

import * as index from '@agoric/orchestration';

test('index', t => {
  t.snapshot(Object.keys(index).sort());
});
