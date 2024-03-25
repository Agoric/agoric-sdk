// @ts-check
import test from '@endo/ses-ava/prepare-endo.js';

// eslint-disable-next-line import/order
import { makeHeapZone } from '@agoric/base-zone/heap.js';

import { prepareVowTools } from '../src/tools.js';

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {import('ava').ExecutionContext<unknown>} t
 */
const prepareAckWatcher = (zone, t) => {
  return zone.exoClass('AckWatcher', undefined, packet => ({ packet }), {
    onFulfilled(ack, ...args) {
      t.is(args.length, 1);
      t.is(args[0], 'watcher context');
      t.is(ack, 'ack');
      return 'fulfilled';
    },
    onRejected(reason, ...args) {
      t.is(args.length, 1);
      t.is(args[0], 'watcher context');
      t.true(reason instanceof Error);
      return 'rejected';
    },
  });
};

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {import('ava').ExecutionContext<unknown>} t
 */
test('ack watcher - shim', async t => {
  const zone = makeHeapZone();
  const { watch, when, makeVowKit } = prepareVowTools(zone);
  const makeAckWatcher = prepareAckWatcher(zone, t);

  const packet = harden({ portId: 'port-1', channelId: 'channel-1' });

  const connSendP = Promise.resolve('ack');
  t.is(
    await when(watch(connSendP, makeAckWatcher(packet), 'watcher context')),
    'fulfilled',
  );

  const connErrorP = Promise.reject(Error('disconnected'));
  t.is(
    await when(watch(connErrorP, makeAckWatcher(packet), 'watcher context')),
    'rejected',
  );

  const { vow, resolver } = makeVowKit();
  const connVowP = Promise.resolve(vow);
  resolver.resolve('ack');
  t.is(
    await when(watch(connVowP, makeAckWatcher(packet), 'watcher context')),
    'fulfilled',
  );
  t.is(
    await when(watch(vow, makeAckWatcher(packet), 'watcher context')),
    'fulfilled',
  );

  const { vow: vow2, resolver: resolver2 } = makeVowKit();
  const connVow2P = Promise.resolve(vow2);
  resolver2.resolve(vow);
  t.is(
    await when(watch(connVow2P, makeAckWatcher(packet), 'watcher context')),
    'fulfilled',
  );

  const { vow: vow3, resolver: resolver3 } = makeVowKit();
  const connVow3P = Promise.resolve(vow3);
  resolver3.reject(Error('disco2'));
  resolver3.resolve(vow2);
  t.is(
    await when(
      // @ts-expect-error intentional extra argument
      watch(connVow3P, makeAckWatcher(packet), 'watcher context', 'unexpected'),
    ),
    'rejected',
  );
});

test('disconnection of non-vow informs watcher', async t => {
  const zone = makeHeapZone();
  const { watch, when } = prepareVowTools(zone, {
    isRetryableReason: reason => reason === 'disconnected',
  });

  // Even though this promise is rejected with a retryable reason, there's no
  // vow before it to retry, so we pass the rejection up to the watcher.
  /* eslint-disable-next-line prefer-promise-reject-errors */
  const vow = watch(Promise.reject('disconnected'), {
    onFulfilled(value) {
      t.log(`onfulfilled ${value}`);
      t.fail('should not fulfil');
      return 'fulfilled';
    },
    onRejected(reason) {
      t.is(reason, 'disconnected');
      return `rejected ${reason}`;
    },
  });

  t.is(await when(vow), 'rejected disconnected');
});
