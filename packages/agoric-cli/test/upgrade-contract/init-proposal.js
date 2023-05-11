import { E } from '@endo/far';

/**
 * Initialize contractRef the first time.
 *
 * @param {BootstrapSpace} param0
 */
export const initContract = async ({
  consume: { zoe },
  produce: { myContractFacets },
  installation: {
    consume: { myInitInstallation },
  },
  instance: {
    produce: { myInstance },
  },
}) => {
  const instanceFacets = await E(zoe).startInstance(myInitInstallation);
  myContractFacets.reset();
  myContractFacets.resolve(instanceFacets);
  myInstance.reset();
  myInstance.resolve(instanceFacets.instance);
};

export const getManifestForInitContract = ({ restoreRef }, { contractRef }) =>
  harden({
    manifest: {
      [initContract.name]: {
        consume: {
          zoe: 'zoe',
        },
        produce: {
          myContractFacets: true,
        },
        installation: {
          consume: {
            myInitInstallation: true,
          },
        },
        instance: {
          produce: {
            myInstance: true,
          },
        },
      },
    },
    installations: {
      myInitInstallation: restoreRef(contractRef),
    },
  });
