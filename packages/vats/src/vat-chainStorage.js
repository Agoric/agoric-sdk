import { E, Far } from '@endo/far';
import { makeChainStorageRoot } from './lib-chainStorage.js';

export function buildRootObject(_vatPowers) {
  function makeBridgedChainStorageRoot(bridgeManager, bridgeId, rootPath) {
    // Note that the uniqueness of rootPath is not validated here,
    // and is instead the responsibility of callers.
    const toStorage = message => E(bridgeManager).toBridge(bridgeId, message);
    const rootNode = makeChainStorageRoot(toStorage, 'swingset', rootPath);
    return rootNode;
  }

  return Far('root', {
    makeBridgedChainStorageRoot,
  });
}
