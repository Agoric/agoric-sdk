// @ts-check
import { Far } from '@endo/far';
import { makeDurableZone } from '@agoric/zone/durable.js';

import { provideLazy } from '@agoric/store';
import { prepareVowTools } from '@agoric/vow/vat.js';
import { prepareBridgeTargetModule } from './bridge-target.js';
import { prepareTransferTools } from './transfer.js';

export const buildRootObject = (_vatPowers, _args, baggage) => {
  const zone = makeDurableZone(baggage);

  const { makeBridgeTargetKit } = prepareBridgeTargetModule(
    zone.subZone('bridge'),
  );

  const vowTools = prepareVowTools(zone.subZone('vow'));

  const { makeTransferMiddlewareKit } = prepareTransferTools(
    zone.subZone('transfer'),
    vowTools,
  );

  /**
   * This 2-level structure is to avoid holding the bridge managers strongly, as
   * well as accommodate the lack of complex keys.
   *
   * @type {WeakMapStore<
   *   import('./types').ScopedBridgeManager<any>,
   *   MapStore<string, ReturnType<typeof makeBridgeTargetKit>>
   * >}
   */
  const managerToKits = zone.weakMapStore('managerToHandler');
  return Far('TransferVat', {
    /**
     * @template {import('@agoric/internal').BridgeIdValue} T
     * @param {import('./types').ScopedBridgeManager<T>} manager
     * @param {string} [inboundType]
     * @param {import('./bridge-target').AppTransformer} [appTransformer]
     */
    provideBridgeTargetKit(
      manager,
      inboundType = 'IBC_EVENT',
      appTransformer = undefined,
    ) {
      /** @type {MapStore<string, ReturnType<typeof makeBridgeTargetKit>>} */
      const inboundTypeToKit = provideLazy(managerToKits, manager, () =>
        zone.detached().mapStore('inboundTypeToKit'),
      );
      const kit = provideLazy(inboundTypeToKit, inboundType, () =>
        makeBridgeTargetKit(manager, inboundType, appTransformer),
      );
      return kit;
    },
    /**
     * Create middleware for exposing IBC messages to and from the underlying
     * vtransfer port as data with embedded `action` ocaps where safe.
     */
    makeTransferMiddlewareKit,
  });
};

/** @typedef {ReturnType<typeof buildRootObject>} TransferVat */
