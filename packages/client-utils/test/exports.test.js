// @ts-check

import test from 'ava';

import * as index from '@agoric/client-utils';

test('index', t => {
  t.snapshot(Object.keys(index).sort());
});
