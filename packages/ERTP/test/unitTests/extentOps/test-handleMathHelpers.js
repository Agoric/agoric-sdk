// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';
import handleMathHelpers from '../../../src/mathHelpers/handleMathHelpers';

test('handleMathHelpers', t => {
  try {
    const {
      doAssertKind,
      doGetIdentity,
      doIsIdentity,
      doIsGTE,
      doIsEqual,
      doAdd,
      doSubtract,
    } = handleMathHelpers;
    t.doesNotThrow(
      () => doAssertKind(harden([{}])),
      undefined,
      `[{}] is a valid handle list`,
    );
    t.doesNotThrow(
      () => doAssertKind(harden([{}, {}])),
      undefined,
      `[{}, {}] is a valid handle list`,
    );
    t.doesNotThrow(
      () => doAssertKind(harden([])),
      undefined,
      `[] is a valid handle list`,
    );
    t.throws(
      () => doAssertKind(harden(['a', 'b'])),
      'lists of strings are not valid',
    );
    t.throws(() => doAssertKind(harden('a')), 'strings are not valid');
    t.deepEquals(doGetIdentity(), harden([]), `identity is []`);
    t.ok(doIsIdentity(harden([])), `doIsIdentity([]) is true`);
    t.notOk(doIsIdentity(harden({})), `doIsIdentity({}) is false`);
    t.notOk(doIsIdentity(harden(['abc'])), `doIsIdentity(['abc']) is false`);
    t.notOk(doIsIdentity(harden([{}])), `doIsIdentity([{}]) is false`);

    const a = {};
    const b = {};
    const c = {};

    t.ok(doIsGTE(harden([a, b]), harden([b])), '[a, b] is GTE [b]');
    t.ok(doIsGTE(harden([a]), harden([a, a])), '[a] is GTE [a, a]');
    t.notOk(
      doIsGTE(harden([b]), harden([b, a])),
      '[b] does not include [b, a]',
    );
    t.ok(
      doIsEqual(harden([b, a, c]), harden([a, c, b])),
      `order doesn't matter`,
    );
    t.ok(doIsEqual(harden([a]), harden([a, a])), `duplication doesn't matter`);
    t.notOk(doIsEqual(harden([b, c]), harden([b, a])), `not equal`);
    t.deepEquals(
      doAdd(harden([a, c]), harden([c, b])),
      harden([a, b, c]),
      'a, b, c expected in any order',
    );
    t.deepEquals(
      doAdd(harden([a, a]), harden([a, a])),
      harden([a]),
      '[a] de-duplicated',
    );
    t.deepEquals(
      doAdd(harden([a, c]), harden([c, b])),
      harden([b, a, c]),
      'a, b, c expected in any order',
    );
    t.deepEquals(
      doAdd(harden([]), harden([b, c])),
      harden([b, c]),
      `anything + identity stays same`,
    );
    t.deepEquals(
      doAdd(harden([b, c]), harden([])),
      harden([b, c]),
      `anything + identity stays same`,
    );
    t.deepEquals(
      doSubtract(harden([b, c]), harden([])),
      harden([b, c]),
      `anything - identity stays same`,
    );
    t.deepEquals(
      doSubtract(harden([b, c]), harden([b])),
      harden([c]),
      `b, c - b is c`,
    );
    t.deepEquals(
      doSubtract(harden([a, a, b]), harden([b, b])),
      harden([a]),
      `a, a, b - b, b is a`,
    );
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});
