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

const amountMath = makeAmountMath(mockBrand, MathKind.NAT);

test('natMathHelpers', t => {
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
    t.deepEquals(getAmountMathKind(), MathKind.NAT, 'amountMathKind is nat');

    // make
    t.deepEquals(make(4), { brand: mockBrand, value: 4 });
    t.throws(
      () => make('abc'),
      /RangeError: not a safe integer/,
      `'abc' is not a nat`,
    );
    t.throws(() => make(-1), /RangeError: negative/, `- 1 is not a valid Nat`);

    // coerce
    t.deepEquals(
      coerce(harden({ brand: mockBrand, value: 4 })),
      {
        brand: mockBrand,
        value: 4,
      },
      `coerce can take an amount`,
    );
    t.throws(
      () =>
        coerce(
          harden({ brand: { getAllegedName: () => 'somename' }, value: 4 }),
        ),
      /the brand in the allegedAmount in 'coerce' didn't match the amountMath brand/,
      `coerce can't take the wrong brand`,
    );
    t.throws(
      () => coerce(3),
      /alleged brand is undefined/,
      `coerce needs a brand`,
    );

    // getValue
    t.equals(getValue(make(4)), 4);

    // getEmpty
    t.deepEquals(getEmpty(), make(0), `empty is 0`);

    // isEmpty
    t.ok(isEmpty({ brand: mockBrand, value: 0 }), `isEmpty(0) is true`);
    t.notOk(isEmpty({ brand: mockBrand, value: 6 }), `isEmpty(6) is false`);
    t.ok(isEmpty(make(0)), `isEmpty(0) is true`);
    t.notOk(isEmpty(make(6)), `isEmpty(6) is false`);
    t.throws(
      () => isEmpty('abc'),
      /alleged brand is undefined/,
      `isEmpty('abc') throws because it cannot be coerced`,
    );
    t.throws(
      () => isEmpty({ brand: mockBrand, value: 'abc' }),
      /RangeError: not a safe integer/,
      `isEmpty('abc') throws because it cannot be coerced`,
    );
    t.throws(
      () => isEmpty(0),
      /alleged brand is undefined/,
      `isEmpty(0) throws because it cannot be coerced`,
    );

    // isGTE
    t.ok(isGTE(make(5), make(3)), `5 >= 3`);
    t.ok(isGTE(make(3), make(3)), `3 >= 3`);
    t.notOk(
      isGTE({ brand: mockBrand, value: 3 }, { brand: mockBrand, value: 4 }),
      `3 < 4`,
    );

    // isEqual
    t.ok(isEqual(make(4), make(4)), `4 equals 4`);
    t.notOk(isEqual(make(4), make(5)), `4 does not equal 5`);

    // add
    t.deepEquals(add(make(5), make(9)), make(14), `5 + 9 = 14`);

    // subtract
    t.deepEquals(subtract(make(6), make(1)), make(5), `6 - 1 = 5`);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});
