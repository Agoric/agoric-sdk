// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/install-ses';

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';

import { makeAmountMath, MathKind } from '../../../src';

// The "unit tests" for MathHelpers actually make the calls through
// AmountMath so that we can test that any duplication is handled
// correctly.

const mockBrand = harden({
  isMyIssuer: () => false,
  getAllegedName: () => 'mock',
});

const amountMath = makeAmountMath(mockBrand, 'set');

const runSetMathHelpersTests = (t, [a, b, c], a2 = undefined) => {
  // a2 is a copy of a which should have the same values but not same
  // identity. This doesn't make sense to use for handle tests, but
  // makes sense for anything where the identity is based on data.

  const {
    getBrand,
    getAmountMathKind,
    make,
    coerce,
    getValue,
    getEmpty,
    isEmpty,
    isGTE,
    isEqual,
    add,
    subtract,
  } = amountMath;

  // getBrand
  t.deepEquals(getBrand(), mockBrand, 'brand is brand');

  // getAmountMathKind
  t.deepEquals(getAmountMathKind(), MathKind.SET, 'amountMathKind is set');

  // make
  t.deepEquals(
    make(harden([a])),
    { brand: mockBrand, value: [a] },
    `[a] is a valid set`,
  );
  t.deepEquals(
    make(harden([a, b])),
    { brand: mockBrand, value: [a, b] },
    `[a, b] is a valid set`,
  );
  t.deepEquals(
    make(harden([])),
    { brand: mockBrand, value: [] },
    `[] is a valid set`,
  );
  t.throws(
    () => make(harden([a, a])),
    /value has duplicates/,
    `duplicates in make should throw`,
  );
  t.deepEquals(
    make(harden(['a', 'b'])),
    { brand: mockBrand, value: ['a', 'b'] },
    'anything comparable is a valid element',
  );
  t.throws(
    () => make(harden('a')),
    /list must be an array/,
    'strings are not valid',
  );
  if (a2 !== undefined) {
    t.throws(
      () => make(harden([a, a2])),
      /value has duplicates/,
      `data identity throws`,
    );
  }

  // coerce
  t.deepEquals(
    coerce(harden({ brand: mockBrand, value: [a] })),
    harden({ brand: mockBrand, value: [a] }),
    `[a] is a valid set`,
  );
  t.deepEquals(
    coerce(harden({ brand: mockBrand, value: [a, b] })),
    harden({ brand: mockBrand, value: [a, b] }),
    `[a, b] is a valid set`,
  );
  t.deepEquals(
    coerce(harden({ brand: mockBrand, value: [] })),
    harden({ brand: mockBrand, value: [] }),
    `[] is a valid set`,
  );
  t.throws(
    () => coerce(make(harden([a, a]))),
    /value has duplicates/,
    `duplicates in coerce should throw`,
  );
  t.deepEquals(
    coerce(make(harden(['a', 'b']))),
    { brand: mockBrand, value: ['a', 'b'] },
    'anything comparable is a valid element',
  );
  t.throws(
    () => coerce(harden({ brand: mockBrand, value: 'a' })),
    /list must be an array/,
    'strings are not valid',
  );
  if (a2 !== undefined) {
    t.throws(
      () => coerce(harden({ brand: mockBrand, value: [a, a2] })),
      /value has duplicates/,
      `data identity throws`,
    );
  }

  // getValue
  t.deepEquals(
    getValue(harden({ brand: mockBrand, value: [a] })),
    [a],
    `getValue of make([a]) is [a]`,
  );

  // getEmpty
  t.deepEquals(
    getEmpty(),
    harden({ brand: mockBrand, value: [] }),
    `empty is []`,
  );

  // isEmpty
  t.ok(isEmpty(make(harden([]))), `isEmpty([]) is true`);
  t.throws(
    () => isEmpty(harden({ brand: mockBrand, value: {} })),
    /list must be an array/,
    `isEmpty({}) throws`,
  );
  t.notOk(isEmpty(make(harden(['abc']))), `isEmpty(['abc']) is false`);
  t.notOk(isEmpty(make(harden([a]))), `isEmpty([a]) is false`);
  t.throws(
    () => isEmpty(harden({ brand: mockBrand, value: [a, a] })),
    /value has duplicates/,
    `duplicates in value in isEmpty throw because of coercion`,
  );
  t.ok(isEmpty(make(harden([]))), `isEmpty([]) is true`);
  t.notOk(isEmpty(make(harden(['abc']))), `isEmpty(['abc']) is false`);
  t.notOk(isEmpty(make(harden([a]))), `isEmpty([a]) is false`);
  if (a2 !== undefined) {
    t.throws(
      () => isEmpty(harden({ brand: mockBrand, value: [a, a2] })),
      /value has duplicates/,
      `data identity throws`,
    );
  }

  // isGTE
  t.throws(
    () =>
      isGTE(
        harden({ brand: mockBrand, value: [a, a] }),
        harden({ brand: mockBrand, value: [b] }),
      ),
    /value has duplicates/,
    `duplicates in the left of isGTE should throw`,
  );
  t.throws(
    () =>
      isGTE(
        harden({ brand: mockBrand, value: [a] }),
        harden({ brand: mockBrand, value: [b, b] }),
      ),
    /value has duplicates/,
    `duplicates in the right of isGTE should throw`,
  );
  t.ok(
    isGTE(
      harden({ brand: mockBrand, value: [a] }),
      harden({ brand: mockBrand, value: [a] }),
    ),
    `overlap between left and right of isGTE should not throw`,
  );
  t.ok(
    isGTE(
      harden({ brand: mockBrand, value: [a, b] }),
      harden({ brand: mockBrand, value: [b] }),
    ),
    '[a, b] is GTE [b]',
  );
  t.notOk(
    isGTE(
      harden({ brand: mockBrand, value: [b] }),
      harden({ brand: mockBrand, value: [b, a] }),
    ),
    '[b] does not include [b, a]',
  );
  if (a2 !== undefined) {
    t.throws(
      () =>
        isGTE(
          harden({ brand: mockBrand, value: [a, a2] }),
          harden({ brand: mockBrand, value: [b] }),
        ),
      /value has duplicates/,
      `data identity throws`,
    );
  }

  // isEqual
  t.throws(
    () =>
      isEqual(
        harden({ brand: mockBrand, value: [a, a] }),
        harden({ brand: mockBrand, value: [a] }),
      ),
    /value has duplicates/,
    `duplicates in left of isEqual should throw`,
  );
  t.throws(
    () =>
      isEqual(
        harden({ brand: mockBrand, value: [a] }),
        harden({ brand: mockBrand, value: [a, a] }),
      ),
    /value has duplicates/,
    `duplicates in right of isEqual should throw`,
  );
  t.ok(
    isEqual(
      harden({ brand: mockBrand, value: [a] }),
      harden({ brand: mockBrand, value: [a] }),
    ),
    `overlap between left and right of isEqual is ok`,
  );
  t.ok(
    isEqual(
      harden({ brand: mockBrand, value: [b, a, c] }),
      harden({ brand: mockBrand, value: [a, c, b] }),
    ),
    `order doesn't matter`,
  );
  t.notOk(
    isEqual(
      harden({ brand: mockBrand, value: [b, c] }),
      harden({ brand: mockBrand, value: [b, a] }),
    ),
    `not equal`,
  );
  if (a2 !== undefined) {
    t.throws(
      () =>
        isEqual(
          harden({ brand: mockBrand, value: [a, a2] }),
          harden({ brand: mockBrand, value: [a] }),
        ),
      /value has duplicates/,
      `data identity throws`,
    );
  }

  // add
  t.throws(
    () =>
      add(
        harden({ brand: mockBrand, value: [a, a] }),
        harden({ brand: mockBrand, value: [b] }),
      ),
    /value has duplicates/,
    `duplicates in left of add should throw`,
  );
  t.throws(
    () =>
      add(
        harden({ brand: mockBrand, value: [a] }),
        harden({ brand: mockBrand, value: [b, b] }),
      ),
    /value has duplicates/,
    `duplicates in right of add should throw`,
  );
  t.throws(
    () =>
      add(
        harden({ brand: mockBrand, value: [a] }),
        harden({ brand: mockBrand, value: [a] }),
      ),
    /value has duplicates/,
    `overlap between left and right of add should throw`,
  );
  t.deepEquals(
    add(
      harden({ brand: mockBrand, value: [] }),
      harden({ brand: mockBrand, value: [b, c] }),
    ),
    harden({ brand: mockBrand, value: [b, c] }),
    `anything + identity stays same`,
  );
  t.deepEquals(
    add(
      harden({ brand: mockBrand, value: [b, c] }),
      harden({ brand: mockBrand, value: [] }),
    ),
    harden({ brand: mockBrand, value: [b, c] }),
    `anything + identity stays same`,
  );
  if (a2 !== undefined) {
    t.throws(
      () =>
        add(
          harden({ brand: mockBrand, value: [a, a2] }),
          harden({ brand: mockBrand, value: [b] }),
        ),
      /value has duplicates/,
      `data identity throws`,
    );
  }

  // subtract
  t.throws(
    () =>
      subtract(
        harden({ brand: mockBrand, value: [a, a] }),
        harden({ brand: mockBrand, value: [b] }),
      ),
    /value has duplicates/,
    `duplicates in left of subtract should throw`,
  );
  t.throws(
    () =>
      subtract(
        harden({ brand: mockBrand, value: [a] }),
        harden({ brand: mockBrand, value: [b, b] }),
      ),
    /value has duplicates/,
    `duplicates in right of subtract should throw`,
  );
  t.deepEquals(
    subtract(
      harden({ brand: mockBrand, value: [a] }),
      harden({ brand: mockBrand, value: [a] }),
    ),
    harden({ brand: mockBrand, value: [] }),
    `overlap between left and right of subtract should not throw`,
  );
  t.throws(
    () =>
      subtract(
        harden({ brand: mockBrand, value: [a, b] }),
        harden({ brand: mockBrand, value: [c] }),
      ),
    /was not in left/,
    `elements in right but not in left of subtract should throw`,
  );
  t.deepEquals(
    subtract(
      harden({ brand: mockBrand, value: [b, c] }),
      harden({ brand: mockBrand, value: [] }),
    ),
    harden({ brand: mockBrand, value: [b, c] }),
    `anything - identity stays same`,
  );
  t.deepEquals(
    subtract(
      harden({ brand: mockBrand, value: [b, c] }),
      harden({ brand: mockBrand, value: [b] }),
    ),
    harden({ brand: mockBrand, value: [c] }),
    `b, c - b is c`,
  );
  if (a2 !== undefined) {
    t.throws(
      () =>
        subtract(
          harden({ brand: mockBrand, value: [a, a2] }),
          harden({ brand: mockBrand, value: [b] }),
        ),
      /value has duplicates/,
      `data identity throws`,
    );
  }
};

test('setMathHelpers with handles', t => {
  try {
    const a = harden({});
    const b = harden({});
    const c = harden({});

    runSetMathHelpersTests(t, harden([a, b, c]));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('setMathHelpers with basic objects', t => {
  try {
    const a = harden({ name: 'a' });
    const b = harden({ name: 'b' });
    const c = harden({ name: 'c' });

    const a2 = harden({ ...a });

    runSetMathHelpersTests(t, harden([a, b, c]), a2);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('setMathHelpers with complex objects', t => {
  try {
    const a = { handle: {}, instanceHandle: {}, name: 'a' };
    const b = { handle: {}, instanceHandle: a.instanceHandle, name: 'b' };
    const c = { handle: {}, instanceHandle: {}, name: 'c' };

    const a2 = harden({ ...a });

    runSetMathHelpersTests(t, harden([a, b, c]), a2);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});
