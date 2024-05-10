import { test } from '../tools/prepare-test-env-ava.js';
// eslint-disable-next-line import/order
import { TimeMath } from '@agoric/time';
import { buildManualTimer } from '../tools/manual-timer.js';

test('buildManualTimer', async t => {
  const mt = buildManualTimer();
  const timerBrand = mt.getTimerBrand();
  const toTS = value => TimeMath.coerceTimestampRecord(value, timerBrand);
  const p = mt.wakeAt(toTS(10n));
  mt.advanceTo(15n);
  const result = await p;
  t.deepEqual(result, toTS(15n));
});
