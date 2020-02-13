// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';
import natListMathHelpers from '../../../src/mathHelpers/natListMathHelpers';

test('natListMathHelpers', t => {
  try {
    const {
      doAssertKind,
      doGetIdentity,
      doIsIdentity,
      doIsGTE,
      doIsEqual,
      doAdd,
      doSubtract,
    } = natListMathHelpers;
    t.doesNotThrow(
      () => doAssertKind(harden([4])),
      undefined,
      `[4] is a valid Nat list`,
    );
    t.throws(
      () => doAssertKind(4),
      /list must be an array/,
      `4 is not a valid Nat list`,
    );
    t.throws(
      () => doAssertKind(harden(['abc'])),
      /RangeError: not a safe integer/,
      `[abc] is not a valid Nat list`,
    );
    t.throws(
      () => doAssertKind(-1),
      /list must be an array/,
      `-1 is not a valid Nat list`,
    );
    t.deepEquals(doGetIdentity(), harden([]), `identity is []`);
    t.ok(doIsIdentity(harden([])), `doIsIdentity([]) is true`);
    t.notOk(doIsIdentity(6), `doIsIdentity(6) is false`);
    t.notOk(doIsIdentity(harden(['abc'])), `doIsIdentity(['abc']) is false`);
    t.notOk(doIsIdentity(harden([8])), `doIsIdentity([8]) is false`);
    t.ok(doIsGTE(harden([5, 3]), harden([3])), `[5, 3] is gte to [3]`);
    t.ok(doIsGTE(harden([3]), harden([3])), `[3] is gte to [3]`);
    t.notOk(doIsGTE(harden([3]), harden([4])), `[3] is not gte to [4]`);
    t.ok(doIsEqual(harden([4, 3]), harden([3, 4])), `[4, 3] equals [3, 4]`);
    t.notOk(doIsEqual(harden([4]), harden([5])), `[4] does not equal [5]`);
    t.deepEquals(
      doAdd(harden([4]), harden([5])),
      harden([4, 5]),
      `[4]+ [5] = [4, 5]`,
    );
    t.deepEquals(
      doSubtract(harden([6, 1]), harden([1])),
      harden([6]),
      `[6, 1] - [1] = [6]`,
    );
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});
