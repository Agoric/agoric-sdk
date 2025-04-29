import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { buildZoeManualTimer } from '@agoric/zoe/tools/manualTimer.js';
import {
  makeTimestampHelper,
  NANOSECONDS_PER_SECOND,
  SECONDS_PER_MINUTE,
} from '../../src/utils/time.js';

test('makeTimestampHelper - getCurrentTimestamp', async t => {
  const timer = buildZoeManualTimer(t.log);
  t.is(timer.getCurrentTimestamp().absValue, 0n, 'current time is 0n');

  const { getTimeoutTimestampNS } = makeTimestampHelper(timer);
  await null;
  t.is(
    await getTimeoutTimestampNS(),
    5n * SECONDS_PER_MINUTE * NANOSECONDS_PER_SECOND,
    'default timestamp is 5 minutes from current time, in nanoseconds',
  );

  t.is(
    await getTimeoutTimestampNS(1n),
    1n * NANOSECONDS_PER_SECOND,
    'timestamp is 1 second since unix epoch, in nanoseconds',
  );

  // advance timer by 3 seconds
  await timer.tickN(3);
  t.is(
    await getTimeoutTimestampNS(1n),
    (1n + 3n) * NANOSECONDS_PER_SECOND,
    'timestamp is 4 seconds since unix epoch, in nanoseconds',
  );
});

test('makeTimestampHelper - vowOrValueFromOpts', async t => {
  const timer = buildZoeManualTimer(t.log);
  await timer.tickN(2);

  const SEC = NANOSECONDS_PER_SECOND;
  const MIN = SECONDS_PER_MINUTE * NANOSECONDS_PER_SECOND;
  const helper = makeTimestampHelper(timer);
  const { vowOrValueFromOpts } = helper;
  t.is(await helper.getTimeoutTimestampNS(), 2n * SEC + 5n * MIN);
  t.is(
    await vowOrValueFromOpts(),
    2n * SEC + 5n * MIN,
    'with no opts, same as getTimeout',
  );
  const h1 = { revisionHeight: 123n, revisionNumber: 456n };
  t.is(
    await vowOrValueFromOpts({ timeoutHeight: h1 }),
    0n,
    'with timeoutHeight, zero',
  );
  t.is(
    await vowOrValueFromOpts({ timeoutTimestamp: 123_456_789n }),
    123_456_789n,
    'with timeoutTimestamp, use timeoutTimestamp',
  );
  t.is(
    await vowOrValueFromOpts({
      timeoutHeight: h1,
      timeoutTimestamp: 123_456_789n,
    }),
    123_456_789n,
    'with both, prefer timeoutTimestamp',
  );
  t.is(
    await vowOrValueFromOpts({ timeoutRelativeSeconds: 30n }),
    2n * SEC + 30n * SEC,
    'with timeoutRelativeSeconds, use add timeoutRelativeSeconds to current time',
  );
});
