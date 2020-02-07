/* eslint-disable no-await-in-loop */
import setGlobalMeter from '@agoric/tame-metering/src/install-global-metering';

// eslint-disable-next-line import/order
import test from 'tape-promise/tape';

import { makeMeterAndResetters, makeWithMeter } from '../src/index';

test('meter running', async t => {
  try {
    const [meter, resetters] = makeMeterAndResetters({ maxCombined: 10 });
    const { withMeter, withoutMeter } = makeWithMeter(setGlobalMeter, meter);
    const withMeterFn = (thunk, newMeter = meter) => () =>
      withMeter(thunk, newMeter);

    t.equal(new [].constructor(40).length, 40, `new [].constructor works`);

    t.equal(
      withoutMeter(() => true),
      true,
      `withoutMeter works`,
    );
    t.equal(
      withMeter(() => true),
      true,
      `withMeter works`,
    );

    resetters.combined(10);
    t.throws(
      withMeterFn(() => new Array(10)),
      RangeError,
      'new Array exhausted',
    );

    resetters.combined(20);
    withMeter(() => {
      const a = new Array(10);
      withoutMeter(() =>
        t.throws(
          withMeterFn(() => a.map(Object.create)),
          RangeError,
          'map to Object create exhausted',
        ),
      );
    });
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});
