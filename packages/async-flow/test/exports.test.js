import * as index from '@agoric/async-flow';
import test from 'ava';

test('index', t => {
  t.snapshot(Object.keys(index).sort());
});
