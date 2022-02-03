// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';
import buildManualTimer from '../../tools/manualTimer.js';

test('manualTimer makeNotifier', async t => {
  const manualTimer = buildManualTimer(console.log, 0n);
  const notifier = await E(manualTimer).makeNotifier(1n, 1n);
  await manualTimer.tick();
  const update1 = await E(notifier).getUpdateSince();
  t.is(update1.updateCount, 2);
  await manualTimer.tick();
  const update2 = await E(notifier).getUpdateSince(update1.updateCount);
  t.is(update2.updateCount, 3);
  t.truthy(update2.value > update1.value);
});

function makeHandler() {
  let calls = 0n;
  const args = [];
  return Far('wake handler', {
    getCalls() {
      return calls;
    },
    getArgs() {
      return args;
    },
    wake(arg) {
      args.push(arg);
      calls += 1n;
    },
  });
}

test('manualTimer makeRepeater', async t => {
  const manualTimer = buildManualTimer(console.log, 0n);
  const timestamp = await E(manualTimer).getCurrentTimestamp();
  const repeater = E(manualTimer).makeRepeater(1n, 1n);
  const handler = makeHandler();
  await E(repeater).schedule(handler);
  await manualTimer.tick();

  t.is(1n, handler.getCalls());
  t.truthy(handler.getArgs()[0] > timestamp);
});
