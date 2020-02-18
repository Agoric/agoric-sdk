// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';
import strSetMathHelpers from '../../../src/mathHelpers/strSetMathHelpers';

test('strSetMathHelpers', t => {
  try {
    const {
      doAssertKind,
      doGetIdentity,
      doIsIdentity,
      doIsGTE,
      doIsEqual,
      doAdd,
      doSubtract,
    } = strSetMathHelpers;
    t.doesNotThrow(
      () => doAssertKind(harden(['1'])),
      undefined,
      `['1'] is a valid string array`,
    );
    t.throws(
      () => doAssertKind(4),
      /list must be an array/,
      `4 is not a valid string array`,
    );
    t.throws(
      () => doAssertKind(harden([6])),
      /must be a string/,
      `[6] is not a valid string array`,
    );
    t.throws(
      () => doAssertKind('abc'),
      /list must be an array/,
      `'abc' is not a valid string array`,
    );
    t.ok(
      () => doAssertKind(harden(['a', 'a'])),
      `duplicates in doAssertKind are ok`,
    );
    t.deepEquals(doGetIdentity(), harden([]), `identity is []`);
    t.ok(doIsIdentity(harden([])), `doIsIdentity([]) is true`);
    t.notOk(doIsIdentity('abc'), `doIsIdentity('abc') is false`);
    t.notOk(doIsIdentity(harden(['abc'])), `doIsIdentity(['abc']) is false`);
    t.notOk(doIsIdentity(harden([8])), `doIsIdentity([8]) is false`);
    t.notOk(
      doIsIdentity(harden(['a', 'a'])),
      `duplicates in doIsIdentity do not throw`,
    );
    t.throws(
      () => doIsGTE(harden(['a', 'a']), harden(['b'])),
      `duplicates in the left of doIsGTE should throw`,
    );
    t.throws(
      () => doIsGTE(harden(['a']), harden(['b', 'b'])),
      `duplicates in the right of doIsGTE should throw`,
    );
    t.ok(
      doIsGTE(harden(['a']), harden(['a'])),
      `overlap between left and right of doIsGTE should not throw`,
    );
    t.ok(
      doIsGTE(harden(['a', 'b']), harden(['a'])),
      `['a', 'b'] is gte to ['a']`,
    );
    t.notOk(doIsGTE(harden(['a']), harden(['b'])), `['a'] is not gte to ['b']`);
    t.throws(
      () => doIsEqual(harden(['a', 'a'], ['a'])),
      /doIsEqual left has duplicates/,
      `duplicates in left of doIsEqual should throw`,
    );
    t.throws(
      () => doIsEqual(harden(['a']), harden(['a', 'a'])),
      /doIsEqual right has duplicates/,
      `duplicates in right of doIsEqual should throw`,
    );
    t.ok(
      doIsEqual(harden(['a']), harden(['a'])),
      `overlap between left and right of doIsEqual is ok`,
    );
    t.ok(
      doIsEqual(harden(['a', 'b']), harden(['b', 'a'])),
      `['a', 'b'] equals ['b', 'a']`,
    );
    t.notOk(
      doIsEqual(harden(['a']), harden(['b'])),
      `['a'] does not equal ['b']`,
    );
    t.throws(
      () => doAdd(harden(['a', 'a']), harden(['b'])),
      /doAdd left has duplicates/,
      `duplicates in left of doAdd should throw`,
    );
    t.throws(
      () => doAdd(harden(['a']), harden(['b', 'b'])),
      /doAdd right has duplicates/,
      `duplicates in right of doAdd should throw`,
    );
    t.throws(
      () => doAdd(harden(['a']), harden(['a'])),
      /doAdd left and right have same element/,
      `overlap between left and right of doAdd should throw`,
    );
    t.deepEquals(
      doAdd(harden(['a']), harden(['b'])),
      harden(['a', 'b']),
      `['a'] + ['b'] = ['a', 'b']`,
    );
    t.throws(
      () => doSubtract(harden(['a', 'a']), harden(['b'])),
      /doSubtract left has duplicates/,
      `duplicates in left of doSubtract should throw`,
    );
    t.throws(
      () => doSubtract(harden(['a']), harden(['b', 'b'])),
      /doSubtract right has duplicates/,
      `duplicates in right of doSubtract should throw`,
    );
    t.deepEquals(
      doSubtract(harden(['a']), harden(['a'])),
      harden([]),
      `overlap between left and right of doSubtract should not throw`,
    );
    t.throws(
      () => doSubtract(harden(['a', 'b']), harden(['c'])),
      /some of the elements in right .* were not present in left/,
      `elements in right but not in left of doSubtract should throw`,
    );
    t.deepEquals(
      doSubtract(harden(['a', 'b']), harden(['a'])),
      harden(['b']),
      `['a', 'b'] - ['a'] = ['a']`,
    );
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});
