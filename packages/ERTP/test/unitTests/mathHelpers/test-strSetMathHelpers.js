// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';

import makeAmountMath from '../../../src/amountMath';

// The "unit tests" for MathHelpers actually make the calls through
// AmountMath so that we can test that any duplication is handled
// correctly.

const mockBrand = harden({
  isMyIssuer: () => false,
  allegedName: () => 'mock',
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

    // coerce - extent
    t.deepEquals(
      coerce(harden(['1'])),
      harden({ brand: mockBrand, extent: ['1'] }),
      `coerce(['1']) is a valid amount`,
    );
    t.throws(
      () => coerce(harden([6])),
      /must be a string/,
      `[6] is not a valid string array`,
    );
    t.throws(
      () => coerce(harden('6')),
      /extent must be an array/,
      `'6' is not a valid array`,
    );
    t.throws(
      () => coerce(harden(['a', 'a'])),
      /extent has duplicates/,
      `duplicates should throw`,
    );

    // coerce - amount
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

    // isEmpty actually accepts amounts or extents because internally
    // it uses coerce. Do we want this?
    t.ok(isEmpty(harden([])), `isEmpty([]) is true`);
    t.throws(
      () => isEmpty('abc'),
      /extent must be an array/,
      `isEmpty('abc') fails coercion`,
    );
    t.ok(isEmpty(make(harden([]))), `isEmpty([]) is true`);
    t.notOk(isEmpty(make(harden(['abc']))), `isEmpty(['abc']) is false`);
    t.throws(
      () => isEmpty(make(harden(['a', 'a']))),
      /extent has duplicates/,
      `duplicates in isEmpty throw because coerce throws`,
    );

    // isGTE
    t.throws(
      () => isGTE(make(harden(['a', 'a'])), make(harden(['b']))),
      `duplicates in the left of isGTE should throw`,
    );
    t.throws(
      () => isGTE(make(harden(['a'])), make(harden(['b', 'b']))),
      `duplicates in the right of isGTE should throw`,
    );
    t.ok(
      isGTE(make(harden(['a'])), make(harden(['a']))),
      `overlap between left and right of isGTE should not throw`,
    );
    t.ok(
      isGTE(make(harden(['a', 'b'])), make(harden(['a']))),
      `['a', 'b'] is gte to ['a']`,
    );
    t.notOk(
      isGTE(make(harden(['a'])), make(harden(['b']))),
      `['a'] is not gte to ['b']`,
    );

    // isEqual
    t.throws(
      () => isEqual(make(harden(['a', 'a'])), make(harden(['a']))),
      /extent has duplicates/,
      `duplicates in left of isEqual should throw`,
    );
    t.throws(
      () => isEqual(make(harden(['a'])), make(harden(['a', 'a']))),
      /extent has duplicates/,
      `duplicates in right of isEqual should throw`,
    );
    t.ok(
      isEqual(make(harden(['a'])), make(harden(['a']))),
      `overlap between left and right of isEqual is ok`,
    );
    t.ok(
      isEqual(make(harden(['a', 'b'])), make(harden(['b', 'a']))),
      `['a', 'b'] equals ['b', 'a']`,
    );
    t.notOk(
      isEqual(make(harden(['a'])), make(harden(['b']))),
      `['a'] does not equal ['b']`,
    );

    // add
    t.throws(
      () => add(make(harden(['a', 'a'])), make(harden(['b']))),
      /extent has duplicates/,
      `duplicates in left of add should throw`,
    );
    t.throws(
      () => add(make(harden(['a'])), make(harden(['b', 'b']))),
      /extent has duplicates/,
      `duplicates in right of add should throw`,
    );
    t.throws(
      () => add(make(harden(['a'])), make(harden(['a']))),
      /left and right have same element/,
      `overlap between left and right of add should throw`,
    );
    t.deepEquals(
      add(make(harden(['a'])), make(harden(['b']))),
      make(harden(['a', 'b'])),
      `['a'] + ['b'] = ['a', 'b']`,
    );

    // subtract
    t.throws(
      () => subtract(harden(['a', 'a']), harden(['b'])),
      /extent has duplicates/,
      `duplicates in left of subtract should throw`,
    );
    t.throws(
      () => subtract(harden(['a']), harden(['b', 'b'])),
      /extent has duplicates/,
      `duplicates in right of subtract should throw`,
    );
    t.deepEquals(
      subtract(make(harden(['a'])), make(harden(['a']))),
      make(harden([])),
      `overlap between left and right of subtract should not throw`,
    );
    t.throws(
      () => subtract(make(harden(['a', 'b'])), make(harden(['c']))),
      /some of the elements in right .* were not present in left/,
      `elements in right but not in left of subtract should throw`,
    );
    t.deepEquals(
      subtract(make(harden(['a', 'b'])), make(harden(['a']))),
      make(harden(['b'])),
      `['a', 'b'] - ['a'] = ['a']`,
    );
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});
