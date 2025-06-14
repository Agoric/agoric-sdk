/* eslint-disable import/no-extraneous-dependencies -- requiring the package itself to check exports map */
import test from 'ava';

import * as index from '@agoric/pola-io';

const { isFrozen } = Object;

test('index', t => {
  t.snapshot(Object.keys(index).sort());
});

test('all exports are frozen', t => {
  const exports = Object.values(index);
  for (const exportedValue of exports) {
    t.true(
      isFrozen(exportedValue),
      `Export should be frozen: ${exportedValue.name || exportedValue}`,
    );
  }
});
