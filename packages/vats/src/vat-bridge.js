import { Fail } from '@endo/errors';
import { Far } from '@endo/far';
import { makeDurableZone } from '@agoric/zone/durable.js';
import * as cb from '@agoric/internal/src/callback.js';
import { prepareChainStorageNode } from '@agoric/internal/src/lib-chainStorage.js';
import { prepareBridgeManager } from './bridge.js';

export function buildRootObject(vatPowers, _args, baggage) {
  const { D } = vatPowers;
  D || Fail`D missing in vatPowers ${Object.keys(vatPowers)}`;

  const zone = makeDurableZone(baggage);

  const provideManagerForBridge = prepareBridgeManager(
    zone.subZone('BridgeManager'),
    D,
  );
  const makeChainStorageNode = prepareChainStorageNode(
    zone.subZone('ChainStorageNode'),
  );

  /**
   * @param {ERef<import('./types.js').ScopedBridgeManager<'storage'>>} storageBridgeManagerP
   * @param {string} rootPath must be unique (caller responsibility to ensure)
   * @param {object} [options]
   */
  const makeBridgedChainStorageRoot = async (
    storageBridgeManagerP,
    rootPath,
    options,
  ) => {
    // Note that the uniqueness of rootPath is not validated here,
    // and is instead the responsibility of callers.

    const storageBridgeManager = await storageBridgeManagerP;
    const rootNode = makeChainStorageNode(
      cb.makeMethodCallback(storageBridgeManager, 'toBridge'),
      rootPath,
      options,
    );
    return rootNode;
  };

  // We colocate these functions in this vat so that we don't pay extra cranks
  // to shuffle messages between a chainStorage node and the bridgeManager.
  return Far('root', {
    makeBridgedChainStorageRoot,
    provideManagerForBridge,
  });
}
