import { Fail } from '@agoric/assert';
import type { ScopedBridgeManager } from '@agoric/vats';

import {
  makePinnedHistoryTopic,
  prepareDurablePublishKit,
  subscribeEach,
} from '@agoric/notifier';
import type { Baggage } from '@agoric/swingset-liveslots';
import { M, makeScalarBigMapStore } from '@agoric/vat-data';
import { makeDurableZone } from '@agoric/zone/durable.js';
import type { ExecutionContext } from 'ava';

// TODO DRY with ibcBridgeMock.js in package boot
export const makeBridge = (
  t: ExecutionContext,
  baggage = makeScalarBigMapStore('baggage', {
    keyShape: M.string(),
    durable: true,
  }) as Baggage,
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

  const bridgeHandler: ScopedBridgeManager = zone.exo(
    'IBC Bridge Manager',
    undefined,
    {
      toBridge: async obj => {
        const { method, type, ...params } = obj;
        publisher.publish([method, params]);
        console.info('toBridge', type, method, params);
        switch (type) {
          case 'VLOCALCHAIN_ALLOCATE_ADDRESS':
            return 'agoric1fixme';
          default:
            Fail`unknown type ${type}`;
        }
        return undefined;
      },
      fromBridge: async obj => {
        console.info('fromBridge', obj);
      },
      initHandler: h => {
        if (hndlr) throw Error('already init');
        hndlr = h;
      },
      setHandler: h => {
        if (!hndlr) throw Error('must init first');
        hndlr = h;
      },
    },
  );

  return { bridgeHandler, events };
};
