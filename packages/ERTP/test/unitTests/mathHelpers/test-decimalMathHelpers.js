import test from 'ava';

import { makeAmountMath, MathKind } from '../../../src';

// The "unit tests" for MathHelpers actually make the calls through
// AmountMath so that we can test that any duplication is handled
// correctly.

const mockBrand = harden({
  isMyIssuer: () => false,
  getAllegedName: () => 'mock',
});

test('decimalMathHelpers 3 places', t => {
  const amountMath3 = makeAmountMath(mockBrand, MathKind.DECIMAL(3));
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
  } = amountMath3;

  // getBrand
  t.deepEqual(getBrand(), mockBrand, 'brand is brand');

  // getAmountMathKind
  t.deepEqual(getAmountMathKind(), 'decimal.3', 'amountMathKind is decimal.3');

  // make
  t.deepEqual(make('4'), { brand: mockBrand, value: '4' });
  t.throws(
    () => make(4),
    { instanceOf: Error, message: /must be a string/ },
    `4 is not a decimal`,
  );
  t.throws(
    () => make('abc'),
    {
      instanceOf: Error,
      message: /must be a non-negative decimal number/,
    },
    `'abc' is not a decimal`,
  );
  t.throws(
    () => make('-1'),
    {
      instanceOf: Error,
      message: /must be a non-negative decimal number/,
    },
    `-1 is not a valid decimal`,
  );
  t.throws(
    () => make('4.000003'),
    {
      instanceOf: Error,
      message: /exceeds 3 decimal places/,
    },
    `4.000003 exceeds 3 places, not a valid decimal`,
  );

  // coerce
  t.deepEqual(
    coerce(harden({ brand: mockBrand, value: '04.010000' })),
    {
      brand: mockBrand,
      value: '4.01',
    },
    `coerce can take an amount`,
  );
  t.deepEqual(
    coerce(harden({ brand: mockBrand, value: '4.000' })),
    {
      brand: mockBrand,
      value: '4',
    },
    `coerce can take an amount`,
  );
  t.throws(
    () =>
      coerce(harden({ brand: { getAllegedName: () => 'somename' }, value: 4 })),
    {
      message: /the brand in the allegedAmount in 'coerce' didn't match the amountMath brand/,
    },
    `coerce can't take the wrong brand`,
  );
  t.throws(
    () => coerce(3),
    { message: /alleged brand is undefined/ },
    `coerce needs a brand`,
  );

  // getValue
  t.is(getValue(make('4.01')), '4.01');

  // getEmpty
  t.deepEqual(getEmpty(), make('0000.0'), `empty is 0`);

  // isEmpty
  t.assert(isEmpty({ brand: mockBrand, value: '0' }), `isEmpty('0') is true`);
  t.falsy(isEmpty({ brand: mockBrand, value: '6' }), `isEmpty('6') is false`);
  t.assert(isEmpty(make('0')), `isEmpty('0') is true`);
  t.falsy(isEmpty(make('6')), `isEmpty('6') is false`);
  t.throws(
    () => isEmpty('abc'),
    { message: /alleged brand is undefined/ },
    `isEmpty('abc') throws because it cannot be coerced`,
  );
  t.throws(
    () => isEmpty({ brand: mockBrand, value: 'abc' }),
    {
      instanceOf: Error,
      message: /must be a non-negative decimal number/,
    },
    `isEmpty('abc') throws because it cannot be coerced`,
  );
  t.throws(
    () => isEmpty('0'),
    { message: /alleged brand is undefined/ },
    `isEmpty('0') throws because it cannot be coerced`,
  );

  // isGTE
  t.assert(isGTE(make('5'), make('3')), `5 >= 3`);
  t.assert(isGTE(make('3'), make('3')), `3 >= 3`);
  t.falsy(
    isGTE({ brand: mockBrand, value: '3' }, { brand: mockBrand, value: '4' }),
    `3 < 4`,
  );

  // isEqual
  t.assert(isEqual(make('4'), make('4')), `4 equals 4`);
  t.falsy(isEqual(make('4'), make('5')), `4 does not equal 5`);

  // add
  t.deepEqual(
    add(make('5.049'), make('9.151')),
    make('14.2'),
    `5.049 + 9.151 = 14.2`,
  );

  // subtract
  t.deepEqual(
    subtract(make('6'), make('1.002')),
    make('4.998'),
    `6 - 1.002 = 4.998`,
  );

  // Really big numbers.
  t.deepEqual(
    add(
      make('84293682946384907923745918986979894805.125000'),
      make('986982468964286942864928624946286249842692482469849866.205'),
    ),
    make('986982468964287027158611571331194173588611469449744671.33'),
    `adding two big numbers`,
  );
});
