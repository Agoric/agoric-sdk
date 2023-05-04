// @ts-check
// @jessy-check

import { makeStoredPublishKit } from '@agoric/notifier';
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
   * @param {ERef<Marshaller>} marshaller
   * @param {string[]} kinds brand, issuer, ...
   */
  const publishNameHubs = async (nameStorage, marshaller, kinds) => {
    await Promise.all(
      kinds.map(async kind => {
        const kindAdmin = await E(agoricNamesAdmin).lookupAdmin(kind);

        const kindNode = await E(nameStorage).makeChildNode(kind);
        const { publisher } = makeStoredPublishKit(kindNode, marshaller);
        publisher.publish([]);
        kindAdmin.onUpdate(publisher);
      }),
    );
  };

  return Far('vat-agoricNames', {
    getNameHub: () => agoricNames,
    getNameHubKit: () => kit,
    publishNameHubs,
  });
};
