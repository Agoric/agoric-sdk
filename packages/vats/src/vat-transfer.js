// @ts-check
import { Far } from '@endo/far';
import { makeDurableZone } from '@agoric/zone/durable.js';

import { prepareBridgeTargetModule } from './bridge-target.js';
import { prepareTransferTools } from './transfer.js';

export const buildRootObject = (_vatPowers, _args, baggage) => {
  const zone = makeDurableZone(baggage);

  const { makeBridgeTargetKit } = prepareBridgeTargetModule(
    zone.subZone('bridge'),
  );

  const { makeTransferMiddleware } = prepareTransferTools(
    zone.subZone('transfer'),
  );

  /**
   * This 2-level structure is to avoid holding the bridge managers strongly, as
   * well as mitigate the lack of complex keys.
   *
   * @type {WeakMapStore<
   *   import('./types').ScopedBridgeManager,
   *   MapStore<string, ReturnType<typeof makeBridgeTargetKit>>
   * >}
   */
  const managerToKits = zone.weakMapStore('managerToHandler');
  return Far('TransferVat', {
    /**
     * @param {import('./types').ScopedBridgeManager} manager
     * @param {string} [inboundType]
     */
    provideBridgeTargetKit(manager, inboundType = 'IBC_EVENT') {
      /** @type {MapStore<string, ReturnType<typeof makeBridgeTargetKit>>} */
      let inboundTypeToKit;
      if (managerToKits.has(manager)) {
        inboundTypeToKit = managerToKits.get(manager);
      } else {
        inboundTypeToKit = zone.detached().mapStore('inboundTypeToKit');
        managerToKits.init(manager, inboundTypeToKit);
      }
      if (inboundTypeToKit.has(inboundType)) {
        return inboundTypeToKit.get(inboundType);
      }
      const kit = makeBridgeTargetKit(manager, inboundType);
      inboundTypeToKit.init(inboundType, kit);
      return kit;
    },
    /**
     * Create a middleware for exposing IBC messages to and from the underlying
     * vtransfer port as data with embedded `action` ocaps where safe.
     *
     * @param {Pick<
     *   ReturnType<typeof makeBridgeTargetKit>,
     *   'system' | 'targetRegistry'
     * >} kit
     */
    makeTransferMiddleware(kit) {
      const { system, targetRegistry } = kit;
      return makeTransferMiddleware(system, targetRegistry);
    },
  });
};

/** @typedef {ReturnType<typeof buildRootObject>} TransferVat */
