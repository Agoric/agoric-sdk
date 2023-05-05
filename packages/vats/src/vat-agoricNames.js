// @ts-check
// @jessy-check
import { E, Far } from '@endo/far';
import { makeNameHubKit } from './nameHub.js';

/**
 * @param {unknown} _vatPowers
 * @param {unknown} _vatParameters
 * @param {import('@agoric/vat-data').Baggage} _baggage
 */
export const buildRootObject = (_vatPowers, _vatParameters, _baggage) => {
  const kit = makeNameHubKit(); // TODO: durable
  const { nameHub: agoricNames, nameAdmin: agoricNamesAdmin } = kit;

  /**
   * @param {ERef<StorageNode>} nameStorage
   * @param {ERef<BoardVat>} vatBoard
   * @param {string[]} kinds brand, issuer, ...
   */
  const publishNameHubs = async (nameStorage, vatBoard, kinds) => {
    await Promise.all(
      kinds.map(async kind => {
        /** @type {import('./types.js').NameAdmin} */
        const kindAdmin = await E(agoricNamesAdmin).lookupAdmin(kind);

        const kindNode = await E(nameStorage).makeChildNode(kind);
        const recorderKit = await E(vatBoard).makePublishingRecorderKit(
          kindNode,
        );
        kindAdmin.onUpdate(recorderKit.recorder);
      }),
    );
  };

  return Far('vat-agoricNames', {
    getNameHub: () => agoricNames,
    getNameHubKit: () => kit,
    publishNameHubs,
  });
};
