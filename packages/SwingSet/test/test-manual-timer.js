// eslint-disable-next-line import/order
import { test } from '../tools/prepare-test-env-ava.js';

import { buildManualTimer } from '../tools/manual-timer.js';

test('buildManualTimer', async t => {
  const mt = buildManualTimer();
  const p = mt.wakeAt(10n);
  mt.advanceTo(15n);
  const result = await p;
  t.is(result, 15n);
});
