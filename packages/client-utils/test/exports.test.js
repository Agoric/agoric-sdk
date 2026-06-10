// @ts-check

import * as index from '@agoric/client-utils';
import test from 'ava';

test('index', t => {
  t.snapshot(Object.keys(index).sort());
});
