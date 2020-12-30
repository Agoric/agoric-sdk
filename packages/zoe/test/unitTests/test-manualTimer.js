// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/install-ses';

// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';
import { E } from '@agoric/eventual-send';
import buildManualTimer from '../../tools/manualTimer';

test('manualTimer createNotifier', async t => {
  const manualTimer = buildManualTimer(console.log, 0);
  const notifier = await E(manualTimer).createNotifier(1, 1);
  await manualTimer.tick();
  const update1 = await E(notifier).getUpdateSince();
  t.is(update1.updateCount, 2);
  await manualTimer.tick();
  const update2 = await E(notifier).getUpdateSince(update1.updateCount);
  t.is(update2.updateCount, 3);
  t.truthy(update2.value > update1.value);
});

function makeHandler() {
  let calls = 0;
  const args = [];
  return {
    getCalls() {
      return calls;
    },
    getArgs() {
      return args;
    },
    wake(arg) {
      args.push(arg);
      calls += 1;
    },
  };
}

test('manualTimer createRepeater', async t => {
  const manualTimer = buildManualTimer(console.log, 0);
  const timestamp = await E(manualTimer).getCurrentTimestamp();
  const repeater = E(manualTimer).createRepeater(1, 1);
  const handler = makeHandler();
  await E(repeater).schedule(handler);
  await manualTimer.tick();

  t.is(1, handler.getCalls());
  t.truthy(handler.getArgs()[0] > timestamp);
});
