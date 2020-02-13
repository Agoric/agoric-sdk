// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';

import natMathHelpers from '../../../src/mathHelpers/natMathHelpers';

test('natMathHelpers', t => {
  try {
    const {
      doAssertKind,
      doGetIdentity,
      doIsIdentity,
      doIsGTE,
      doIsEqual,
      doAdd,
      doSubtract,
    } = natMathHelpers;
    t.ok(doAssertKind(4), `[4] is a valid Nat list`);
    t.throws(
      () => doAssertKind('abc'),
      /RangeError: not a safe integer/,
      `abc is not a valid Nat`,
    );
    t.throws(
      () => doAssertKind(-1),
      /RangeError: negative/,
      `-1 is not a valid Nat`,
    );
    t.equals(doGetIdentity(), 0, `identity is 0`);
    t.ok(doIsIdentity(0), `doIsIdentity(0) is true`);
    t.notOk(doIsIdentity(6), `doIsIdentity(6) is false`);
    t.notOk(doIsIdentity('abc'), `doIsIdentity('abc') is false`);
    t.ok(doIsGTE(5, 3), `5 >= 3`);
    t.ok(doIsGTE(3, 3), `3 >= 3`);
    t.notOk(doIsGTE(3, 4), `3 < 4`);
    t.ok(doIsEqual(4, 4), `4 equals 4`);
    t.notOk(doIsEqual(4, 5), `4 does not equal 5`);
    t.equals(doAdd(5, 9), 14, `5 + 9 = 14`);
    t.equals(doSubtract(6, 1), 5, `6 - 1 = 5`);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});
