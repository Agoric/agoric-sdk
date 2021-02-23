import test from 'ava';

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
  t.deepEqual(getAmountMathKind(), MathKind.NAT, 'amountMathKind is nat');

  // make
  t.deepEqual(make(4), { brand: mockBrand, value: 4n });
  t.throws(
    () => make('abc'),
    {
      instanceOf: TypeError,
      message: 'abc is a string but must be a bigint or a number',
    },
    `'abc' is not a nat`,
  );
  t.throws(
    () => make(-1),
    { instanceOf: RangeError, message: '-1 is negative' },
    `- 1 is not a valid Nat`,
  );

  // coerce
  t.deepEqual(
    coerce(harden({ brand: mockBrand, value: 4 })),
    {
      brand: mockBrand,
      value: 4n,
    },
    `coerce can take an amount`,
  );
  t.throws(
    () =>
      coerce(
        harden({ brand: { getAllegedName: () => 'somename' }, value: 4n }),
      ),
    {
      message: /The brand in the allegedAmount .* in 'coerce' didn't match the amountMath brand/,
    },
    `coerce can't take the wrong brand`,
  );
  t.throws(
    () => coerce(3),
    { message: /The brand in allegedAmount .* is undefined/ },
    `coerce needs a brand`,
  );

  // getValue
  t.is(getValue(make(4)), 4n);

  // getEmpty
  t.deepEqual(getEmpty(), make(0), `empty is 0`);

  // isEmpty
  t.assert(isEmpty({ brand: mockBrand, value: 0n }), `isEmpty(0) is true`);
  t.falsy(isEmpty({ brand: mockBrand, value: 6n }), `isEmpty(6) is false`);
  t.assert(isEmpty(make(0)), `isEmpty(0) is true`);
  t.falsy(isEmpty(make(6)), `isEmpty(6) is false`);
  t.throws(
    () => isEmpty('abc'),
    { message: /The brand in allegedAmount .* is undefined/ },
    `isEmpty('abc') throws because it cannot be coerced`,
  );
  t.throws(
    () => isEmpty({ brand: mockBrand, value: 'abc' }),
    {
      instanceOf: TypeError,
      message: 'abc is a string but must be a bigint or a number',
    },
    `isEmpty('abc') throws because it cannot be coerced`,
  );
  t.throws(
    () => isEmpty(0),
    { message: /The brand in allegedAmount .* is undefined/ },
    `isEmpty(0) throws because it cannot be coerced`,
  );

  // isGTE
  t.assert(isGTE(make(5), make(3)), `5 >= 3`);
  t.assert(isGTE(make(3), make(3)), `3 >= 3`);
  t.falsy(
    isGTE({ brand: mockBrand, value: 3 }, { brand: mockBrand, value: 4 }),
    `3 < 4`,
  );

  // isEqual
  t.assert(isEqual(make(4), make(4)), `4 equals 4`);
  t.falsy(isEqual(make(4), make(5)), `4 does not equal 5`);

  // add
  t.deepEqual(add(make(5), make(9)), make(14), `5 + 9 = 14`);

  // subtract
  t.deepEqual(subtract(make(6), make(1)), make(5), `6 - 1 = 5`);
});
