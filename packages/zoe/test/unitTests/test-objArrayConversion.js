// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/install-ses';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'tape-promise/tape';

import { arrayToObj } from '../../src/objArrayConversion';

test('arrayToObj', t => {
  t.plan(3);
  try {
    const keywords = ['X', 'Y'];
    const array = [1, 2];
    t.deepEquals(arrayToObj(array, keywords), { X: 1, Y: 2 });

    const keywords2 = ['X', 'Y', 'Z'];
    t.throws(
      () => arrayToObj(array, keywords2),
      /Error: array and keys must be of equal length/,
      `unequal length should throw`,
    );

    const array2 = [4, 5, 2];
    t.throws(
      () => arrayToObj(array2, keywords),
      /Error: array and keys must be of equal length/,
      `unequal length should throw`,
    );
  } catch (e) {
    t.assert(false, e);
  }
});
