// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';

import { arrayToObj, objToArray } from '../../src/objArrayConversion';

test('arrayToObj', t => {
  try {
    const keywords = ['X', 'Y'];
    const array = [1, 2];
    t.deepEquals(arrayToObj(array, keywords), { X: 1, Y: 2 });

    const keywords2 = ['X', 'Y', 'Z'];
    t.throws(
      () => arrayToObj(array, keywords2),
      /Error: array and keywords must be of equal length/,
      `unequal length should throw`,
    );

    const array2 = [4, 5, 2];
    t.throws(
      () => arrayToObj(array2, keywords),
      /Error: array and keywords must be of equal length/,
      `unequal length should throw`,
    );
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('objToArray', t => {
  try {
    const keywords = ['X', 'Y'];
    const obj = { X: 1, Y: 2 };
    t.deepEquals(objToArray(obj, keywords), [1, 2]);

    const keywords2 = ['X', 'Y', 'Z'];
    t.throws(
      () => objToArray(obj, keywords2),
      /Error: Assertion failed: object keys and keywords must be of equal length/,
      `unequal length should throw`,
    );

    const obj2 = { X: 1, Y: 2, Z: 5 };
    t.throws(
      () => objToArray(obj2, keywords),
      /Error: Assertion failed: object keys and keywords must be of equal length/,
      `unequal length should throw`,
    );
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});
