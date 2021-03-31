// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava';

import { Far } from '@agoric/marshal';
import { amountMath as m, MathKind } from '../../../src';
import { mockBrand } from './mockBrand';

// The "unit tests" for MathHelpers actually make the calls through
// AmountMath so that we can test that any duplication is handled
// correctly.

test('natMathHelpers make', t => {
  t.deepEqual(m.make(4n, mockBrand), { brand: mockBrand, value: 4n });
  t.deepEqual(m.make(4, mockBrand), { brand: mockBrand, value: 4n });
  t.throws(
    () => m.make('abc', mockBrand),
    {
      message: /value .* must be a Nat or an array/,
    },
    `'abc' is not a nat`,
  );
  t.throws(
    () => m.make(-1, mockBrand),
    { message: /value .* must be a Nat or an array/ },
    `- 1 is not a valid Nat`,
  );
});

test('natMathHelpers make no brand', t => {
  t.throws(
    () => m.make(4n),
    {
      message: /The brand "\[4n\]" doesn't look like a brand./,
    },
    `brand is required in make`,
  );
});

test('natMathHelpers coerce', t => {
  t.deepEqual(
    m.coerce({ brand: mockBrand, value: 4n }, mockBrand),
    {
      brand: mockBrand,
      value: 4n,
    },
    `coerce can take an amount`,
  );
  t.throws(
    () =>
      m.coerce(
        {
          brand: Far('otherBrand', {
            getAllegedName: () => 'somename',
            isMyIssuer: async () => false,
            getDisplayInfo: () => ({}),
          }),
          value: 4n,
        },
        mockBrand,
      ),
    {
      message: /The brand in the allegedAmount .* in 'coerce' didn't match the specified brand/,
    },
    `coerce can't take the wrong brand`,
  );
  t.throws(
    () => m.coerce(3n, mockBrand),
    {
      message: /The amount .* doesn't look like an amount. Did you pass a value instead?/,
    },
    `coerce needs a brand`,
  );
});

test('natMathHelpers coerce no brand', t => {
  t.throws(
    // @ts-ignore deliberate invalid arguments for testing
    () => m.coerce(m.make(4n, mockBrand)),
    {
      message: /The brand {"brand":"\[Alleged: brand\]","value":"\[4n\]"} doesn't look like a brand./,
    },
    `brand is required in coerce`,
  );
});

test('natMathHelpers getValue', t => {
  t.is(m.getValue(m.make(4n, mockBrand), mockBrand), 4n);
  t.is(m.getValue(m.make(4, mockBrand), mockBrand), 4n);
});

test('natMathHelpers getValue no brand', t => {
  t.throws(
    // @ts-ignore deliberate invalid arguments for testing
    () => m.getValue(m.make(4n, mockBrand)),
    {
      message: /The brand {"brand":"\[Alleged: brand\]","value":"\[4n\]"} doesn't look like a brand./,
    },
    `brand is required in getValue`,
  );
});

test('natMathHelpers makeEmpty', t => {
  const empty = m.make(0n, mockBrand);

  t.deepEqual(m.makeEmpty(mockBrand), empty, `empty is 0`);
});

test('natMathHelpers makeEmpty no brand', t => {
  t.throws(
    // @ts-ignore deliberate invalid arguments for testing
    () => m.makeEmpty(MathKind.NAT),
    {
      message: /The brand .* doesn't look like a brand./,
    },
    `make empty no brand`,
  );
});

test('natMathHelpers isEmpty', t => {
  t.assert(m.isEmpty({ brand: mockBrand, value: 0n }), `isEmpty(0) is true`);
  t.falsy(m.isEmpty({ brand: mockBrand, value: 6n }), `isEmpty(6) is false`);
  t.assert(m.isEmpty(m.make(0n, mockBrand)), `isEmpty(0) is true`);
  t.falsy(m.isEmpty(m.make(6n, mockBrand)), `isEmpty(6) is false`);
  t.throws(
    () => m.isEmpty('abc'),
    {
      message: /The amount .* doesn't look like an amount. Did you pass a value instead?/,
    },
    `isEmpty('abc') throws because it cannot be coerced`,
  );
  t.throws(
    () => m.isEmpty({ brand: mockBrand, value: 'abc' }),
    {
      message: /value .* must be a Nat or an array/,
    },
    `isEmpty('abc') throws because it cannot be coerced`,
  );
  t.throws(
    () => m.isEmpty(0n),
    {
      message: /The amount .* doesn't look like an amount. Did you pass a value instead?/,
    },
    `isEmpty(0) throws because it cannot be coerced`,
  );
});

