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
  issuer,
  brand,
}) => {
  const instanceFacets = await E(zoe).startInstance(myInitInstallation);
  const terms = await E(zoe).getTerms(instanceFacets.instance);

  issuer.produce.GoodStuff.reset();
  issuer.produce.GoodStuff.resolve(terms.issuers.GoodStuff);
  brand.produce.GoodStuff.reset();
  brand.produce.GoodStuff.resolve(terms.brands.GoodStuff);

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
        issuer: { produce: { GoodStuff: true } },
        brand: { produce: { GoodStuff: true } },
      },
    },
    installations: {
      myInitInstallation: restoreRef(contractRef),
    },
  });
