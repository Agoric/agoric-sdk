import { makeTracer } from '@agoric/internal';
import { E } from '@endo/far';

const trace = makeTracer('upgrade mintHolder', true);

export const upgradeMintHolder = async (
  {
    consume: {
      contractKits: contractKitsP,
      instancePrivateArgs: instancePrivateArgsP,
    },
  },
  options,
) => {
  const { contractRef, label } = options.options;
  assert(contractRef.bundleID, 'mintHolder bundleID not found');
  assert(label, 'mintHolder bank asset label not found');

  trace(`Start ${label} mintHolder contract upgrade`);

  const [contractKits, instancePrivateArgs] = await Promise.all([
    contractKitsP,
    instancePrivateArgsP,
  ]);

  const mintHolderKit = Array.from(contractKits.values()).filter(
    kit => kit.label && kit.label === label,
  );
  trace('mintHolderKit: ', mintHolderKit);

  const { publicFacet, adminFacet, instance } = mintHolderKit[0];

  /**
   * Ensure that publicFacet holds an issuer by calling makeEmptyPurse, the
   * core-eval will throw if otherwise.
   */
  await E(publicFacet).makeEmptyPurse();

  const privateArgs = instancePrivateArgs.get(instance);

  const upgradeResult = await E(adminFacet).upgradeContract(
    contractRef.bundleID,
    privateArgs,
  );
  trace('upgradeResult: ', upgradeResult);

  trace(`Finished ${label} mintHolder contract upgrade`);
};

export const getManifestForUpgradingMintHolder = (
  _powers,
  { contractRef, label },
) => ({
  manifest: {
    [upgradeMintHolder.name]: {
      consume: {
        contractKits: true,
        instancePrivateArgs: true,
      },
    },
  },
  options: { contractRef, label },
});
