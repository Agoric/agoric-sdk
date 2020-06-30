/* global harden */
// eslint-disable-next-line import/no-extraneous-dependencies

import '@agoric/install-ses';
import { test } from 'tape-promise/tape';

import makeAmountMath from '../../../src/amountMath';

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
    getMathHelpersName,
    make,
    coerce,
    getExtent,
    getEmpty,
    isEmpty,
    isGTE,
    isEqual,
    add,
    subtract,
  } = amountMath;

  // getBrand
  t.deepEquals(getBrand(), mockBrand, 'brand is brand');

  // getMathHelpersName
  t.deepEquals(getMathHelpersName(), 'set', 'mathHelpersName is set');

  // make
  t.deepEquals(
    make(harden([a])),
    { brand: mockBrand, extent: [a] },
    `[a] is a valid set`,
  );
  t.deepEquals(
    make(harden([a, b])),
    { brand: mockBrand, extent: [a, b] },
    `[a, b] is a valid set`,
  );
  t.deepEquals(
    make(harden([])),
    { brand: mockBrand, extent: [] },
    `[] is a valid set`,
  );
  t.throws(
    () => make(harden([a, a])),
    /extent has duplicates/,
    `duplicates in make should throw`,
  );
  t.deepEquals(
    make(harden(['a', 'b'])),
    { brand: mockBrand, extent: ['a', 'b'] },
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
      /extent has duplicates/,
      `data identity throws`,
    );
  }

  // coerce
  t.deepEquals(
    coerce(harden({ brand: mockBrand, extent: [a] })),
    harden({ brand: mockBrand, extent: [a] }),
    `[a] is a valid set`,
  );
  t.deepEquals(
    coerce(harden({ brand: mockBrand, extent: [a, b] })),
    harden({ brand: mockBrand, extent: [a, b] }),
    `[a, b] is a valid set`,
  );
  t.deepEquals(
    coerce(harden({ brand: mockBrand, extent: [] })),
    harden({ brand: mockBrand, extent: [] }),
    `[] is a valid set`,
  );
  t.throws(
    () => coerce(make(harden([a, a]))),
    /extent has duplicates/,
    `duplicates in coerce should throw`,
  );
  t.deepEquals(
    coerce(make(harden(['a', 'b']))),
    { brand: mockBrand, extent: ['a', 'b'] },
    'anything comparable is a valid element',
  );
  t.throws(
    () => coerce(harden({ brand: mockBrand, extent: 'a' })),
    /list must be an array/,
    'strings are not valid',
  );
  if (a2 !== undefined) {
    t.throws(
      () => coerce(harden({ brand: mockBrand, extent: [a, a2] })),
      /extent has duplicates/,
      `data identity throws`,
    );
  }

  // getExtent
  t.deepEquals(
    getExtent(harden({ brand: mockBrand, extent: [a] })),
    [a],
    `getExtent of make([a]) is [a]`,
  );

  // getEmpty
  t.deepEquals(
    getEmpty(),
    harden({ brand: mockBrand, extent: [] }),
    `empty is []`,
  );

  // isEmpty
  t.ok(isEmpty(make(harden([]))), `isEmpty([]) is true`);
  t.throws(
    () => isEmpty(harden({ brand: mockBrand, extent: {} })),
    /list must be an array/,
    `isEmpty({}) throws`,
  );
  t.notOk(isEmpty(make(harden(['abc']))), `isEmpty(['abc']) is false`);
  t.notOk(isEmpty(make(harden([a]))), `isEmpty([a]) is false`);
  t.throws(
    () => isEmpty(harden({ brand: mockBrand, extent: [a, a] })),
    /extent has duplicates/,
    `duplicates in extent in isEmpty throw because of coercion`,
  );
  t.ok(isEmpty(make(harden([]))), `isEmpty([]) is true`);
  t.notOk(isEmpty(make(harden(['abc']))), `isEmpty(['abc']) is false`);
  t.notOk(isEmpty(make(harden([a]))), `isEmpty([a]) is false`);
  if (a2 !== undefined) {
    t.throws(
      () => isEmpty(harden({ brand: mockBrand, extent: [a, a2] })),
      /extent has duplicates/,
      `data identity throws`,
    );
  }

  // isGTE
  t.throws(
    () =>
      isGTE(
        harden({ brand: mockBrand, extent: [a, a] }),
        harden({ brand: mockBrand, extent: [b] }),
      ),
    /extent has duplicates/,
    `duplicates in the left of isGTE should throw`,
  );
  t.throws(
    () =>
      isGTE(
        harden({ brand: mockBrand, extent: [a] }),
        harden({ brand: mockBrand, extent: [b, b] }),
      ),
    /extent has duplicates/,
    `duplicates in the right of isGTE should throw`,
  );
  t.ok(
    isGTE(
      harden({ brand: mockBrand, extent: [a] }),
      harden({ brand: mockBrand, extent: [a] }),
    ),
    `overlap between left and right of isGTE should not throw`,
  );
  t.ok(
    isGTE(
      harden({ brand: mockBrand, extent: [a, b] }),
      harden({ brand: mockBrand, extent: [b] }),
    ),
    '[a, b] is GTE [b]',
  );
  t.notOk(
    isGTE(
      harden({ brand: mockBrand, extent: [b] }),
      harden({ brand: mockBrand, extent: [b, a] }),
    ),
    '[b] does not include [b, a]',
  );
  if (a2 !== undefined) {
    t.throws(
      () =>
        isGTE(
          harden({ brand: mockBrand, extent: [a, a2] }),
          harden({ brand: mockBrand, extent: [b] }),
        ),
      /extent has duplicates/,
      `data identity throws`,
    );
  }

  // isEqual
  t.throws(
    () =>
      isEqual(
        harden({ brand: mockBrand, extent: [a, a] }),
        harden({ brand: mockBrand, extent: [a] }),
      ),
    /extent has duplicates/,
    `duplicates in left of isEqual should throw`,
  );
  t.throws(
    () =>
      isEqual(
        harden({ brand: mockBrand, extent: [a] }),
        harden({ brand: mockBrand, extent: [a, a] }),
      ),
    /extent has duplicates/,
    `duplicates in right of isEqual should throw`,
  );
  t.ok(
    isEqual(
      harden({ brand: mockBrand, extent: [a] }),
      harden({ brand: mockBrand, extent: [a] }),
    ),
    `overlap between left and right of isEqual is ok`,
  );
  t.ok(
    isEqual(
      harden({ brand: mockBrand, extent: [b, a, c] }),
      harden({ brand: mockBrand, extent: [a, c, b] }),
    ),
    `order doesn't matter`,
  );
  t.notOk(
    isEqual(
      harden({ brand: mockBrand, extent: [b, c] }),
      harden({ brand: mockBrand, extent: [b, a] }),
    ),
    `not equal`,
  );
  if (a2 !== undefined) {
    t.throws(
      () =>
        isEqual(
          harden({ brand: mockBrand, extent: [a, a2] }),
          harden({ brand: mockBrand, extent: [a] }),
        ),
      /extent has duplicates/,
      `data identity throws`,
    );
  }

  // add
  t.throws(
    () =>
      add(
        harden({ brand: mockBrand, extent: [a, a] }),
        harden({ brand: mockBrand, extent: [b] }),
      ),
    /extent has duplicates/,
    `duplicates in left of add should throw`,
  );
  t.throws(
    () =>
      add(
        harden({ brand: mockBrand, extent: [a] }),
        harden({ brand: mockBrand, extent: [b, b] }),
      ),
    /extent has duplicates/,
    `duplicates in right of add should throw`,
  );
  t.throws(
    () =>
      add(
        harden({ brand: mockBrand, extent: [a] }),
        harden({ brand: mockBrand, extent: [a] }),
      ),
    /extent has duplicates/,
    `overlap between left and right of add should throw`,
  );
  t.deepEquals(
    add(
      harden({ brand: mockBrand, extent: [] }),
      harden({ brand: mockBrand, extent: [b, c] }),
    ),
    harden({ brand: mockBrand, extent: [b, c] }),
    `anything + identity stays same`,
  );
  t.deepEquals(
    add(
      harden({ brand: mockBrand, extent: [b, c] }),
      harden({ brand: mockBrand, extent: [] }),
    ),
    harden({ brand: mockBrand, extent: [b, c] }),
    `anything + identity stays same`,
  );
  if (a2 !== undefined) {
    t.throws(
      () =>
        add(
          harden({ brand: mockBrand, extent: [a, a2] }),
          harden({ brand: mockBrand, extent: [b] }),
        ),
      /extent has duplicates/,
      `data identity throws`,
    );
  }

  // subtract
  t.throws(
    () =>
      subtract(
        harden({ brand: mockBrand, extent: [a, a] }),
        harden({ brand: mockBrand, extent: [b] }),
      ),
    /extent has duplicates/,
    `duplicates in left of subtract should throw`,
  );
  t.throws(
    () =>
      subtract(
        harden({ brand: mockBrand, extent: [a] }),
        harden({ brand: mockBrand, extent: [b, b] }),
      ),
    /extent has duplicates/,
    `duplicates in right of subtract should throw`,
  );
  t.deepEquals(
    subtract(
      harden({ brand: mockBrand, extent: [a] }),
      harden({ brand: mockBrand, extent: [a] }),
    ),
    harden({ brand: mockBrand, extent: [] }),
    `overlap between left and right of subtract should not throw`,
  );
  t.throws(
    () =>
      subtract(
        harden({ brand: mockBrand, extent: [a, b] }),
        harden({ brand: mockBrand, extent: [c] }),
      ),
    /was not in left/,
    `elements in right but not in left of subtract should throw`,
  );
  t.deepEquals(
    subtract(
      harden({ brand: mockBrand, extent: [b, c] }),
      harden({ brand: mockBrand, extent: [] }),
    ),
    harden({ brand: mockBrand, extent: [b, c] }),
    `anything - identity stays same`,
  );
  t.deepEquals(
    subtract(
      harden({ brand: mockBrand, extent: [b, c] }),
      harden({ brand: mockBrand, extent: [b] }),
    ),
    harden({ brand: mockBrand, extent: [c] }),
    `b, c - b is c`,
  );
  if (a2 !== undefined) {
    t.throws(
      () =>
        subtract(
          harden({ brand: mockBrand, extent: [a, a2] }),
          harden({ brand: mockBrand, extent: [b] }),
        ),
      /extent has duplicates/,
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
