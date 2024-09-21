import {
  annihilate,
  startLife,
  test,
} from '@agoric/swingset-vat/tools/prepare-strict-test-env-ava.js';

import { makeDurableZone } from '@agoric/zone/durable.js';

import { prepareVowTools } from '../vat.js';

test.serial('vow resolve across upgrade', async t => {
  annihilate();

  t.plan(1);

  await startLife(async baggage => {
    const zone = makeDurableZone(baggage, 'durableRoot');
    const vowTools = prepareVowTools(zone);
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

    const testVowKit = zone.makeOnce('testVowKit', () => vowTools.makeVowKit());

    vowTools.watch(testVowKit.vow, watcher);
  });

  await startLife(
    baggage => {
      const zone = makeDurableZone(baggage, 'durableRoot');
      prepareVowTools(zone);
      // We're only preparing the watcher exo with new behavior. The instance is
      // already attached as a watcher for the test vow
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

      /** @type {import('../src/types.js').VowResolver} */
      const testVowKitResolver = zone.makeOnce('testVowKit', () => {
        t.fail('testVowKit maker called');
      }).resolver;

      return { testVowKitResolver };
    },
    async ({ testVowKitResolver }) => {
      testVowKitResolver.resolve(42);
    },
  );
});
