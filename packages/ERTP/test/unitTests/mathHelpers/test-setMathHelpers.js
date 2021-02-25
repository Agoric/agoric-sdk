import test from 'ava';
import { Far, Data } from '@agoric/marshal';
import { makeAmountMath, MathKind } from '../../../src';

// The "unit tests" for MathHelpers actually make the calls through
// AmountMath so that we can test that any duplication is handled
// correctly.

const mockBrand = Far('brand', {
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
  t.deepEqual(
    make(harden(['a', 'b'])),
    { brand: mockBrand, value: ['a', 'b'] },
    'anything comparable is a valid element',
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
    coerce(Data({ brand: mockBrand, value: [a] })),
    Data({ brand: mockBrand, value: [a] }),
    `[a] is a valid set`,
  );
  t.deepEqual(
    coerce(Data({ brand: mockBrand, value: [a, b] })),
    Data({ brand: mockBrand, value: [a, b] }),
    `[a, b] is a valid set`,
  );
  t.deepEqual(
    coerce(Data({ brand: mockBrand, value: [] })),
    Data({ brand: mockBrand, value: [] }),
    `[] is a valid set`,
  );
  t.throws(
    () => coerce(make(harden([a, a]))),
    { message: /value has duplicates/ },
    `duplicates in coerce should throw`,
  );
  t.deepEqual(
    coerce(make(harden(['a', 'b']))),
    { brand: mockBrand, value: ['a', 'b'] },
    'anything comparable is a valid element',
  );
  t.throws(
    () => coerce(Data({ brand: mockBrand, value: 'a' })),
    { message: /list must be an array/ },
    'strings are not valid',
  );
  if (a2 !== undefined) {
    t.throws(
      () => coerce(Data({ brand: mockBrand, value: [a, a2] })),
      { message: /value has duplicates/ },
      `data identity throws`,
    );
  }

  // getValue
  t.deepEqual(
    getValue(Data({ brand: mockBrand, value: [a] })),
    [a],
    `getValue of make([a]) is [a]`,
  );

  // getEmpty
  t.deepEqual(getEmpty(), Data({ brand: mockBrand, value: [] }), `empty is []`);

  // isEmpty
  t.assert(isEmpty(make(harden([]))), `isEmpty([]) is true`);
  t.throws(
    () => isEmpty(Data({ brand: mockBrand, value: Data({}) })),
    { message: /list must be an array/ },
    `isEmpty({}) throws`,
  );
  t.falsy(isEmpty(make(harden(['abc']))), `isEmpty(['abc']) is false`);
  t.falsy(isEmpty(make(harden([a]))), `isEmpty([a]) is false`);
  t.throws(
    () => isEmpty(Data({ brand: mockBrand, value: [a, a] })),
    { message: /value has duplicates/ },
    `duplicates in value in isEmpty throw because of coercion`,
  );
  t.assert(isEmpty(make(harden([]))), `isEmpty([]) is true`);
  t.falsy(isEmpty(make(harden(['abc']))), `isEmpty(['abc']) is false`);
  t.falsy(isEmpty(make(harden([a]))), `isEmpty([a]) is false`);
  if (a2 !== undefined) {
    t.throws(
      () => isEmpty(Data({ brand: mockBrand, value: [a, a2] })),
      { message: /value has duplicates/ },
      `data identity throws`,
    );
  }

  // isGTE
  t.throws(
    () =>
      isGTE(
        Data({ brand: mockBrand, value: [a, a] }),
        Data({ brand: mockBrand, value: [b] }),
      ),
    { message: /value has duplicates/ },
    `duplicates in the left of isGTE should throw`,
  );
  t.throws(
    () =>
      isGTE(
        Data({ brand: mockBrand, value: [a] }),
        Data({ brand: mockBrand, value: [b, b] }),
      ),
    { message: /value has duplicates/ },
    `duplicates in the right of isGTE should throw`,
  );
  t.assert(
    isGTE(
      Data({ brand: mockBrand, value: [a] }),
      Data({ brand: mockBrand, value: [a] }),
    ),
    `overlap between left and right of isGTE should not throw`,
  );
  t.assert(
    isGTE(
      Data({ brand: mockBrand, value: [a, b] }),
      Data({ brand: mockBrand, value: [b] }),
    ),
    '[a, b] is GTE [b]',
  );
  t.falsy(
    isGTE(
      Data({ brand: mockBrand, value: [b] }),
      Data({ brand: mockBrand, value: [b, a] }),
    ),
    '[b] does not include [b, a]',
  );
  if (a2 !== undefined) {
    t.throws(
      () =>
        isGTE(
          Data({ brand: mockBrand, value: [a, a2] }),
          Data({ brand: mockBrand, value: [b] }),
        ),
      { message: /value has duplicates/ },
      `data identity throws`,
    );
  }

  // isEqual
  t.throws(
    () =>
      isEqual(
        Data({ brand: mockBrand, value: [a, a] }),
        Data({ brand: mockBrand, value: [a] }),
      ),
    { message: /value has duplicates/ },
    `duplicates in left of isEqual should throw`,
  );
  t.throws(
    () =>
      isEqual(
        Data({ brand: mockBrand, value: [a] }),
        Data({ brand: mockBrand, value: [a, a] }),
      ),
    { message: /value has duplicates/ },
    `duplicates in right of isEqual should throw`,
  );
  t.assert(
    isEqual(
      Data({ brand: mockBrand, value: [a] }),
      Data({ brand: mockBrand, value: [a] }),
    ),
    `overlap between left and right of isEqual is ok`,
  );
  t.assert(
    isEqual(
      Data({ brand: mockBrand, value: [b, a, c] }),
      Data({ brand: mockBrand, value: [a, c, b] }),
    ),
    `order doesn't matter`,
  );
  t.falsy(
    isEqual(
      Data({ brand: mockBrand, value: [b, c] }),
      Data({ brand: mockBrand, value: [b, a] }),
    ),
    `not equal`,
  );
  if (a2 !== undefined) {
    t.throws(
      () =>
        isEqual(
          Data({ brand: mockBrand, value: [a, a2] }),
          Data({ brand: mockBrand, value: [a] }),
        ),
      { message: /value has duplicates/ },
      `data identity throws`,
    );
  }

  // add
  t.throws(
    () =>
      add(
        Data({ brand: mockBrand, value: [a, a] }),
        Data({ brand: mockBrand, value: [b] }),
      ),
    { message: /value has duplicates/ },
    `duplicates in left of add should throw`,
  );
  t.throws(
    () =>
      add(
        Data({ brand: mockBrand, value: [a] }),
        Data({ brand: mockBrand, value: [b, b] }),
      ),
    { message: /value has duplicates/ },
    `duplicates in right of add should throw`,
  );
  t.throws(
    () =>
      add(
        Data({ brand: mockBrand, value: [a] }),
        Data({ brand: mockBrand, value: [a] }),
      ),
    { message: /value has duplicates/ },
    `overlap between left and right of add should throw`,
  );
  t.deepEqual(
    add(
      Data({ brand: mockBrand, value: [] }),
      Data({ brand: mockBrand, value: [b, c] }),
    ),
    Data({ brand: mockBrand, value: [b, c] }),
    `anything + identity stays same`,
  );
  t.deepEqual(
    add(
      Data({ brand: mockBrand, value: [b, c] }),
      Data({ brand: mockBrand, value: [] }),
    ),
    Data({ brand: mockBrand, value: [b, c] }),
    `anything + identity stays same`,
  );
  if (a2 !== undefined) {
    t.throws(
      () =>
        add(
          Data({ brand: mockBrand, value: [a, a2] }),
          Data({ brand: mockBrand, value: [b] }),
        ),
      { message: /value has duplicates/ },
      `data identity throws`,
    );
  }

  // subtract
  t.throws(
    () =>
      subtract(
        Data({ brand: mockBrand, value: [a, a] }),
        Data({ brand: mockBrand, value: [b] }),
      ),
    { message: /value has duplicates/ },
    `duplicates in left of subtract should throw`,
  );
  t.throws(
    () =>
      subtract(
        Data({ brand: mockBrand, value: [a] }),
        Data({ brand: mockBrand, value: [b, b] }),
      ),
    { message: /value has duplicates/ },
    `duplicates in right of subtract should throw`,
  );
  t.deepEqual(
    subtract(
      Data({ brand: mockBrand, value: [a] }),
      Data({ brand: mockBrand, value: [a] }),
    ),
    Data({ brand: mockBrand, value: [] }),
    `overlap between left and right of subtract should not throw`,
  );
  t.throws(
    () =>
      subtract(
        Data({ brand: mockBrand, value: [a, b] }),
        Data({ brand: mockBrand, value: [c] }),
      ),
    { message: /was not in left/ },
    `elements in right but not in left of subtract should throw`,
  );
  t.deepEqual(
    subtract(
      Data({ brand: mockBrand, value: [b, c] }),
      Data({ brand: mockBrand, value: [] }),
    ),
    Data({ brand: mockBrand, value: [b, c] }),
    `anything - identity stays same`,
  );
  t.deepEqual(
    subtract(
      Data({ brand: mockBrand, value: [b, c] }),
      Data({ brand: mockBrand, value: [b] }),
    ),
    Data({ brand: mockBrand, value: [c] }),
    `b, c - b is c`,
  );
  if (a2 !== undefined) {
    t.throws(
      () =>
        subtract(
          Data({ brand: mockBrand, value: [a, a2] }),
          Data({ brand: mockBrand, value: [b] }),
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

  runSetMathHelpersTests(t, harden([a, b, c]));
});

test('setMathHelpers with basic objects', t => {
  const a = Data({ name: 'a' });
  const b = Data({ name: 'b' });
  const c = Data({ name: 'c' });

  const a2 = Data({ ...a });

  runSetMathHelpersTests(t, harden([a, b, c]), a2);
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

  const a2 = Data({ ...a });

  runSetMathHelpersTests(t, harden([a, b, c]), a2);
});
