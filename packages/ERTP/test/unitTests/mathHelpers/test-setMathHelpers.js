// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';
import setMathHelpers from '../../../src/mathHelpers/setMathHelpers';

const runSetMathHelpersTests = (t, [a, b, c]) => {
  const {
    doAssertKind,
    doGetIdentity,
    doIsIdentity,
    doIsGTE,
    doIsEqual,
    doAdd,
    doSubtract,
  } = setMathHelpers;

  t.doesNotThrow(
    () => doAssertKind(harden([a])),
    undefined,
    `[a] is a valid set`,
  );
  t.doesNotThrow(
    () => doAssertKind(harden([a, b])),
    undefined,
    `[a, b] is a valid set`,
  );
  t.doesNotThrow(
    () => doAssertKind(harden([])),
    undefined,
    `[] is a valid set`,
  );
  t.doesNotThrow(
    () => doAssertKind(harden([a, a])),
    undefined,
    `duplicates in doAssertKind ok`,
  );
  t.throws(
    () => doAssertKind(harden(['a', 'b'])),
    /should be a record/,
    'lists of strings are not valid',
  );
  t.throws(
    () => doAssertKind(harden('a')),
    /list must be an array/,
    'strings are not valid',
  );

  t.deepEquals(doGetIdentity(), harden([]), `identity is []`);

  t.ok(doIsIdentity(harden([])), `doIsIdentity([]) is true`);
  t.notOk(doIsIdentity(harden({})), `doIsIdentity({}) is false`);
  t.notOk(doIsIdentity(harden(['abc'])), `doIsIdentity(['abc']) is false`);
  t.notOk(doIsIdentity(harden([a])), `doIsIdentity([{}]) is false`);
  t.notOk(
    doIsIdentity(harden([a, a])),
    `duplicates in doIsIdentity do not throw`,
  );

  t.throws(
    () => doIsGTE(harden([a, a]), harden([b])),
    /doIsGTE left duplicate found/,
    `duplicates in the left of doIsGTE should throw`,
  );
  t.throws(
    () => doIsGTE(harden([a]), harden([b, b])),
    /doIsGTE right duplicate found/,
    `duplicates in the right of doIsGTE should throw`,
  );
  t.ok(
    doIsGTE(harden([a]), harden([a])),
    `overlap between left and right of doIsGTE should not throw`,
  );
  t.ok(doIsGTE(harden([a, b]), harden([b])), '[a, b] is GTE [b]');
  t.notOk(doIsGTE(harden([b]), harden([b, a])), '[b] does not include [b, a]');

  t.throws(
    () => doIsEqual(harden([a, a], [a])),
    /doIsEqual left duplicate found/,
    `duplicates in left of doIsEqual should throw`,
  );
  t.throws(
    () => doIsEqual(harden([a]), harden([a, a])),
    /doIsEqual right duplicate found/,
    `duplicates in right of doIsEqual should throw`,
  );
  t.ok(
    doIsEqual(harden([a]), harden([a])),
    `overlap between left and right of doIsEqual is ok`,
  );
  t.ok(doIsEqual(harden([b, a, c]), harden([a, c, b])), `order doesn't matter`);
  t.notOk(doIsEqual(harden([b, c]), harden([b, a])), `not equal`);

  t.throws(
    () => doAdd(harden([a, a]), harden([b])),
    /doAdd left and right duplicate found/,
    `duplicates in left of doAdd should throw`,
  );
  t.throws(
    () => doAdd(harden([a]), harden([b, b])),
    /doAdd left and right duplicate found/,
    `duplicates in right of doAdd should throw`,
  );
  t.throws(
    () => doAdd(harden([a]), harden([a])),
    /doAdd left and right duplicate found/,
    `overlap between left and right of doAdd should throw`,
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

  t.throws(
    () => doSubtract(harden([a, a]), harden([b])),
    /doSubtract left duplicate found/,
    `duplicates in left of doSubtract should throw`,
  );
  t.throws(
    () => doSubtract(harden([a]), harden([b, b])),
    /doSubtract right duplicate found/,
    `duplicates in right of doSubtract should throw`,
  );
  t.deepEquals(
    doSubtract(harden([a]), harden([a])),
    harden([]),
    `overlap between left and right of doSubtract should not throw`,
  );
  t.throws(
    () => doSubtract(harden([a, b]), harden([c])),
    /was not in left/,
    `elements in right but not in left of doSubtract should throw`,
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
};

test('setMathHelpers with basic objects', t => {
  try {
    const a = harden({ name: 'a' });
    const b = harden({ name: 'b' });
    const c = harden({ name: 'c' });

    runSetMathHelpersTests(t, harden([a, b, c]));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('setMathHelpers with basic objects', t => {
  try {
    // "name" property is for debugging purposes only
    const a = { handle: {}, instanceHandle: {}, name: 'a' };
    const b = { handle: {}, instanceHandle: a.instanceHandle, name: 'b' };
    const c = { handle: {}, instanceHandle: {}, name: 'c' };

    runSetMathHelpersTests(t, harden([a, b, c]));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});
