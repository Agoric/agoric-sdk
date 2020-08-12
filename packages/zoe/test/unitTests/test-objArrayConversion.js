// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/install-ses';
import test from 'ava';

import { arrayToObj, objToArray } from '../../src/objArrayConversion';

test('arrayToObj', t => {
  t.plan(3);
  try {
    const keywords = ['X', 'Y'];
    const array = [1, 2];
    t.deepEqual(arrayToObj(array, keywords), { X: 1, Y: 2 });

    const keywords2 = ['X', 'Y', 'Z'];
    t.throws(
      () => arrayToObj(array, keywords2),
      { message: /Error: array and keys must be of equal length/ },
      `unequal length should throw`,
    );

    const array2 = [4, 5, 2];
    t.throws(
      () => arrayToObj(array2, keywords),
      { message: /Error: array and keys must be of equal length/ },
      `unequal length should throw`,
    );
  } catch (e) {
    t.assert(false, e);
  }
});

test('objToArray', t => {
  t.plan(3);
  try {
    const keywords = ['X', 'Y'];
    const obj = { X: 1, Y: 2 };
    t.deepEqual(objToArray(obj, keywords), [1, 2]);

    const keywords2 = ['X', 'Y', 'Z'];
    t.throws(
      () => objToArray(obj, keywords2),
      { message: /Error: object keys \["X","Y"\] and keywords \["X","Y","Z"\] must be of equal length/ },
      `unequal length should throw`,
    );

    const obj2 = { X: 1, Y: 2, Z: 5 };
    t.throws(
      () => objToArray(obj2, keywords),
      { message: /Error: object keys \["X","Y","Z"\] and keywords \["X","Y"\] must be of equal length/ },
      `unequal length should throw`,
    );
  } catch (e) {
    t.assert(false, e);
  }
});
