// @ts-check

import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';

import '../../../exported';
import '../../internal-types';

import { makeHandle } from '../../makeHandle';
import { makeInstanceAdmin } from './instanceAdmin';

/**
 * @param {Promise<ZoeService>} zoeServicePromise
 * @param {MakeZoeInstanceStorageManager} makeZoeInstanceStorageManager
 * @param {UnwrapInstallation} unwrapInstallation
 * @returns {StartInstance}
 */
export const makeStartInstance = (
  zoeServicePromise,
  makeZoeInstanceStorageManager,
  unwrapInstallation,
) => {
  /** @type {StartInstance} */
  const startInstance = async (
    installationP,
    uncleanIssuerKeywordRecord = harden({}),
    customTerms = harden({}),
  ) => {
    const zoeService = await zoeServicePromise;
    // AWAIT ///

    const { installation, bundle } = await unwrapInstallation(installationP);
    // AWAIT ///

    const instance = makeHandle('Instance');

    const zoeInstanceStorageManager = await makeZoeInstanceStorageManager(
      installation,
      customTerms,
      uncleanIssuerKeywordRecord,
      instance,
    );
    // AWAIT ///

    const { adminNode, root } = await zoeInstanceStorageManager.createZCFVat();
    /** @type {ZCFRoot} */
    const zcfRoot = root;

    const instanceAdmin = makeInstanceAdmin(
      zoeInstanceStorageManager,
      zoeService,
      bundle,
      zcfRoot,
    );
    zoeInstanceStorageManager.addInstanceAdmin(instance, instanceAdmin);

    E(adminNode)
      .done()
      .then(
        completion => {
          instanceAdmin.exitAllSeats(completion);
          zoeInstanceStorageManager.dropInstanceAdmin(instance);
        },
        reason => {
          instanceAdmin.failAllSeats(reason);
          zoeInstanceStorageManager.dropInstanceAdmin(instance);
        },
      );

    // At this point, the contract will start executing. All must be
    // ready

    const {
      creatorFacet,
      creatorInvitation,
      publicFacet,
    } = await instanceAdmin.executeContract();

    const adminFacet = Far('adminFacet', {
      getVatShutdownPromise: () => E(adminNode).done(),
      getVatStats: () => E(adminNode).adminData(),
    });

    // Actually returned to the user.
    return {
      creatorFacet,
      creatorInvitation,
      instance,
      publicFacet,
      adminFacet,
    };
  };
  return startInstance;
};
