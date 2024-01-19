// @ts-check
import test from 'ava';

import { makeHeapZone } from '@agoric/base-zone/heap.js';
import { prepareWhenableModule } from '../src/module.js';

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
      t.truthy(reason instanceof Error);
      return 'rejected';
    },
  });
};

test('ack watcher', async t => {
  const zone = makeHeapZone();
  const { watch, when, makeWhenableKit } = prepareWhenableModule(zone);
  const makeAckWatcher = prepareAckWatcher(zone, t);

  const packet = harden({ portId: 'port-1', channelId: 'channel-1' });

  const connSend = Promise.resolve('ack');
  t.is(await when(watch(connSend, makeAckWatcher(packet))), 'fulfilled');

  const connError = Promise.reject(Error('disconnected'));
  t.is(await when(watch(connError, makeAckWatcher(packet))), 'rejected');

  const { whenable, settler } = makeWhenableKit();
  const connWhenable = Promise.resolve(whenable);
  settler.resolve('ack');
  t.is(await when(watch(connWhenable, makeAckWatcher(packet))), 'fulfilled');

  const { whenable: whenable2, settler: settler2 } = makeWhenableKit();
  const connWhenable2 = Promise.resolve(whenable2);
  settler2.resolve(whenable);
  t.is(await when(watch(connWhenable2, makeAckWatcher(packet))), 'fulfilled');

  const { whenable: whenable3, settler: settler3 } = makeWhenableKit();
  const connWhenable3 = Promise.resolve(whenable3);
  settler3.reject(Error('disco2'));
  settler3.resolve(whenable2);
  t.is(await when(watch(connWhenable3, makeAckWatcher(packet))), 'rejected');
});
