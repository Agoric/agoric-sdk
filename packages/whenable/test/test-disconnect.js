// @ts-check
import test from 'ava';

import { makeHeapZone } from '@agoric/base-zone/heap.js';
import { prepareWhenableModule } from '../src/module.js';
import { makePromiseKit } from '@endo/promise-kit';

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @returns {import('ava').ImplementationFn<[]>}
 */
const testRetryOnDisconnect = zone => async t => {
  let doRetry = false;
  const rejectionMeansRetry = _e => doRetry;
  const whenable0ToEphemeral = new Map();

  const { when, makeWhenableKit } = prepareWhenableModule(zone, {
    rejectionMeansRetry,
    whenable0ToEphemeral,
  });

  for await (const watchPromise of [false, true]) {
    for await (const retry of [false, true]) {
      doRetry = retry;
      whenable0ToEphemeral.clear();

      const { whenable, settler } = makeWhenableKit();

      let resultP;
      if (watchPromise) {
        const pk = makePromiseKit();
        const p = when(whenable, {
          onFulfilled(value) {
            pk.resolve(value);
          },
          onRejected(reason) {
            pk.reject(reason);
          },
        });
        t.regex(
          await p,
          /no useful return/,
          `no useful return expected (retry=${retry}, watchPromise=${watchPromise})`,
        );
        resultP = pk.promise;
      } else {
        resultP = when(whenable);
      }
      resultP = resultP.catch(e => ['rejected', e]);

      await null; // two turns to allow the whenable0 to be registered
      await null;

      const ephemeral = [...whenable0ToEphemeral.values()];
      ephemeral[0].reject('disconnected');

      // Simulate an upgrade.
      whenable0ToEphemeral.clear();
      settler.resolve('resolved');

      if (retry) {
        t.is(
          await resultP,
          'resolved',
          `resolve expected (retry=${retry}, watchPromise=${watchPromise})`,
        );
      } else {
        t.deepEqual(
          await resultP,
          ['rejected', 'disconnected'],
          `reject expected (retry=${retry}, watchPromise=${watchPromise})`,
        );
      }
    }
  }
};

test('retry on disconnection', testRetryOnDisconnect(makeHeapZone()));
