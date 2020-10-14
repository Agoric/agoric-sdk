import test from 'ava';

import { makeAmountMath, MathKind } from '../../../src';

// The "unit tests" for MathHelpers actually make the calls through
// AmountMath so that we can test that any duplication is handled
// correctly.

const bagit = strings => harden({ strings, counts: strings.map(_ => 1) });

const mockBrand = harden({
  isMyIssuer: () => false,
  getAllegedName: () => 'mock',
});

const amountMath = makeAmountMath(mockBrand, 'strBag');

test('strSetMathHelpers', t => {
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
  t.deepEqual(
    getAmountMathKind(),
    MathKind.STRING_BAG,
    'amountMathKind is strBag',
  );

  // make
  t.notThrows(
    () => make(harden(bagit(['1']))),
    `['1'] is a valid string array`,
  );
  t.throws(
    () => make(4),
    { message: /value must be an array/ },
    `4 is not a valid string array`,
  );
  t.throws(
    () => make(harden(bagit([6]))),
    { message: /must be a string/ },
    `[6] is not a valid string array`,
  );
  t.throws(
    () => make('abc'),
    { message: /value must be an array/ },
    `'abc' is not a valid string array`,
  );
  t.throws(
    () => make(harden(bagit(['a', 'a']))),
    { message: /value has duplicates/ },
    `duplicates in make throw`,
  );

  // coerce
  t.deepEqual(
    coerce(harden({ brand: mockBrand, value: bagit(['1']) })),
    harden({ brand: mockBrand, value: bagit(['1']) }),
    `coerce({ brand, value: bagit(['1'])}) is a valid amount`,
  );
  t.throws(
    () => coerce(harden({ brand: mockBrand, value: bagit([6]) })),
    { message: /must be a string/ },
    `[6] is not a valid string array`,
  );
  t.throws(
    () => coerce(harden({ brand: mockBrand, value: '6' })),
    { message: /value must be an array/ },
    `'6' is not a valid array`,
  );
  t.throws(
    () => coerce(harden({ brand: mockBrand, value: bagit(['a', 'a']) })),
    { message: /value has duplicates/ },
    `duplicates should throw`,
  );

  // getValue
  t.deepEqual(
    getValue(harden({ brand: mockBrand, value: bagit(['1']) })),
    bagit(['1']),
  );
  t.deepEqual(getValue(make(harden(bagit(['1'])))), bagit(['1']));

  // getEmpty
  t.deepEqual(
    getEmpty(),
    harden({ brand: mockBrand, value: bagit([]) }),
    `empty is { strings: [], counts: [] }`,
  );

  t.assert(
    isEmpty(harden({ brand: mockBrand, value: bagit([]) })),
    `isEmpty({ strings: [], counts: [] }) is true`,
  );
  t.falsy(
    isEmpty(harden({ brand: mockBrand, value: bagit(['abc']) })),
    `isEmpty(bagit(['abc'])) is false`,
  );
  t.throws(
    () => isEmpty(harden({ brand: mockBrand, value: bagit(['a', 'a']) })),
    { message: /value has duplicates/ },
    `duplicates in isEmpty throw because coerce throws`,
  );

  // isGTE
  t.throws(
    () =>
      isGTE(
        harden({ brand: mockBrand, value: bagit(['a', 'a']) }),
        harden({ brand: mockBrand, value: bagit(['b']) }),
      ),
    null,
    `duplicates in the left of isGTE should throw`,
  );
  t.throws(
    () =>
      isGTE(
        harden({ brand: mockBrand, value: bagit(['a']) }),
        harden({ brand: mockBrand, value: bagit(['b', 'b']) }),
      ),
    null,
    `duplicates in the right of isGTE should throw`,
  );
  t.assert(
    isGTE(
      harden({ brand: mockBrand, value: bagit(['a']) }),
      harden({ brand: mockBrand, value: bagit(['a']) }),
    ),
    `overlap between left and right of isGTE should not throw`,
  );
  t.assert(
    isGTE(
      harden({ brand: mockBrand, value: bagit(['a', 'b']) }),
      harden({ brand: mockBrand, value: bagit(['a']) }),
    ),
    `bagit(['a', 'b']) is gte to bagit(['a'])`,
  );
  t.falsy(
    isGTE(
      harden({ brand: mockBrand, value: bagit(['a']) }),
      harden({ brand: mockBrand, value: bagit(['b']) }),
    ),
    `bagit(['a']) is not gte to bagit(['b'])`,
  );

  // isEqual
  t.throws(
    () =>
      isEqual(
        harden({ brand: mockBrand, value: bagit(['a', 'a']) }),
        harden({ brand: mockBrand, value: bagit(['a']) }),
      ),
    { message: /value has duplicates/ },
    `duplicates in left of isEqual should throw`,
  );
  t.throws(
    () =>
      isEqual(
        harden({ brand: mockBrand, value: bagit(['a']) }),
        harden({ brand: mockBrand, value: bagit(['a', 'a']) }),
      ),
    { message: /value has duplicates/ },
    `duplicates in right of isEqual should throw`,
  );
  t.assert(
    isEqual(
      harden({ brand: mockBrand, value: bagit(['a']) }),
      harden({ brand: mockBrand, value: bagit(['a']) }),
    ),
    `overlap between left and right of isEqual is ok`,
  );
  t.throws(
    () =>
      isEqual(
        harden({ brand: mockBrand, value: bagit(['a', 'b']) }),
        harden({ brand: mockBrand, value: bagit(['b', 'a']) }),
      ),
    { message: /value not sorted/ },
    `unsorted list should throw`,
  );
  t.falsy(
    isEqual(
      harden({ brand: mockBrand, value: bagit(['a']) }),
      harden({ brand: mockBrand, value: bagit(['b']) }),
    ),
    `bagit(['a']) does not equal bagit(['b'])`,
  );

  // add
  t.throws(
    () =>
      add(
        harden({ brand: mockBrand, value: bagit(['a', 'a']) }),
        harden({ brand: mockBrand, value: bagit(['b']) }),
      ),
    { message: /value has duplicates/ },
    `duplicates in left of add should throw`,
  );
  t.throws(
    () =>
      add(
        harden({ brand: mockBrand, value: bagit(['a']) }),
        harden({ brand: mockBrand, value: bagit(['b', 'b']) }),
      ),
    { message: /value has duplicates/ },
    `duplicates in right of add should throw`,
  );
  t.deepEqual(
    add(
      harden({ brand: mockBrand, value: bagit(['a']) }),
      harden({ brand: mockBrand, value: bagit(['a']) }),
    ),
    harden({ brand: mockBrand, value: { strings: ['a'], counts: [2] } }),
    `bagit(['a']) + bagit(['a']) = { strings: ['a'], counts: [2] }`,
  );
  t.deepEqual(
    add(
      harden({ brand: mockBrand, value: bagit(['a']) }),
      harden({ brand: mockBrand, value: bagit(['b']) }),
    ),
    harden({ brand: mockBrand, value: bagit(['a', 'b']) }),
    `bagit(['a']) + bagit(['b']) = bagit(['a', 'b'])`,
  );

  // subtract
  t.throws(
    () =>
      subtract(
        harden({ brand: mockBrand, value: bagit(['a', 'a']) }),
        harden({ brand: mockBrand, value: bagit(['b']) }),
      ),
    { message: /value has duplicates/ },
    `duplicates in left of subtract should throw`,
  );
  t.throws(
    () =>
      subtract(
        harden({ brand: mockBrand, value: bagit(['a']) }),
        harden({ brand: mockBrand, value: bagit(['b', 'b']) }),
      ),
    { message: /value has duplicates/ },
    `duplicates in right of subtract should throw`,
  );
  t.deepEqual(
    subtract(
      harden({ brand: mockBrand, value: bagit(['a']) }),
      harden({ brand: mockBrand, value: bagit(['a']) }),
    ),
    harden({ brand: mockBrand, value: bagit([]) }),
    `overlap between left and right of subtract should not throw`,
  );
  t.throws(
    () =>
      subtract(
        harden({ brand: mockBrand, value: bagit(['a', 'b']) }),
        harden({ brand: mockBrand, value: bagit(['c']) }),
      ),
    { message: /some of the elements in right .* were not present in left/ },
    `elements in right but not in left of subtract should throw`,
  );
  t.deepEqual(
    subtract(
      harden({ brand: mockBrand, value: bagit(['a', 'b']) }),
      harden({ brand: mockBrand, value: bagit(['a']) }),
    ),
    harden({ brand: mockBrand, value: bagit(['b']) }),
    `bagit(['a', 'b']) - bagit(['a']) = bagit(['a'])`,
  );
});