test('natMathHelpers isGTE', t => {
  t.assert(m.isGTE(m.make(5n, mockBrand), m.make(3n, mockBrand)), `5 >= 3`);
  t.assert(m.isGTE(m.make(3n, mockBrand), m.make(3n, mockBrand)), `3 >= 3`);
  t.falsy(
    m.isGTE({ brand: mockBrand, value: 3n }, { brand: mockBrand, value: 4n }),
    `3 < 4`,
  );
});

test('natMathHelpers isGTE mixed brands', t => {
  t.throws(
    () => m.isGTE(m.make(5n, Far('otherBrand', {})), m.make(3n, mockBrand)),
    {
      message: /Brands in left .* and right .* should match but do not/,
    },
  );
});

test(`natMathHelpers isGTE - brands don't match objective brand`, t => {
  t.throws(
    () =>
      m.isGTE(
        m.make(5n, mockBrand),
        m.make(3n, mockBrand),
        Far('otherBrand', {}),
      ),
    {
      message: /amount's brand .* did not match expected brand .*/,
    },
  );
});

test('natMathHelpers isEqual', t => {
  t.assert(
    m.isEqual(m.make(4n, mockBrand), m.make(4n, mockBrand)),
    `4 equals 4`,
  );
  t.falsy(
    m.isEqual(m.make(4n, mockBrand), m.make(5n, mockBrand)),
    `4 does not equal 5`,
  );
});

test('natMathHelpers isEqual mixed brands', t => {
  t.throws(
    () => m.isEqual(m.make(4n, Far('otherBrand', {})), m.make(4n, mockBrand)),
    {
      message: /Brands in left .* and right .* should match but do not/,
    },
  );
});

test(`natMathHelpers isEqual - brands don't match objective brand`, t => {
  t.throws(
    () =>
      m.isEqual(
        m.make(4n, mockBrand),
        m.make(4n, mockBrand),
        Far('otherBrand', {}),
      ),
    {
      message: /amount's brand .* did not match expected brand .*/,
    },
  );
});

test('natMathHelpers add', t => {
  t.deepEqual(
    m.add(m.make(5n, mockBrand), m.make(9n, mockBrand)),
    m.make(14n, mockBrand),
    `5 + 9 = 14`,
  );
});

test('natMathHelpers add mixed brands', t => {
  t.throws(
    () => m.add(m.make(5n, Far('otherBrand', {})), m.make(9n, mockBrand)),
    {
      message: /Brands in left .* and right .* should match but do not/,
    },
  );
});

test(`natMathHelpers add - brands don't match objective brand`, t => {
  t.throws(
    () =>
      m.add(
        m.make(5n, mockBrand),
        m.make(9n, mockBrand),
        Far('otherBrand', {}),
      ),
    {
      message: /amount's brand .* did not match expected brand .*/,
    },
  );
});

test('natMathHelpers subtract', t => {
  t.deepEqual(
    m.subtract(m.make(6n, mockBrand), m.make(1n, mockBrand)),
    m.make(5n, mockBrand),
    `6 - 1 = 5`,
  );
});

test('natMathHelpers subtract mixed brands', t => {
  t.throws(
    () => m.subtract(m.make(6n, Far('otherBrand', {})), m.make(1n, mockBrand)),
    {
      message: /Brands in left .* and right .* should match but do not/,
    },
  );
});

test(`natMathHelpers subtract brands don't match brand`, t => {
  t.throws(
    () =>
      m.subtract(
        m.make(6n, mockBrand),
        m.make(1n, mockBrand),
        Far('otherBrand', {}),
      ),
    {
      message: /amount's brand .* did not match expected brand .*/,
    },
  );
});
