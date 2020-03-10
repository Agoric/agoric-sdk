// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';

import { arrayToObj, objToArray } from '../../src/roleConversion';

test('arrayToObj', t => {
  try {
    const roleNames = ['X', 'Y'];
    const array = [1, 2];
    t.deepEquals(arrayToObj(array, roleNames), { X: 1, Y: 2 });

    const roleNames2 = ['X', 'Y', 'Z'];
    t.throws(
      () => arrayToObj(array, roleNames2),
      /Error: array and roleNames must be of equal length/,
      `unequal length should throw`,
    );

    const array2 = [4, 5, 2];
    t.throws(
      () => arrayToObj(array2, roleNames),
      /Error: array and roleNames must be of equal length/,
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
    const roleNames = ['X', 'Y'];
    const obj = { X: 1, Y: 2 };
    t.deepEquals(objToArray(obj, roleNames), [1, 2]);

    const roleNames2 = ['X', 'Y', 'Z'];
    t.throws(
      () => objToArray(obj, roleNames2),
      /Error: Assertion failed: object keys and roleNames must be of equal length/,
      `unequal length should throw`,
    );

    const obj2 = { X: 1, Y: 2, Z: 5 };
    t.throws(
      () => objToArray(obj2, roleNames),
      /Error: Assertion failed: object keys and roleNames must be of equal length/,
      `unequal length should throw`,
    );
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});
