// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';

import { makeAmountMath, MathKind, makeIssuerKit } from '../../../src';
import { coerceDisplayInfo } from '../../../src/displayInfo';

// The "unit tests" for MathHelpers actually make the calls through
// AmountMath so that we can test that any duplication is handled
// correctly.

const mockBrand = harden({
  isMyIssuer: () => Promise.resolve(false),
  getAllegedName: () => 'mock',
  getDisplayInfo: () => coerceDisplayInfo(undefined),
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
    find,
  } = amountMath;

  // getBrand
  t.deepEqual(getBrand(), mockBrand, 'brand is brand');

  // getAmountMathKind
  t.deepEqual(getAmountMathKind(), MathKind.SET, 'amountMathKind is set');

  // make
  t.deepEqual(
    make(harden([a])),
    { brand: mockBrand, value: [a] },
    `[a] is a valid set`,
  );
  t.deepEqual(
    make(harden([a, b])),
    { brand: mockBrand, value: [a, b] },
    `[a, b] is a valid set`,
  );
  t.deepEqual(
    make(harden([])),
    { brand: mockBrand, value: [] },
    `[] is a valid set`,
  );
  t.throws(
    () => make(harden([a, a])),
    { message: /value has duplicates/ },
    `duplicates in make should throw`,
  );
  t.throws(
    () => make(harden('a')),
    { message: /list must be an array/ },
    'strings are not valid',
  );
  if (a2 !== undefined) {
    t.throws(
      () => make(harden([a, a2])),
      { message: /value has duplicates/ },
      `data identity throws`,
    );
  }

  // coerce
  t.deepEqual(
    coerce(harden({ brand: mockBrand, value: [a] })),
    harden({ brand: mockBrand, value: [a] }),
    `[a] is a valid set`,
  );
  t.deepEqual(
    coerce(harden({ brand: mockBrand, value: [a, b] })),
    harden({ brand: mockBrand, value: [a, b] }),
    `[a, b] is a valid set`,
  );
  t.deepEqual(
    coerce(harden({ brand: mockBrand, value: [] })),
    harden({ brand: mockBrand, value: [] }),
    `[] is a valid set`,
  );
  t.throws(
    () => coerce(make(harden([a, a]))),
    { message: /value has duplicates/ },
    `duplicates in coerce should throw`,
  );
  t.throws(
    () => coerce(harden({ brand: mockBrand, value: 'a' })),
    { message: /list must be an array/ },
    'strings are not valid',
  );
  if (a2 !== undefined) {
    t.throws(
      () => coerce(harden({ brand: mockBrand, value: [a, a2] })),
      { message: /value has duplicates/ },
      `data identity throws`,
    );
  }

  // getValue
  t.deepEqual(
    getValue(harden({ brand: mockBrand, value: [a] })),
    [a],
    `getValue of make([a]) is [a]`,
  );

  // getEmpty
  t.deepEqual(
    getEmpty(),
    harden({ brand: mockBrand, value: [] }),
    `empty is []`,
  );

  // isEmpty
  t.assert(isEmpty(make(harden([]))), `isEmpty([]) is true`);
  t.throws(
    () => isEmpty(harden({ brand: mockBrand, value: {} })),
    { message: /list must be an array/ },
    `isEmpty({}) throws`,
  );
  t.throws(
    () => isEmpty(make(harden(['abc']))),
    { message: /must be an object/ },
    `isEmpty(['abc']) is throws because each element must be a record with string properties`,
  );
  t.falsy(isEmpty(make(harden([a]))), `isEmpty([a]) is false`);
  t.throws(
    () => isEmpty(harden({ brand: mockBrand, value: [a, a] })),
    { message: /value has duplicates/ },
    `duplicates in value in isEmpty throw because of coercion`,
  );
  if (a2 !== undefined) {
    t.throws(
      () => isEmpty(harden({ brand: mockBrand, value: [a, a2] })),
      { message: /value has duplicates/ },
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
    { message: /value has duplicates/ },
    `duplicates in the left of isGTE should throw`,
  );
  t.throws(
    () =>
      isGTE(
        harden({ brand: mockBrand, value: [a] }),
        harden({ brand: mockBrand, value: [b, b] }),
      ),
    { message: /value has duplicates/ },
    `duplicates in the right of isGTE should throw`,
  );
  t.assert(
    isGTE(
      harden({ brand: mockBrand, value: [a] }),
      harden({ brand: mockBrand, value: [a] }),
    ),
    `overlap between left and right of isGTE should not throw`,
  );
  t.assert(
    isGTE(
      harden({ brand: mockBrand, value: [a, b] }),
      harden({ brand: mockBrand, value: [b] }),
    ),
    '[a, b] is GTE [b]',
  );
  t.falsy(
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
      { message: /value has duplicates/ },
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
    { message: /value has duplicates/ },
    `duplicates in left of isEqual should throw`,
  );
  t.throws(
    () =>
      isEqual(
        harden({ brand: mockBrand, value: [a] }),
        harden({ brand: mockBrand, value: [a, a] }),
      ),
    { message: /value has duplicates/ },
    `duplicates in right of isEqual should throw`,
  );
  t.assert(
    isEqual(
      harden({ brand: mockBrand, value: [a] }),
      harden({ brand: mockBrand, value: [a] }),
    ),
    `overlap between left and right of isEqual is ok`,
  );
  t.assert(
    isEqual(
      harden({ brand: mockBrand, value: [b, a, c] }),
      harden({ brand: mockBrand, value: [a, c, b] }),
    ),
    `order doesn't matter`,
  );
  t.falsy(
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
      { message: /value has duplicates/ },
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
    { message: /value has duplicates/ },
    `duplicates in left of add should throw`,
  );
  t.throws(
    () =>
      add(
        harden({ brand: mockBrand, value: [a] }),
        harden({ brand: mockBrand, value: [b, b] }),
      ),
    { message: /value has duplicates/ },
    `duplicates in right of add should throw`,
  );
  t.throws(
    () =>
      add(
        harden({ brand: mockBrand, value: [a] }),
        harden({ brand: mockBrand, value: [a] }),
      ),
    { message: /value has duplicates/ },
    `overlap between left and right of add should throw`,
  );
  t.deepEqual(
    add(
      harden({ brand: mockBrand, value: [] }),
      harden({ brand: mockBrand, value: [b, c] }),
    ),
    harden({ brand: mockBrand, value: [b, c] }),
    `anything + identity stays same`,
  );
  t.deepEqual(
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
      { message: /value has duplicates/ },
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
    { message: /value has duplicates/ },
    `duplicates in left of subtract should throw`,
  );
  t.throws(
    () =>
      subtract(
        harden({ brand: mockBrand, value: [a] }),
        harden({ brand: mockBrand, value: [b, b] }),
      ),
    { message: /value has duplicates/ },
    `duplicates in right of subtract should throw`,
  );
  t.deepEqual(
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
    { message: /was not in left/ },
    `elements in right but not in left of subtract should throw`,
  );
  t.deepEqual(
    subtract(
      harden({ brand: mockBrand, value: [b, c] }),
      harden({ brand: mockBrand, value: [] }),
    ),
    harden({ brand: mockBrand, value: [b, c] }),
    `anything - identity stays same`,
  );
  t.deepEqual(
    subtract(
      harden({ brand: mockBrand, value: [b, c] }),
      harden({ brand: mockBrand, value: [b] }),
    ),
    harden({ brand: mockBrand, value: [c] }),
    `b, c - b is c`,
  );
  t.throws(
    () =>
      subtract(
        harden({ brand: mockBrand, value: [a, a2] }),
        harden({ brand: mockBrand, value: [b] }),
      ),
    { message: /value has duplicates/ },
    `data identity throws`,
  );

  // find
  const makeH = value => make(harden(value));
  t.deepEqual(find(makeH([a, b, c]), makeH([a])), makeH([a]), `a is found`);
  t.deepEqual(
    find(makeH([a, b, c]), makeH([{ name: 'd' }])),
    makeH([]),
    `d is not found`,
  );

  t.deepEqual(
    find(makeH([a, b, c]), makeH([{ name: 'a' }])),
    makeH([a]),
    `a is found by name only`,
  );
  t.deepEqual(
    find(makeH([a, b, c]), makeH([{ name: 'a' }, { name: 'b' }])),
    makeH([a, b]),
    `a and b are found by name only`,
  );
  if (a.name !== undefined && a.handle !== undefined) {
    t.deepEqual(
      find(
        makeH([a, b, c]),
        makeH([
          { name: 'a', handle: a.handle },
          { name: 'b', instanceHandle: b.instanceHandle },
        ]),
      ),
      makeH([a, b]),
      `a and b are found by variety of properties`,
    );
  }
};

test('setMathHelpers with basic objects', t => {
  const a = harden({ name: 'a' });
  const b = harden({ name: 'b' });
  const c = harden({ name: 'c' });

  const a2 = harden({ ...a });

  runSetMathHelpersTests(t, harden([a, b, c]), a2);
});

test('setMathHelpers with complex objects', t => {
  const a = { handle: {}, instanceHandle: {}, name: 'a' };
  const b = { handle: {}, instanceHandle: a.instanceHandle, name: 'b' };
  const c = { handle: {}, instanceHandle: {}, name: 'c' };

  const a2 = harden({ ...a });

  runSetMathHelpersTests(t, harden([a, b, c]), a2);
});

test('find with coveredCall Zoe invitations', t => {
  const { find, make } = amountMath;
  const mockTimeAuthority = {
    tick: () => {},
  };
  const mockInstallation = {
    getBundle: () => {},
  };
  const { amountMath: moolaAmountMath } = makeIssuerKit('moola');
  const { amountMath: simoleanAmountMath } = makeIssuerKit('simolean');
  const underlyingAssets = {
    UnderlyingAssets: moolaAmountMath.make(3),
  };
  const strikePrice = {
    StrikePrice: simoleanAmountMath.make(7),
  };
  const leftAmount = make(
    harden([
      {
        expirationDate: 100,
        timeAuthority: mockTimeAuthority,
        underlyingAssets,
        strikePrice,
        description: 'exerciseOption',
        handle: {},
        instance: {},
        installation: mockInstallation,
      },
    ]),
  );

  const searchAmount = make(
    harden([
      {
        expirationDate: 100,
        strikePrice,
        timeAuthority: mockTimeAuthority,
        installation: mockInstallation,
        description: 'exerciseOption',
      },
    ]),
  );

  const foundAmount = find(leftAmount, searchAmount);
  t.deepEqual(leftAmount, foundAmount);
  t.truthy(amountMath.isGTE(foundAmount, leftAmount));
});

test('find with tickets', t => {
  const { find, make } = amountMath;
  const leftAmount = make(
    harden([
      { number: 1, show: 'Les Mis' },
      { number: 2, show: 'Les Mis' },
      { number: 3, show: 'Les Mis' },
    ]),
  );

  const searchAmount = make(harden([{ number: 1 }]));

  const foundAmount = find(leftAmount, searchAmount);
  t.deepEqual(make(harden([{ number: 1, show: 'Les Mis' }])), foundAmount);
});
