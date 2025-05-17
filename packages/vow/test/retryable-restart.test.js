import {
  annihilate,
  getBaggage,
  nextCrank,
  startLife,
  test,
} from '@agoric/swingset-vat/tools/prepare-strict-test-env-ava.js';

import { Fail } from '@endo/errors';
import { makeDurableZone } from '@agoric/zone/durable.js';

import { prepareVowTools } from '../vat.js';

test.serial('retries on disconnection', async t => {
  annihilate();

  t.plan(1);

  await startLife(
    async baggage => {
      const zone = makeDurableZone(baggage, 'durableRoot');
      const { retryable, watch } = prepareVowTools(zone);
      const retry = retryable(zone, 'retry', async () => {
        // Never resolves, simulates external call
        await new Promise(() => {});
      });

      const watcher = zone.exo('DurableVowTestWatcher', undefined, {
        onFulfilled(value) {
          t.fail(
            `First incarnation watcher onFulfilled triggered with value ${value}`,
          );
        },
        onRejected(reason) {
          t.fail(
            `First incarnation watcher onRejected triggered with reason ${reason}`,
          );
        },
      });

      return { zone, watch, retry, watcher };
    },
    async ({ zone, watch, retry, watcher }) => {
      const result = retry();
      zone.makeOnce('result', () => result);
      watch(result, watcher);
      await nextCrank();
    },
  );

  await startLife(
    baggage => {
      const zone = makeDurableZone(baggage, 'durableRoot');
      const { retryable, when } = prepareVowTools(zone);

      // Reconnect retryable definition
      retryable(zone, 'retry', async () => {
        // Simulate call that settles
        await nextCrank();
        return 42;
      });

      zone.exo('DurableVowTestWatcher', undefined, {
        onFulfilled(value) {
          t.is(value, 42, 'vow resolved with value 42');
        },
        onRejected(reason) {
          t.fail(
            `Second incarnation watcher onRejected triggered with reason ${reason}`,
          );
        },
      });

      return { zone, when };
    },
    async ({ zone, when }) => {
      const result = zone.makeOnce('result', () => Fail`result should exist`);

      await when(result);
    },
  );
});

test.serial('errors on non durably storable arguments', async t => {
  annihilate();

  const baggage = getBaggage();
  const zone = makeDurableZone(baggage, 'durableRoot');
  const { retryable, when } = prepareVowTools(zone);

  const passthrough = retryable(zone, 'passthrough', async arg => arg);

  const nonStorableArg = {
    promise: new Promise(() => {}),
  };

  t.false(zone.isStorable(nonStorableArg), 'arg is actually non storable');

  let resultV;
  t.notThrows(() => {
    resultV = passthrough(nonStorableArg);
  }, 'retryable does not synchronously error');

  const resultP = when(resultV);
  await t.throwsAsync(
    resultP,
    { message: /^retryable arguments must be storable/ },
    'expected rejection',
  );
});
