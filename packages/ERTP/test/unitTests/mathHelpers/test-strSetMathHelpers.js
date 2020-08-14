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

const amountMath = makeAmountMath(mockBrand, 'strSet');

test('strSetMathHelpers', t => {
  try {
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
    t.deepEquals(
      getAmountMathKind(),
      MathKind.STRING_SET,
      'amountMathKind is strSet',
    );

    // make
    t.doesNotThrow(
      () => make(harden(['1'])),
      undefined,
      `['1'] is a valid string array`,
    );
    t.throws(
      () => make(4),
      /value must be an array/,
      `4 is not a valid string array`,
    );
    t.throws(
      () => make(harden([6])),
      /must be a string/,
      `[6] is not a valid string array`,
    );
    t.throws(
      () => make('abc'),
      /value must be an array/,
      `'abc' is not a valid string array`,
    );
    t.throws(
      () => make(harden(['a', 'a'])),
      /value has duplicates/,
      `duplicates in make throw`,
    );

    // coerce
    t.deepEquals(
      coerce(harden({ brand: mockBrand, value: ['1'] })),
      harden({ brand: mockBrand, value: ['1'] }),
      `coerce({ brand, value: ['1']}) is a valid amount`,
    );
    t.throws(
      () => coerce(harden({ brand: mockBrand, value: [6] })),
      /must be a string/,
      `[6] is not a valid string array`,
    );
    t.throws(
      () => coerce(harden({ brand: mockBrand, value: '6' })),
      /value must be an array/,
      `'6' is not a valid array`,
    );
    t.throws(
      () => coerce(harden({ brand: mockBrand, value: ['a', 'a'] })),
      /value has duplicates/,
      `duplicates should throw`,
    );

    // getValue
    t.deepEquals(getValue(harden({ brand: mockBrand, value: ['1'] })), ['1']);
    t.deepEquals(getValue(make(harden(['1']))), ['1']);

    // getEmpty
    t.deepEquals(
      getEmpty(),
      harden({ brand: mockBrand, value: [] }),
      `empty is []`,
    );

    t.ok(
      isEmpty(harden({ brand: mockBrand, value: [] })),
      `isEmpty([]) is true`,
    );
    t.notOk(
      isEmpty(harden({ brand: mockBrand, value: ['abc'] })),
      `isEmpty(['abc']) is false`,
    );
    t.throws(
      () => isEmpty(harden({ brand: mockBrand, value: ['a', 'a'] })),
      /value has duplicates/,
      `duplicates in isEmpty throw because coerce throws`,
    );

    // isGTE
    t.throws(
      () =>
        isGTE(
          harden({ brand: mockBrand, value: ['a', 'a'] }),
          harden({ brand: mockBrand, value: ['b'] }),
        ),
      `duplicates in the left of isGTE should throw`,
    );
    t.throws(
      () =>
        isGTE(
          harden({ brand: mockBrand, value: ['a'] }),
          harden({ brand: mockBrand, value: ['b', 'b'] }),
        ),
      `duplicates in the right of isGTE should throw`,
    );
    t.ok(
      isGTE(
        harden({ brand: mockBrand, value: ['a'] }),
        harden({ brand: mockBrand, value: ['a'] }),
      ),
      `overlap between left and right of isGTE should not throw`,
    );
    t.ok(
      isGTE(
        harden({ brand: mockBrand, value: ['a', 'b'] }),
        harden({ brand: mockBrand, value: ['a'] }),
      ),
      `['a', 'b'] is gte to ['a']`,
    );
    t.notOk(
      isGTE(
        harden({ brand: mockBrand, value: ['a'] }),
        harden({ brand: mockBrand, value: ['b'] }),
      ),
      `['a'] is not gte to ['b']`,
    );

    // isEqual
    t.throws(
      () =>
        isEqual(
          harden({ brand: mockBrand, value: ['a', 'a'] }),
          harden({ brand: mockBrand, value: ['a'] }),
        ),
      /value has duplicates/,
      `duplicates in left of isEqual should throw`,
    );
    t.throws(
      () =>
        isEqual(
          harden({ brand: mockBrand, value: ['a'] }),
          harden({ brand: mockBrand, value: ['a', 'a'] }),
        ),
      /value has duplicates/,
      `duplicates in right of isEqual should throw`,
    );
    t.ok(
      isEqual(
        harden({ brand: mockBrand, value: ['a'] }),
        harden({ brand: mockBrand, value: ['a'] }),
      ),
      `overlap between left and right of isEqual is ok`,
    );
    t.ok(
      isEqual(
        harden({ brand: mockBrand, value: ['a', 'b'] }),
        harden({ brand: mockBrand, value: ['b', 'a'] }),
      ),
      `['a', 'b'] equals ['b', 'a']`,
    );
    t.notOk(
      isEqual(
        harden({ brand: mockBrand, value: ['a'] }),
        harden({ brand: mockBrand, value: ['b'] }),
      ),
      `['a'] does not equal ['b']`,
    );

    // add
    t.throws(
      () =>
        add(
          harden({ brand: mockBrand, value: ['a', 'a'] }),
          harden({ brand: mockBrand, value: ['b'] }),
        ),
      /value has duplicates/,
      `duplicates in left of add should throw`,
    );
    t.throws(
      () =>
        add(
          harden({ brand: mockBrand, value: ['a'] }),
          harden({ brand: mockBrand, value: ['b', 'b'] }),
        ),
      /value has duplicates/,
      `duplicates in right of add should throw`,
    );
    t.throws(
      () =>
        add(
          harden({ brand: mockBrand, value: ['a'] }),
          harden({ brand: mockBrand, value: ['a'] }),
        ),
      /left and right have same element/,
      `overlap between left and right of add should throw`,
    );
    t.deepEquals(
      add(
        harden({ brand: mockBrand, value: ['a'] }),
        harden({ brand: mockBrand, value: ['b'] }),
      ),
      harden({ brand: mockBrand, value: ['a', 'b'] }),
      `['a'] + ['b'] = ['a', 'b']`,
    );

    // subtract
    t.throws(
      () =>
        subtract(
          harden({ brand: mockBrand, value: ['a', 'a'] }),
          harden({ brand: mockBrand, value: ['b'] }),
        ),
      /value has duplicates/,
      `duplicates in left of subtract should throw`,
    );
    t.throws(
      () =>
        subtract(
          harden({ brand: mockBrand, value: ['a'] }),
          harden({ brand: mockBrand, value: ['b', 'b'] }),
        ),
      /value has duplicates/,
      `duplicates in right of subtract should throw`,
    );
    t.deepEquals(
      subtract(
        harden({ brand: mockBrand, value: ['a'] }),
        harden({ brand: mockBrand, value: ['a'] }),
      ),
      harden({ brand: mockBrand, value: [] }),
      `overlap between left and right of subtract should not throw`,
    );
    t.throws(
      () =>
        subtract(
          harden({ brand: mockBrand, value: ['a', 'b'] }),
          harden({ brand: mockBrand, value: ['c'] }),
        ),
      /some of the elements in right .* were not present in left/,
      `elements in right but not in left of subtract should throw`,
    );
    t.deepEquals(
      subtract(
        harden({ brand: mockBrand, value: ['a', 'b'] }),
        harden({ brand: mockBrand, value: ['a'] }),
      ),
      harden({ brand: mockBrand, value: ['b'] }),
      `['a', 'b'] - ['a'] = ['a']`,
    );
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});
