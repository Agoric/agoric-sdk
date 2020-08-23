/* eslint-disable no-await-in-loop */
import replaceGlobalMeter from '@agoric/tame-metering/src/install-global-metering';

// eslint-disable-next-line import/order
import test from 'ava';

import { makeMeter, makeWithMeter } from '../src/index';

test('meter running', async t => {
  const { meter, refillFacet } = makeMeter({ budgetCombined: 10 });
  const { withMeter, withoutMeter } = makeWithMeter(replaceGlobalMeter, meter);
  const withMeterFn = (thunk, newMeter = meter) => () =>
    withMeter(thunk, newMeter);

  t.is(new [].constructor(40).length, 40, `new [].constructor works`);

  t.is(
    withoutMeter(() => true),
    true,
    `withoutMeter works`,
  );
  t.is(
    withMeter(() => true),
    true,
    `withMeter works`,
  );

  refillFacet.combined(1000);
  t.throws(
    withMeterFn(() => new Array(10000)),
    { instanceOf: RangeError },
    'new Array exhausted',
  );

  refillFacet.combined(100);
  t.throws(
    withMeterFn(() => 'x'.repeat(10000)),
    { instanceOf: RangeError },
    'long string exhausted',
  );

  const a = new Array(10);
  refillFacet.combined(10);
  t.throws(
    withMeterFn(() => a.map(Object.create)),
    { instanceOf: RangeError },
    'map to Object create exhausted',
  );
});
