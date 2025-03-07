import {
  annihilate,
  startLife,
  test,
} from '@agoric/swingset-vat/tools/prepare-strict-test-env-ava.js';

import { makeDurableZone } from '@agoric/zone/durable.js';

import { makeExpectUnhandledRejection } from '@agoric/internal/src/lib-nodejs/ava-unhandled-rejection.js';
import { prepareVowTools } from '../vat.js';

const expectUnhandled = makeExpectUnhandledRejection({
  test,
  importMetaUrl: import.meta.url,
});

/**
 * We should be more explicit about why we have various unhandled rejections:
 * - add a onRejected that makes a plain assertion t.pass() (that can be
 *   accounted for in the t.plan()), before rethrowing the error.
 * - Maybe add comments about how many time the onRejected is expected to be
 *   hit, and by which vows.
 * - Add comment when resolving each vow or setting up a watch which ones are
 *   expected to create an unhandled rejection.
 *
 * XXX: Split this test up into more bite-sized pieces.
 */
test(expectUnhandled(5), 'vow resolve across upgrade', async t => {
  annihilate();

  t.plan(3);

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

    const watcher2 = zone.exo('DurableVowTestWatcher2', undefined, {
      onFulfilled(value) {
        t.is(value, 42);
        throw Error(`Error in handler ${value}`);
      },
    });

    const testVowKit = zone.makeOnce('testVowKit', () => vowTools.makeVowKit());
    const testVowKit2 = zone.makeOnce('testVowKit2', () =>
      vowTools.makeVowKit(),
    );
    const testVowKit3 = zone.makeOnce('testVowKit3', () =>
      vowTools.makeVowKit(),
    );
    const testVowKit4 = zone.makeOnce('testVowKit4', () =>
      vowTools.makeVowKit(),
    );

    vowTools.watch(testVowKit.vow, watcher);

    vowTools.watch(testVowKit2.vow, watcher2);
    const abandoned = new Promise(() => {});
    testVowKit2.resolver.resolve(abandoned);

    vowTools.watch(testVowKit3.vow, watcher2);
    testVowKit3.resolver.resolve(42);
    const nonStorable = () => 'is not storable';
    testVowKit4.resolver.reject(nonStorable);
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

      zone.exo('DurableVowTestWatcher2', undefined, {
        onFulfilled(value) {
          t.fail(
            `Second incarnation watcher2 onFulfilled triggered with value ${value}`,
          );
        },
        onRejected(value) {
          t.deepEqual(value, {
            name: 'vatUpgraded',
            upgradeMessage: 'vat upgraded',
            incarnationNumber: 1,
          });
          return Promise.reject(Error('rejection from watcher2.onRejected'));
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
