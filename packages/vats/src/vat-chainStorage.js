// @ts-check
import { E, Far } from '@endo/far';
import { makeChainStorageRoot } from './lib-chainStorage.js';

export function buildRootObject(_vatPowers) {
  /**
   * @param {ERef<BridgeManager>} bridgeManager
   * @param {string} bridgeId
   * @param {string} rootPath must be unique (caller responsibility to ensure)
   * @param {object} [options]
   */
  function makeBridgedChainStorageRoot(
    bridgeManager,
    bridgeId,
    rootPath,
    options,
  ) {
    // Note that the uniqueness of rootPath is not validated here,
    // and is instead the responsibility of callers.
    const toStorage = message => E(bridgeManager).toBridge(bridgeId, message);
    const rootNode = makeChainStorageRoot(
      toStorage,
      'swingset',
      rootPath,
      options,
    );
    return rootNode;
  }

  return Far('root', {
    makeBridgedChainStorageRoot,
  });
}
