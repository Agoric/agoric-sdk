// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';
import inviteMathHelpers from '../../../src/mathHelpers/inviteMathHelpers';

test('inviteMathHelpers', t => {
  try {
    const {
      doAssertKind,
      doGetIdentity,
      doIsIdentity,
      doIsGTE,
      doIsEqual,
      doAdd,
      doSubtract,
    } = inviteMathHelpers;

    // "name" property is for debugging purposes only
    const a = { handle: {}, instanceHandle: {}, name: 'a' };
    // 'a2' is a different object but with the same identity and meaning
    // as 'a', if 'a2' and 'a' are both present, they should be
    // duplicated down to one of them.
    const a2 = {
      handle: a.handle,
      instanceHandle: a.instanceHandle,
      name: 'a2',
    };
    const b = { handle: {}, instanceHandle: a.instanceHandle, name: 'b' };
    const c = { handle: {}, instanceHandle: {}, name: 'c' };

    t.doesNotThrow(
      () => doAssertKind(harden([a])),
      undefined,
      `[a] is a valid invite list`,
    );
    t.doesNotThrow(
      () => doAssertKind(harden([a, a])),
      undefined,
      `[a, a] is a valid invite list`,
    );
    t.doesNotThrow(
      () => doAssertKind(harden([])),
      undefined,
      `[] is a valid invite list`,
    );
    t.throws(
      () => doAssertKind(harden(['a', 'b'])),
      'lists of strings are not valid',
    );
    t.throws(() => doAssertKind(harden('a')), 'strings are not valid');
    t.deepEquals(doGetIdentity(), harden([]), `identity is []`);
    t.ok(doIsIdentity(harden([])), `doIsIdentity([]) is true`);
    t.notOk(doIsIdentity(harden(a)), `doIsIdentity(a) is false`);
    t.notOk(doIsIdentity(harden(['abc'])), `doIsIdentity(['abc']) is false`);
    t.notOk(doIsIdentity(harden([a])), `doIsIdentity([a]) is false`);

    t.ok(doIsGTE(harden([a]), harden([a2])), '[a] is GTE [a2]');
    t.ok(doIsGTE(harden([a2]), harden([a])), '[a2] is GTE [a]');
    t.ok(doIsGTE(harden([a2, a]), harden([a])), '[a2, a] is GTE [a]');
    t.ok(doIsGTE(harden([a, b]), harden([b])), '[a, b] is GTE [b]');
    t.notOk(doIsGTE(harden([b]), harden([b, a])), '[b] is not GTE [b, a]');
    t.ok(
      doIsEqual(harden([a]), harden([a2])),
      `invites are equal if they have the same handle`,
    );
    t.notOk(
      doIsEqual(harden([a]), harden([b])),
      `invites are not equal if they have a different handle`,
    );
    t.ok(
      doIsEqual(harden([b, a, c]), harden([a, c, b])),
      `order doesn't matter`,
    );
    t.notOk(doIsEqual(harden([b, c]), harden([b, a])), `not equal`);
    t.deepEquals(
      doAdd(harden([a, a]), harden([a, a])),
      harden([a]),
      'deduplicate down to [a]',
    );
    t.deepEquals(
      doAdd(harden([a, a2]), harden([a, a2])),
      harden([a]),
      'deduplicate down to [a]',
    );
    t.deepEquals(
      doAdd(harden([a, c]), harden([c, b])),
      harden([a, c, b]),
      'a, b, c expected in any order',
    );
    t.deepEquals(
      doAdd(harden([a, c]), harden([c, b])),
      harden([a, c, b]),
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
      doSubtract(harden([a, a]), harden([a2, a2])),
      harden([]),
      `a, a - a2, a2 is the identity`,
    );
    t.deepEquals(
      doSubtract(harden([a, a, a2, b]), harden([a])),
      harden([b]),
      `a, a, a2, b - a is b`,
    );
    t.throws(
      () => doSubtract(harden([a, a2]), harden([b])),
      /Error: right element was not in left/,
      `a, a2 - b is an error`,
    );
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});
