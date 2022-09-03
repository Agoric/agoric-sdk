// @ts-check
import { Far } from '@endo/far';
import { makeChainStorageRoot } from './lib-chainStorage.js';

export function buildRootObject(vatPowers) {
  /**
   * @param {BridgeDevice} bridge
   * @param {string} bridgeId
   * @param {string} rootPath must be unique (caller responsibility to ensure)
   * @param {object} [options]
   */
  function makeBridgedChainStorageRoot(bridge, bridgeId, rootPath, options) {
    const { D } = vatPowers;
    assert(D, `D missing in vatPowers ${Object.keys(vatPowers)}`);
    // Note that the uniqueness of rootPath is not validated here,
    // and is instead the responsibility of callers.
    const toStorage = message => D(bridge).callOutbound(bridgeId, message);
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
