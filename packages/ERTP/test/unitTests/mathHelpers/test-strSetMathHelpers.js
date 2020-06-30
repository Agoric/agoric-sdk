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

const amountMath = makeAmountMath(mockBrand, 'strSet');

test('strSetMathHelpers', t => {
  try {
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
    t.deepEquals(getMathHelpersName(), 'strSet', 'mathHelpersName is strSet');

    // make
    t.doesNotThrow(
      () => make(harden(['1'])),
      undefined,
      `['1'] is a valid string array`,
    );
    t.throws(
      () => make(4),
      /extent must be an array/,
      `4 is not a valid string array`,
    );
    t.throws(
      () => make(harden([6])),
      /must be a string/,
      `[6] is not a valid string array`,
    );
    t.throws(
      () => make('abc'),
      /extent must be an array/,
      `'abc' is not a valid string array`,
    );
    t.throws(
      () => make(harden(['a', 'a'])),
      /extent has duplicates/,
      `duplicates in make throw`,
    );

    // coerce
    t.deepEquals(
      coerce(harden({ brand: mockBrand, extent: ['1'] })),
      harden({ brand: mockBrand, extent: ['1'] }),
      `coerce({ brand, extent: ['1']}) is a valid amount`,
    );
    t.throws(
      () => coerce(harden({ brand: mockBrand, extent: [6] })),
      /must be a string/,
      `[6] is not a valid string array`,
    );
    t.throws(
      () => coerce(harden({ brand: mockBrand, extent: '6' })),
      /extent must be an array/,
      `'6' is not a valid array`,
    );
    t.throws(
      () => coerce(harden({ brand: mockBrand, extent: ['a', 'a'] })),
      /extent has duplicates/,
      `duplicates should throw`,
    );

    // getExtent
    t.deepEquals(getExtent(harden({ brand: mockBrand, extent: ['1'] })), ['1']);
    t.deepEquals(getExtent(make(harden(['1']))), ['1']);

    // getEmpty
    t.deepEquals(
      getEmpty(),
      harden({ brand: mockBrand, extent: [] }),
      `empty is []`,
    );

    t.ok(
      isEmpty(harden({ brand: mockBrand, extent: [] })),
      `isEmpty([]) is true`,
    );
    t.notOk(
      isEmpty(harden({ brand: mockBrand, extent: ['abc'] })),
      `isEmpty(['abc']) is false`,
    );
    t.throws(
      () => isEmpty(harden({ brand: mockBrand, extent: ['a', 'a'] })),
      /extent has duplicates/,
      `duplicates in isEmpty throw because coerce throws`,
    );

    // isGTE
    t.throws(
      () =>
        isGTE(
          harden({ brand: mockBrand, extent: ['a', 'a'] }),
          harden({ brand: mockBrand, extent: ['b'] }),
        ),
      `duplicates in the left of isGTE should throw`,
    );
    t.throws(
      () =>
        isGTE(
          harden({ brand: mockBrand, extent: ['a'] }),
          harden({ brand: mockBrand, extent: ['b', 'b'] }),
        ),
      `duplicates in the right of isGTE should throw`,
    );
    t.ok(
      isGTE(
        harden({ brand: mockBrand, extent: ['a'] }),
        harden({ brand: mockBrand, extent: ['a'] }),
      ),
      `overlap between left and right of isGTE should not throw`,
    );
    t.ok(
      isGTE(
        harden({ brand: mockBrand, extent: ['a', 'b'] }),
        harden({ brand: mockBrand, extent: ['a'] }),
      ),
      `['a', 'b'] is gte to ['a']`,
    );
    t.notOk(
      isGTE(
        harden({ brand: mockBrand, extent: ['a'] }),
        harden({ brand: mockBrand, extent: ['b'] }),
      ),
      `['a'] is not gte to ['b']`,
    );

    // isEqual
    t.throws(
      () =>
        isEqual(
          harden({ brand: mockBrand, extent: ['a', 'a'] }),
          harden({ brand: mockBrand, extent: ['a'] }),
        ),
      /extent has duplicates/,
      `duplicates in left of isEqual should throw`,
    );
    t.throws(
      () =>
        isEqual(
          harden({ brand: mockBrand, extent: ['a'] }),
          harden({ brand: mockBrand, extent: ['a', 'a'] }),
        ),
      /extent has duplicates/,
      `duplicates in right of isEqual should throw`,
    );
    t.ok(
      isEqual(
        harden({ brand: mockBrand, extent: ['a'] }),
        harden({ brand: mockBrand, extent: ['a'] }),
      ),
      `overlap between left and right of isEqual is ok`,
    );
    t.ok(
      isEqual(
        harden({ brand: mockBrand, extent: ['a', 'b'] }),
        harden({ brand: mockBrand, extent: ['b', 'a'] }),
      ),
      `['a', 'b'] equals ['b', 'a']`,
    );
    t.notOk(
      isEqual(
        harden({ brand: mockBrand, extent: ['a'] }),
        harden({ brand: mockBrand, extent: ['b'] }),
      ),
      `['a'] does not equal ['b']`,
    );

    // add
    t.throws(
      () =>
        add(
          harden({ brand: mockBrand, extent: ['a', 'a'] }),
          harden({ brand: mockBrand, extent: ['b'] }),
        ),
      /extent has duplicates/,
      `duplicates in left of add should throw`,
    );
    t.throws(
      () =>
        add(
          harden({ brand: mockBrand, extent: ['a'] }),
          harden({ brand: mockBrand, extent: ['b', 'b'] }),
        ),
      /extent has duplicates/,
      `duplicates in right of add should throw`,
    );
    t.throws(
      () =>
        add(
          harden({ brand: mockBrand, extent: ['a'] }),
          harden({ brand: mockBrand, extent: ['a'] }),
        ),
      /left and right have same element/,
      `overlap between left and right of add should throw`,
    );
    t.deepEquals(
      add(
        harden({ brand: mockBrand, extent: ['a'] }),
        harden({ brand: mockBrand, extent: ['b'] }),
      ),
      harden({ brand: mockBrand, extent: ['a', 'b'] }),
      `['a'] + ['b'] = ['a', 'b']`,
    );

    // subtract
    t.throws(
      () =>
        subtract(
          harden({ brand: mockBrand, extent: ['a', 'a'] }),
          harden({ brand: mockBrand, extent: ['b'] }),
        ),
      /extent has duplicates/,
      `duplicates in left of subtract should throw`,
    );
    t.throws(
      () =>
        subtract(
          harden({ brand: mockBrand, extent: ['a'] }),
          harden({ brand: mockBrand, extent: ['b', 'b'] }),
        ),
      /extent has duplicates/,
      `duplicates in right of subtract should throw`,
    );
    t.deepEquals(
      subtract(
        harden({ brand: mockBrand, extent: ['a'] }),
        harden({ brand: mockBrand, extent: ['a'] }),
      ),
      harden({ brand: mockBrand, extent: [] }),
      `overlap between left and right of subtract should not throw`,
    );
    t.throws(
      () =>
        subtract(
          harden({ brand: mockBrand, extent: ['a', 'b'] }),
          harden({ brand: mockBrand, extent: ['c'] }),
        ),
      /some of the elements in right .* were not present in left/,
      `elements in right but not in left of subtract should throw`,
    );
    t.deepEquals(
      subtract(
        harden({ brand: mockBrand, extent: ['a', 'b'] }),
        harden({ brand: mockBrand, extent: ['a'] }),
      ),
      harden({ brand: mockBrand, extent: ['b'] }),
      `['a', 'b'] - ['a'] = ['a']`,
    );
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});
