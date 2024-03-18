// @ts-check
import {
  makePinnedHistoryTopic,
  prepareDurablePublishKit,
  subscribeEach,
} from '@agoric/notifier';
import { M } from '@endo/patterns';
import { makeScalarBigMapStore } from '@agoric/vat-data';
import { makeDurableZone } from '@agoric/zone/durable.js';

// TODO: factor out overlap with packages/vats/test/test-network.js
export const makeBridge = (
  t,
  baggage = makeScalarBigMapStore('baggage', {
    keyShape: M.string(),
    durable: true,
  }),
  zone = makeDurableZone(baggage),
) => {
  const makeDurablePublishKit = prepareDurablePublishKit(
    baggage,
    'DurablePublishKit',
  );

  const { subscriber, publisher } = makeDurablePublishKit();

  const pinnedHistoryTopic = makePinnedHistoryTopic(subscriber);
  const events = subscribeEach(pinnedHistoryTopic)[Symbol.asyncIterator]();

  let hndlr;
  /** @type {import('@agoric/vats/src/types.js').ScopedBridgeManager} */
  const bridgeHandler = zone.exo('IBC Bridge Manager', undefined, {
    toBridge: async obj => {
      const { method, type, ...params } = obj;
      publisher.publish([method, params]);
      t.is(type, 'IBC_METHOD');
      if (method === 'sendPacket') {
        const { packet } = params;
        return { ...packet, sequence: '39' };
      }
      return undefined;
    },
    fromBridge: async obj => {
      if (!hndlr) throw Error('no handler!');
      // EV must be late-bound; it is not availble at bridge construction time.
      const { EV } = t.context.runutils;
      await EV(hndlr).fromBridge(obj);
    },
    initHandler: h => {
      if (hndlr) throw Error('already init');
      hndlr = h;
    },
    setHandler: h => {
      if (!hndlr) throw Error('must init first');
      hndlr = h;
    },
  });

  return { bridgeHandler, events };
};
