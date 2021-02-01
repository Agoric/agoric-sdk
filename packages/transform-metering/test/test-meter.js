/* eslint-disable no-await-in-loop */
import test from 'ava';

import { makeMeter } from '../src/index';
import * as c from '../src/constants';

const testAllExhausted = (t, meter, desc) => {
  t.throws(
    () => meter[c.METER_ALLOCATE](),
    { instanceOf: RangeError },
    `${desc} stays exhausted for allocate`,
  );
  t.throws(
    () => meter[c.METER_COMPUTE](),
    { instanceOf: RangeError },
    `${desc} stays exhausted for compute`,
  );
  t.throws(
    () => meter[c.METER_ENTER](),
    { instanceOf: RangeError },
    `${desc} stays exhausted for enter`,
  );
  t.throws(
    () => meter[c.METER_LEAVE](),
    { instanceOf: RangeError },
    `${desc} stays exhausted for leave`,
  );
};

test('meter running', async t => {
  const { meter } = makeMeter({ budgetCompute: 10 });
  meter[c.METER_COMPUTE](9);
  t.throws(
    () => meter[c.METER_COMPUTE](),
    { instanceOf: RangeError },
    'compute exhausted',
  );
  testAllExhausted(t, meter, 'compute meter');

  const { meter: meter2 } = makeMeter({ budgetAllocate: 10 });
  meter2[c.METER_ALLOCATE](new Array(8));
  t.throws(
    () => meter2[c.METER_ALLOCATE]([]),
    { instanceOf: RangeError },
    'array allocate exhausted',
  );
  testAllExhausted(t, meter2, 'allocate meter');

  const { meter: meter3 } = makeMeter({ budgetStack: 10 });
  for (let i = 0; i < 9; i += 1) {
    meter3[c.METER_ENTER]();
  }
  for (let i = 0; i < 9; i += 1) {
    meter3[c.METER_LEAVE]();
  }
  for (let i = 0; i < 9; i += 1) {
    meter3[c.METER_ENTER]();
  }
  t.throws(
    () => meter3[c.METER_ENTER](),
    { instanceOf: RangeError },
    'stack exhausted',
  );
  testAllExhausted(t, meter3, 'stack meter');
});

test('makeMeter', async t => {
  t.throws(
    () => makeMeter({ budgetAllocate: true, budgetCombined: null }),
    { instanceOf: TypeError },
    'missing combined allocate',
  );

  t.throws(
    () => makeMeter({ budgetCompute: true, budgetCombined: null }),
    { instanceOf: TypeError },
    'missing combined compute',
  );

  t.throws(
    () => makeMeter({ budgetStack: true, budgetCombined: null }),
    { instanceOf: TypeError },
    'missing combined stack',
  );

  // Try a combined meter.
  const { meter } = makeMeter({
    budgetAllocate: true,
    budgetCompute: true,
    budgetStack: true,
    budgetCombined: 10,
  });
  t.throws(
    () => {
      meter[c.METER_ALLOCATE]([2, 3, 4]);
      meter[c.METER_COMPUTE](4);
      meter[c.METER_ENTER]();
      meter[c.METER_COMPUTE]();
      meter[c.METER_ENTER]();
    },
    { instanceOf: RangeError },
    'combined meter exhausted',
  );
  testAllExhausted(t, meter, 'combined meter');
});

test('getBalance', async t => {
  const { meter, refillFacet } = makeMeter({ budgetCompute: 10 });
  t.is(refillFacet.getComputeBalance(), 10);
  meter[c.METER_COMPUTE](3);
  t.is(refillFacet.getComputeBalance(), 7);
  t.is(refillFacet.getAllocateBalance(), c.DEFAULT_COMBINED_METER);
  t.is(refillFacet.getCombinedBalance(), c.DEFAULT_COMBINED_METER);
});

test('BigInt', async t => {
  const { meter, refillFacet } = makeMeter({ budgetAllocate: 10 });
  t.is(refillFacet.getAllocateBalance(), 10);
  meter[c.METER_ALLOCATE](BigInt('1234567890123456789012345678901234567890'));
  t.is(refillFacet.getAllocateBalance(), 6);
});
