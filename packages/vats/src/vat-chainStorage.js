import { E, Far } from '@endo/far';
import { makeChainStorageRoot } from './lib-chainStorage.js';

export function buildRootObject(_vatPowers) {
  function makeBridgedChainStorageRoot(bridgeManager, bridgeId, rootKey) {
    // XXX: Should we validate uniqueness of rootKey, or is that an external concern?
    const toStorage = message => E(bridgeManager).toBridge(bridgeId, message);
    const rootNode = makeChainStorageRoot(toStorage, rootKey);
    return rootNode;
  }

  return Far('root', {
    makeBridgedChainStorageRoot,
  });
}
