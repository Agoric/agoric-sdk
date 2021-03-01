// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';

import { amountMath, MathKind } from '../../../src';
import { mockBrand } from './mockBrand';

// The "unit tests" for MathHelpers actually make the calls through
// AmountMath so that we can test that any duplication is handled
// correctly.

test('natMathHelpers', t => {
  const {
    make,
    coerce,
    getValue,
    makeEmpty,
    isEmpty,
    isGTE,
    isEqual,
    add,
    subtract,
  } = amountMath;

  // make
  t.deepEqual(make(4n, mockBrand), { brand: mockBrand, value: 4n });
  t.throws(
    () => make('abc', mockBrand),
    {
      message: 'value (a string) must be a Nat or an array',
    },
    `'abc' is not a nat`,
  );
  t.throws(
    () => make(-1, mockBrand),
    { message: 'value (a number) must be a Nat or an array' },
    `- 1 is not a valid Nat`,
  );

  // coerce
  t.deepEqual(
    coerce(harden({ brand: mockBrand, value: 4n }), mockBrand),
    {
      brand: mockBrand,
      value: 4n,
    },
    `coerce can take an amount`,
  );
  t.throws(
    () =>
      coerce(
        harden({
          brand: {
            getAllegedName: () => 'somename',
            isMyIssuer: async () => false,
            getDisplayInfo: () => ({}),
          },
          value: 4n,
        }),
        mockBrand,
      ),
    {
      message: /The brand in the allegedAmount .* in 'coerce' didn't match the specified brand/,
    },
    `coerce can't take the wrong brand`,
  );
  t.throws(
    () => coerce(3n, mockBrand),
    {
      message: `The brand in amount (a bigint) doesn\'t look like a brand. Did you pass a value rather than an amount?`,
    },
    `coerce needs a brand`,
  );

  // getValue
  t.is(getValue(make(4n, mockBrand), mockBrand), 4n);

  const empty = make(0n, mockBrand);

  // makeEmpty
  t.deepEqual(makeEmpty(MathKind.NAT, mockBrand), empty, `empty is 0`);

  // isEmpty
  t.assert(isEmpty({ brand: mockBrand, value: 0n }), `isEmpty(0) is true`);
  t.falsy(isEmpty({ brand: mockBrand, value: 6n }), `isEmpty(6) is false`);
  t.assert(isEmpty(make(0n, mockBrand)), `isEmpty(0) is true`);
  t.falsy(isEmpty(make(6n, mockBrand)), `isEmpty(6) is false`);
  t.throws(
    () => isEmpty('abc'),
    {
      message: `The brand in amount (a string) doesn\'t look like a brand. Did you pass a value rather than an amount?`,
    },
    `isEmpty('abc') throws because it cannot be coerced`,
  );
  t.throws(
    () => isEmpty({ brand: mockBrand, value: 'abc' }),
    {
      message: 'value (a string) must be a Nat or an array',
    },
    `isEmpty('abc') throws because it cannot be coerced`,
  );
  t.throws(
    () => isEmpty(0n),
    {
      message: `The brand in amount (a bigint) doesn\'t look like a brand. Did you pass a value rather than an amount?`,
    },
    `isEmpty(0) throws because it cannot be coerced`,
  );

  // isGTE
  t.assert(isGTE(make(5n, mockBrand), make(3n, mockBrand)), `5 >= 3`);
  t.assert(isGTE(make(3n, mockBrand), make(3n, mockBrand)), `3 >= 3`);
  t.falsy(
    isGTE({ brand: mockBrand, value: 3n }, { brand: mockBrand, value: 4n }),
    `3 < 4`,
  );

  // isEqual
  t.assert(isEqual(make(4n, mockBrand), make(4n, mockBrand)), `4 equals 4`);
  t.falsy(
    isEqual(make(4n, mockBrand), make(5n, mockBrand)),
    `4 does not equal 5`,
  );

  // add
  t.deepEqual(
    add(make(5n, mockBrand), make(9n, mockBrand)),
    make(14n, mockBrand),
    `5 + 9 = 14`,
  );

  // subtract
  t.deepEqual(
    subtract(make(6n, mockBrand), make(1n, mockBrand)),
    make(5n, mockBrand),
    `6 - 1 = 5`,
  );
});
