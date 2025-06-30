// @ts-check
import { Far } from '@endo/far';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { prepareVowTools } from '@agoric/vow/vat.js';

import { prepareLocalChainTools } from './localchain.js';

/**
 * @import {LocalChainPowers} from './localchain.js';
 */

export const buildRootObject = (_vatPowers, _vatParameters, baggage) => {
  const zone = makeDurableZone(baggage);
  const vowTools = prepareVowTools(zone.subZone('VowTools'));
  const powersForTransfer = zone.weakMapStore('powersForTransfer');
  const makeLocalChain = prepareLocalChainTools(zone.subZone('localchain'), {
    ...vowTools,
    powersForTransfer,
  });

  return Far('LocalChainVat', {
    /**
     * Create a local chain that allows permissionlessly making fresh local
     * chain accounts, then using them to send chain queries and transactions.
     *
     * @param {LocalChainPowers} powers
     */
    makeLocalChain(powers) {
      return makeLocalChain(powers);
    },

    /**
     * Associate a TransferMiddleware instance with its corresponding
     * ScopedBridgeManager. This is necessary because existing LocalChain
     * instances need the power to inject vtransfer messages when they initiate
     * a MsgSend.
     *
     * By using a WeakMap, we ensure that only possession of both the map and a
     * TransferMiddleware ocap can be amplified into the associated manager.
     *
     * @param {import('./transfer.js').TransferMiddleware} transfer
     * @param {Pick<
     *   import('./types.js').ScopedBridgeManager<'vtransfer'>,
     *   'fromBridge'
     * >} transferBridgeManager
     */
    linkTransferMiddlewareToBridgeManager(transfer, transferBridgeManager) {
      if (!powersForTransfer.has(transfer)) {
        powersForTransfer.init(
          transfer,
          harden({
            transferBridgeManager,
          }),
        );
        return;
      }
      const existing = powersForTransfer.get(transfer);
      const updated = harden({ ...existing, transferBridgeManager });
      powersForTransfer.set(transfer, updated);
    },
  });
};

/** @typedef {ReturnType<typeof buildRootObject>} LocalChainVat */
