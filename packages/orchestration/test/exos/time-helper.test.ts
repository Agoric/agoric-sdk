/* eslint-disable @jessie.js/safe-await-separator */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { V } from '@agoric/vow/vat.js';
import { buildZoeManualTimer } from '@agoric/zoe/tools/manualTimer.js';
import { TimeMath } from '@agoric/time';
import {
  makeTimeHelper,
  NANOSECONDS_PER_SECOND,
  SECONDS_PER_MINUTE,
} from '../../src/exos/time-helper.js';

test('makeTimeHelper - getCurrentTimestamp', async t => {
  const timer = buildZoeManualTimer(t.log);
  const timerBrand = timer.getTimerBrand();
  t.is(timer.getCurrentTimestamp().absValue, 0n, 'current time is 0n');

  const timeHelper = makeTimeHelper(timer);
  t.is(
    await V.when(timeHelper.getTimeoutTimestampNS()),
    5n * SECONDS_PER_MINUTE * NANOSECONDS_PER_SECOND,
    'default timestamp is 5 minutes from current time, in nanoseconds',
  );

  t.is(
    await V.when(
      timeHelper.getTimeoutTimestampNS(
        TimeMath.coerceRelativeTimeRecord(1n, timerBrand),
      ),
    ),
    1n * NANOSECONDS_PER_SECOND,
    'timestamp is 1 second since unix epoch, in nanoseconds',
  );

  // advance timer by 3 seconds
  await timer.tickN(3);
  t.is(
    await V.when(
      timeHelper.getTimeoutTimestampNS(
        TimeMath.coerceRelativeTimeRecord(1n, timerBrand),
      ),
    ),
    (1n + 3n) * NANOSECONDS_PER_SECOND,
    'timestamp is 4 seconds since unix epoch, in nanoseconds',
  );
});
