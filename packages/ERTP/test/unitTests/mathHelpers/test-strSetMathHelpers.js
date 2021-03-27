// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava';

import { amountMath as m, MathKind } from '../../../src';
import { mockBrand } from './mockBrand';

// The "unit tests" for MathHelpers actually make the calls through
// AmountMath so that we can test that any duplication is handled
// correctly.

test('set with strings make', t => {
  t.notThrows(() => m.make(['1'], mockBrand), `['1'] is a valid string array`);
  t.notThrows(
    () => m.make([6], mockBrand),
    `[6] is a valid set even though it isn't a string`,
  );
  t.throws(
    () => m.make('abc', mockBrand),
    { message: /value .* must be a Nat or an array/ },
    `'abc' is not a valid string array`,
  );
  t.throws(
    () => m.make(['a', 'a'], mockBrand),
    { message: /value has duplicates/ },
    `duplicates in make throw`,
  );
});

test('set with strings coerce', t => {
  t.deepEqual(
    m.coerce({ brand: mockBrand, value: ['1'] }, mockBrand),
    { brand: mockBrand, value: ['1'] },
    `coerce({ brand, value: ['1']}) is a valid amount`,
  );
  t.notThrows(
    () => m.coerce({ brand: mockBrand, value: [6] }, mockBrand),
    `[6] is a valid set`,
  );
  t.throws(
    () => m.coerce({ brand: mockBrand, value: '6' }, mockBrand),
    { message: /value .* must be a Nat or an array/ },
    `'6' is not a valid array`,
  );
  t.throws(
    () => m.coerce({ brand: mockBrand, value: ['a', 'a'] }, mockBrand),
    { message: /value has duplicates/ },
    `duplicates should throw`,
  );
});

test('set with strings getValue', t => {
  t.deepEqual(m.getValue({ brand: mockBrand, value: ['1'] }, mockBrand), ['1']);
  t.deepEqual(m.getValue(m.make(['1'], mockBrand), mockBrand), ['1']);
});

test('set with strings makeEmpty', t => {
  t.deepEqual(
    m.makeEmpty(mockBrand, MathKind.SET),
    { brand: mockBrand, value: [] },
    `empty is []`,
  );

  t.assert(m.isEmpty({ brand: mockBrand, value: [] }), `isEmpty([]) is true`);
  t.falsy(
    m.isEmpty({ brand: mockBrand, value: ['abc'] }),
    `isEmpty(['abc']) is false`,
  );
  t.throws(
    () => m.isEmpty({ brand: mockBrand, value: ['a', 'a'] }),
    { message: /value has duplicates: .* and .*/ },
    `duplicates in isEmpty throw`,
  );
});

test('set with strings isGTE', t => {
  t.throws(
    () =>
      m.isGTE(
        { brand: mockBrand, value: ['a', 'a'] },
        { brand: mockBrand, value: ['b'] },
      ),
    null,
    `duplicates in the left of isGTE should throw`,
  );
  t.throws(
    () =>
      m.isGTE(
        { brand: mockBrand, value: ['a'] },
        { brand: mockBrand, value: ['b', 'b'] },
      ),
    null,
    `duplicates in the right of isGTE should throw`,
  );
  t.assert(
    m.isGTE(
      { brand: mockBrand, value: ['a'] },
      { brand: mockBrand, value: ['a'] },
    ),
    `overlap between left and right of isGTE should not throw`,
  );
  t.assert(
    m.isGTE(
      { brand: mockBrand, value: ['a', 'b'] },
      { brand: mockBrand, value: ['a'] },
    ),
    `['a', 'b'] is gte to ['a']`,
  );
  t.falsy(
    m.isGTE(
      { brand: mockBrand, value: ['a'] },
      { brand: mockBrand, value: ['b'] },
    ),
    `['a'] is not gte to ['b']`,
  );
});

test('set with strings isEqual', t => {
  t.throws(
    () =>
      m.isEqual(
        { brand: mockBrand, value: ['a', 'a'] },
        { brand: mockBrand, value: ['a'] },
      ),
    { message: /value has duplicates/ },
    `duplicates in left of isEqual should throw`,
  );
  t.throws(
    () =>
      m.isEqual(
        { brand: mockBrand, value: ['a'] },
        { brand: mockBrand, value: ['a', 'a'] },
      ),
    { message: /value has duplicates/ },
    `duplicates in right of isEqual should throw`,
  );
  t.assert(
    m.isEqual(
      { brand: mockBrand, value: ['a'] },
      { brand: mockBrand, value: ['a'] },
    ),
    `overlap between left and right of isEqual is ok`,
  );
  t.assert(
    m.isEqual(
      { brand: mockBrand, value: ['a', 'b'] },
      { brand: mockBrand, value: ['b', 'a'] },
    ),
    `['a', 'b'] equals ['b', 'a']`,
  );
  t.falsy(
    m.isEqual(
      { brand: mockBrand, value: ['a'] },
      { brand: mockBrand, value: ['b'] },
    ),
    `['a'] does not equal ['b']`,
  );
});

test('set with strings add', t => {
  t.throws(
    () =>
      m.add(
        { brand: mockBrand, value: ['a', 'a'] },
        { brand: mockBrand, value: ['b'] },
      ),
    { message: /value has duplicates/ },
    `duplicates in left of add should throw`,
  );
  t.throws(
    () =>
      m.add(
        { brand: mockBrand, value: ['a'] },
        { brand: mockBrand, value: ['b', 'b'] },
      ),
    { message: /value has duplicates/ },
    `duplicates in right of add should throw`,
  );
  t.throws(
    () =>
      m.add(
        { brand: mockBrand, value: ['a'] },
        { brand: mockBrand, value: ['a'] },
      ),
    { message: /value has duplicates: .* and .*/ },
    `overlap between left and right of add should throw`,
  );
  t.deepEqual(
    m.add(
      { brand: mockBrand, value: ['a'] },
      { brand: mockBrand, value: ['b'] },
    ),
    { brand: mockBrand, value: ['a', 'b'] },
    `['a'] + ['b'] = ['a', 'b']`,
  );
});

test('set with strings subtract', t => {
  t.throws(
    () =>
      m.subtract(
        { brand: mockBrand, value: ['a', 'a'] },
        { brand: mockBrand, value: ['b'] },
      ),
    { message: /value has duplicates/ },
    `duplicates in left of subtract should throw`,
  );
  t.throws(
    () =>
      m.subtract(
        { brand: mockBrand, value: ['a'] },
        { brand: mockBrand, value: ['b', 'b'] },
      ),
    { message: /value has duplicates/ },
    `duplicates in right of subtract should throw`,
  );
  t.deepEqual(
    m.subtract(
      { brand: mockBrand, value: ['a'] },
      { brand: mockBrand, value: ['a'] },
    ),
    { brand: mockBrand, value: [] },
    `overlap between left and right of subtract should not throw`,
  );
  t.throws(
    () =>
      m.subtract(
        { brand: mockBrand, value: ['a', 'b'] },
        { brand: mockBrand, value: ['c'] },
      ),
    { message: /right element .* was not in left/ },
    `elements in right but not in left of subtract should throw`,
  );
  t.deepEqual(
    m.subtract(
      { brand: mockBrand, value: ['a', 'b'] },
      { brand: mockBrand, value: ['a'] },
    ),
    { brand: mockBrand, value: ['b'] },
    `['a', 'b'] - ['a'] = ['a']`,
  );
});
