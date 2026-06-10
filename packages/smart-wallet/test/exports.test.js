/* eslint-disable import/no-extraneous-dependencies -- requiring the package itself to check exports map */
import * as index from '@agoric/smart-wallet';
import test from 'ava';

test('index', t => {
  t.snapshot(Object.keys(index).sort());
});
