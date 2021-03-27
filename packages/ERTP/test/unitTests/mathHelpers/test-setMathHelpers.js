// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava';

import { Far } from '@agoric/marshal';

import { amountMath as m, MathKind } from '../../../src';
import { mockBrand } from './mockBrand';

// The "unit tests" for MathHelpers actually make the calls through
// AmountMath so that we can test that any duplication is handled
// correctly.

const runSetMathHelpersTests = (t, [a, b, c], a2 = undefined) => {
  // a2 is a copy of a which should have the same values but not same
  // identity. This doesn't make sense to use for handle tests, but
  // makes sense for anything where the identity is based on data.

  // make
  t.deepEqual(
    m.make([a], mockBrand),
    { brand: mockBrand, value: [a] },
    `[a] is a valid set`,
  );
  t.deepEqual(
    m.make([a, b], mockBrand),
    { brand: mockBrand, value: [a, b] },
    `[a, b] is a valid set`,
  );
  t.deepEqual(
    m.make([], mockBrand),
    { brand: mockBrand, value: [] },
    `[] is a valid set`,
  );
  t.throws(
    () => m.make([a, a], mockBrand),
    { message: /value has duplicates/ },
    `duplicates in make should throw`,
  );
  t.deepEqual(
    m.make(['a', 'b'], mockBrand),
    { brand: mockBrand, value: ['a', 'b'] },
    'anything comparable is a valid element',
  );
  t.throws(
    () => m.make('a', mockBrand),
    { message: /value .* must be a Nat or an array/ },
    'strings are not valid',
  );
  if (a2 !== undefined) {
    t.throws(
      () => m.make([a, a2], mockBrand),
      { message: /value has duplicates/ },
      `data identity throws`,
    );
  }

  // coerce
  t.deepEqual(
    m.coerce({ brand: mockBrand, value: [a] }, mockBrand),
    { brand: mockBrand, value: [a] },
    `[a] is a valid set`,
  );
  t.deepEqual(
    m.coerce({ brand: mockBrand, value: [a, b] }, mockBrand),
    { brand: mockBrand, value: [a, b] },
    `[a, b] is a valid set`,
  );
  t.deepEqual(
    m.coerce({ brand: mockBrand, value: [] }, mockBrand),
    { brand: mockBrand, value: [] },
    `[] is a valid set`,
  );
  t.throws(
    () => m.coerce(m.make([a, a], mockBrand), mockBrand),
    { message: /value has duplicates/ },
    `duplicates in coerce should throw`,
  );
  t.deepEqual(
    m.coerce(m.make(['a', 'b'], mockBrand), mockBrand),
    { brand: mockBrand, value: ['a', 'b'] },
    'anything comparable is a valid element',
  );
  t.throws(
    () => m.coerce({ brand: mockBrand, value: 'a' }, mockBrand),
    { message: /value .* must be a Nat or an array/ },
    'strings are not valid',
  );
  if (a2 !== undefined) {
    t.throws(
      () => m.coerce({ brand: mockBrand, value: [a, a2] }, mockBrand),
      { message: /value has duplicates/ },
      `data identity throws`,
    );
  }

  // m.getValue(
  t.deepEqual(
    m.getValue({ brand: mockBrand, value: [a] }, mockBrand),
    [a],
    `m.getValue( of m.make([a]) is [a]`,
  );

  // makeEmpty
  t.deepEqual(
    m.makeEmpty(mockBrand, MathKind.SET),
    { brand: mockBrand, value: [] },
    `empty is []`,
  );

  // isEmpty
  t.assert(
    m.isEmpty(m.make([], mockBrand), mockBrand),
    `m.isEmpty([]) is true`,
  );
  t.throws(
    () => m.isEmpty({ brand: mockBrand, value: harden({}) }),
    { message: /value .* must be a Nat or an array/ },
    `m.isEmpty({}) throws`,
  );
  t.falsy(m.isEmpty(m.make(['abc'], mockBrand)), `m.isEmpty(['abc']) is false`);
  t.falsy(m.isEmpty(m.make([a], mockBrand)), `m.isEmpty([a]) is false`);
  t.throws(
    () => m.isEmpty({ brand: mockBrand, value: [a, a] }),
    { message: /value has duplicates/ },
    `duplicates in value in isEmpty throw because of coercion`,
  );
  t.assert(m.isEmpty(m.make([], mockBrand)), `m.isEmpty([]) is true`);
  t.falsy(m.isEmpty(m.make(['abc'], mockBrand)), `m.isEmpty(['abc']) is false`);
  t.falsy(m.isEmpty(m.make([a], mockBrand)), `m.isEmpty([a]) is false`);
  if (a2 !== undefined) {
    t.throws(
      () => m.isEmpty({ brand: mockBrand, value: [a, a2] }),
      { message: /value has duplicates/ },
      `data identity throws`,
    );
  }

  // isGTE
  t.throws(
    () =>
      m.isGTE(
        { brand: mockBrand, value: [a, a] },
        { brand: mockBrand, value: [b] },
      ),
    { message: /value has duplicates/ },
    `duplicates in the left of isGTE should throw`,
  );
  t.throws(
    () =>
      m.isGTE(
        { brand: mockBrand, value: [a] },
        { brand: mockBrand, value: [b, b] },
      ),
    { message: /value has duplicates/ },
    `duplicates in the right of isGTE should throw`,
  );
  t.assert(
    m.isGTE({ brand: mockBrand, value: [a] }, { brand: mockBrand, value: [a] }),
    `overlap between left and right of isGTE should not throw`,
  );
  t.assert(
    m.isGTE(
      { brand: mockBrand, value: [a, b] },
      { brand: mockBrand, value: [b] },
    ),
    '[a, b] is GTE [b]',
  );
  t.falsy(
    m.isGTE(
      { brand: mockBrand, value: [b] },
      { brand: mockBrand, value: [b, a] },
    ),
    '[b] does not include [b, a]',
  );
  if (a2 !== undefined) {
    t.throws(
      () =>
        m.isGTE(
          { brand: mockBrand, value: [a, a2] },
          { brand: mockBrand, value: [b] },
        ),
      { message: /value has duplicates/ },
      `data identity throws`,
    );
  }

  // isEqual
  t.throws(
    () =>
      m.isEqual(
        { brand: mockBrand, value: [a, a] },
        { brand: mockBrand, value: [a] },
      ),
    { message: /value has duplicates/ },
    `duplicates in left of isEqual should throw`,
  );
  t.throws(
    () =>
      m.isEqual(
        { brand: mockBrand, value: [a] },
        { brand: mockBrand, value: [a, a] },
      ),
    { message: /value has duplicates/ },
    `duplicates in right of isEqual should throw`,
  );
  t.assert(
    m.isEqual(
      { brand: mockBrand, value: [a] },
      { brand: mockBrand, value: [a] },
    ),
    `overlap between left and right of isEqual is ok`,
  );
  t.assert(
    m.isEqual(
      { brand: mockBrand, value: [b, a, c] },
      { brand: mockBrand, value: [a, c, b] },
    ),
    `order doesn't matter`,
  );
  t.falsy(
    m.isEqual(
      { brand: mockBrand, value: [b, c] },
      { brand: mockBrand, value: [b, a] },
    ),
    `not equal`,
  );
  if (a2 !== undefined) {
    t.throws(
      () =>
        m.isEqual(
          { brand: mockBrand, value: [a, a2] },
          { brand: mockBrand, value: [a] },
        ),
      { message: /value has duplicates/ },
      `data identity throws`,
    );
  }

  // add
  t.throws(
    () =>
      m.add(
        { brand: mockBrand, value: [a, a] },
        { brand: mockBrand, value: [b] },
      ),
    { message: /value has duplicates/ },
    `duplicates in left of add should throw`,
  );
  t.throws(
    () =>
      m.add(
        { brand: mockBrand, value: [a] },
        { brand: mockBrand, value: [b, b] },
      ),
    { message: /value has duplicates/ },
    `duplicates in right of add should throw`,
  );
  t.throws(
    () =>
      m.add({ brand: mockBrand, value: [a] }, { brand: mockBrand, value: [a] }),
    { message: /value has duplicates/ },
    `overlap between left and right of add should throw`,
  );
  t.deepEqual(
    m.add({ brand: mockBrand, value: [] }, { brand: mockBrand, value: [b, c] }),
    { brand: mockBrand, value: [b, c] },
    `anything + identity stays same`,
  );
  t.deepEqual(
    m.add({ brand: mockBrand, value: [b, c] }, { brand: mockBrand, value: [] }),
    { brand: mockBrand, value: [b, c] },
    `anything + identity stays same`,
  );
  if (a2 !== undefined) {
    t.throws(
      () =>
        m.add(
          { brand: mockBrand, value: [a, a2] },
          { brand: mockBrand, value: [b] },
        ),
      { message: /value has duplicates/ },
      `data identity throws`,
    );
  }

  // subtract
  t.throws(
    () =>
      m.subtract(
        { brand: mockBrand, value: [a, a] },
        { brand: mockBrand, value: [b] },
      ),
    { message: /value has duplicates/ },
    `duplicates in left of subtract should throw`,
  );
  t.throws(
    () =>
      m.subtract(
        { brand: mockBrand, value: [a] },
        { brand: mockBrand, value: [b, b] },
      ),
    { message: /value has duplicates/ },
    `duplicates in right of subtract should throw`,
  );
  t.deepEqual(
    m.subtract(
      { brand: mockBrand, value: [a] },
      { brand: mockBrand, value: [a] },
    ),
    { brand: mockBrand, value: [] },
    `overlap between left and right of subtract should not throw`,
  );
  t.throws(
    () =>
      m.subtract(
        { brand: mockBrand, value: [a, b] },
        { brand: mockBrand, value: [c] },
      ),
    { message: /was not in left/ },
    `elements in right but not in left of subtract should throw`,
  );
  t.deepEqual(
    m.subtract(
      { brand: mockBrand, value: [b, c] },
      { brand: mockBrand, value: [] },
    ),
    { brand: mockBrand, value: [b, c] },
    `anything - identity stays same`,
  );
  t.deepEqual(
    m.subtract(
      { brand: mockBrand, value: [b, c] },
      { brand: mockBrand, value: [b] },
    ),
    { brand: mockBrand, value: [c] },
    `b, c - b is c`,
  );
  if (a2 !== undefined) {
    t.throws(
      () =>
        m.subtract(
          { brand: mockBrand, value: [a, a2] },
          { brand: mockBrand, value: [b] },
        ),
      { message: /value has duplicates/ },
      `data identity throws`,
    );
  }
};

test('setMathHelpers with handles', t => {
  const a = Far('iface', {});
  const b = Far('iface', {});
  const c = Far('iface', {});

  runSetMathHelpersTests(t, [a, b, c]);
});

test('setMathHelpers with basic objects', t => {
  const a = { name: 'a' };
  const b = { name: 'b' };
  const c = { name: 'c' };

  const a2 = { ...a };

  runSetMathHelpersTests(t, [a, b, c], a2);
});

test('setMathHelpers with complex objects', t => {
  const a = {
    handle: Far('handle', {}),
    instanceHandle: Far('ihandle', {}),
    name: 'a',
  };
  const b = {
    handle: Far('handle', {}),
    instanceHandle: a.instanceHandle,
    name: 'b',
  };
  const c = {
    handle: Far('handle', {}),
    instanceHandle: Far('ihandle', {}),
    name: 'c',
  };

  const a2 = { ...a };

  runSetMathHelpersTests(t, [a, b, c], a2);
});
