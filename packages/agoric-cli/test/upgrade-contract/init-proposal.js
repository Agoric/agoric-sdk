export const initContract = async ({
  consume: { zoe },
  produce: { myContractFacets },
  installation: { consume: myInitInstallation },
  instance: { produce: myInstance },
}) => {
  const instanceFacets = await zoe.startInstance(
    myInitInstallation,
    myInstance,
  );
  myContractFacets.resolve(instanceFacets);
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
