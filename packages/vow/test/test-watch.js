// @ts-check
import test from 'ava';

import { makeHeapZone } from '@agoric/base-zone/heap.js';
import { prepareVowTools } from '../src/tools.js';

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {import('ava').ExecutionContext<unknown>} t
 */
const prepareAckWatcher = (zone, t) => {
  return zone.exoClass('AckWatcher', undefined, packet => ({ packet }), {
    onFulfilled(ack) {
      t.is(ack, 'ack');
      return 'fulfilled';
    },
    onRejected(reason) {
      t.true(reason instanceof Error);
      return 'rejected';
    },
  });
};

const runTests = async t => {
  const zone = makeHeapZone();
  const { watch, when, makeVowKit } = prepareVowTools(zone);
  const makeAckWatcher = prepareAckWatcher(zone, t);

  const packet = harden({ portId: 'port-1', channelId: 'channel-1' });

  const connSendP = Promise.resolve('ack');
  t.is(await when(watch(connSendP, makeAckWatcher(packet))), 'fulfilled');

  const connErrorP = Promise.reject(Error('disconnected'));
  t.is(await when(watch(connErrorP, makeAckWatcher(packet))), 'rejected');

  const { vow, resolver } = makeVowKit();
  const connVowP = Promise.resolve(vow);
  resolver.resolve('ack');
  t.is(await when(watch(connVowP, makeAckWatcher(packet))), 'fulfilled');
  t.is(await when(watch(vow, makeAckWatcher(packet))), 'fulfilled');

  const { vow: vow2, resolver: resolver2 } = makeVowKit();
  const connVow2P = Promise.resolve(vow2);
  resolver2.resolve(vow);
  t.is(await when(watch(connVow2P, makeAckWatcher(packet))), 'fulfilled');

  const { vow: vow3, resolver: resolver3 } = makeVowKit();
  const connVow3P = Promise.resolve(vow3);
  resolver3.reject(Error('disco2'));
  resolver3.resolve(vow2);
  t.is(await when(watch(connVow3P, makeAckWatcher(packet))), 'rejected');
};

test('ack watcher - shim', runTests);
