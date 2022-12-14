// @ts-check
import { Fail } from '@agoric/assert';
import { E, Far } from '@endo/far';
import { makeBridgeManager } from './bridge.js';
import { makeChainStorageRoot } from './lib-chainStorage.js';

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
   * @param {BridgeDevice} bridge
   * @param {string} bridgeId
   * @param {string} rootPath must be unique (caller responsibility to ensure)
   * @param {object} [options]
   */
  const makeBridgedChainStorageRoot = (bridge, bridgeId, rootPath, options) => {
    // Note that the uniqueness of rootPath is not validated here,
    // and is instead the responsibility of callers.

    const bridgeManager = provideManagerForBridge(bridge);
    const toStorage = obj => bridgeManager.toBridge(bridgeId, obj);

    const rootNode = makeChainStorageRoot(
      toStorage,
      'swingset',
      rootPath,
      options,
    );
    return rootNode;
  };

  return Far('root', {
    makeBridgedChainStorageRoot,
    provideManagerForBridge,
  });
}
