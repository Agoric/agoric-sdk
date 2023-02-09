// @ts-check
import { Fail } from '@agoric/assert';
import { E, Far } from '@endo/far';
import { makeChainStorageRoot } from '@agoric/internal/src/lib-chainStorage.js';
import { makeBridgeManager } from './bridge.js';

export function buildRootObject(vatPowers) {
  const { D } = vatPowers;
  D || Fail`D missing in vatPowers ${Object.keys(vatPowers)}`;

  /** @type {Map<BridgeDevice, import('./types.js').BridgeManager>} */
  const bridgeToManager = new Map();

  /**
   * Obtain the single manager associated with a bridge device.
   *
   * @param {BridgeDevice} bridge
   * @returns {import('./types.js').BridgeManager}
   */
  const provideManagerForBridge = bridge => {
    let bridgeManager = bridgeToManager.get(bridge);
    if (!bridgeManager) {
      bridgeManager = makeBridgeManager(E, D, bridge);
      bridgeToManager.set(bridge, bridgeManager);
    }
    return bridgeManager;
  };

  /**
   * @param {ERef<import('./types.js').ScopedBridgeManager>} storageBridgeManager
   * @param {string} rootPath must be unique (caller responsibility to ensure)
   * @param {object} [options]
   */
  const makeBridgedChainStorageRoot = (
    storageBridgeManager,
    rootPath,
    options,
  ) => {
    // Note that the uniqueness of rootPath is not validated here,
    // and is instead the responsibility of callers.

    const toStorage = message => E(storageBridgeManager).toBridge(message);

    const rootNode = makeChainStorageRoot(toStorage, rootPath, options);
    return rootNode;
  };

  // We colocate these functions in this vat so that we don't pay extra cranks
  // to shuffle messages between a chainStorage node and the bridgeManager.
  return Far('root', {
    makeBridgedChainStorageRoot,
    provideManagerForBridge,
  });
}
