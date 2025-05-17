import anyTest from '@endo/ses-ava/prepare-endo.js';
import type { TestFn } from 'ava';
import { DEFAULT_TIMEOUT_NS, getTimeout } from '../../tools/ibc-transfer.js';
import {
  NANOSECONDS_PER_MILLISECOND,
  SECONDS_PER_MINUTE,
  MILLISECONDS_PER_SECOND,
} from '@agoric/orchestration/src/utils/time.js';

const test = anyTest as TestFn<Record<string, never>>;

const minutesInFuture = (now: bigint, minutes = 5n) =>
  now + minutes * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

test.skip('getTimeout returns nanoseconds 5 minutes in the future', async t => {
  const now = Date.now();
  const fiveMinutesInFuture = minutesInFuture(BigInt(now));

  const timeout = getTimeout(now);
  const timeoutInMS = timeout / NANOSECONDS_PER_MILLISECOND;
  t.is(fiveMinutesInFuture, timeoutInMS);
});

test.skip('getTimeout accepts minutes in future for 2nd arg', async t => {
  const now = Date.now();
  const twoMinutesInFuture = minutesInFuture(BigInt(now), 2n);

  const timeout = getTimeout(now, 2n);
  const timeoutInMS = timeout / NANOSECONDS_PER_MILLISECOND;
  t.is(twoMinutesInFuture, timeoutInMS);
});

test('hardcoded placeholder is in the future', async t => {
  // Mon Dec 31 2029 19:00:00 GMT-0500
  const futureMs = 1893456000000;

  t.true(
    new Date(futureMs).getTime() > Date.now(),
    'futureMs is in the future',
  );

  const scaledDown = DEFAULT_TIMEOUT_NS / NANOSECONDS_PER_MILLISECOND;
  t.is(BigInt(futureMs), scaledDown, 'DEFAULT_TIMEOUT_NS is properly scaled');

  t.is(
    getTimeout(),
    DEFAULT_TIMEOUT_NS,
    'getTimeout returns DEFAULT_TIMEOUT_NS',
  );
});
