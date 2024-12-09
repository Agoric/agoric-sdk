import { makeTracer } from '@agoric/internal';
import { E } from '@endo/far';

const trace = makeTracer('upgrade mintHolder BLD', true);

export const upgradeMintHolder = async (
  {
    consume: {
      contractKits: contractKitsP,
      instancePrivateArgs: instancePrivateArgsP,
    },
  },
  options,
) => {
  trace('Start contract upgrade');

  const { contractRef } = options.options;
  assert(contractRef.bundleID, 'mintHolder bundleID not found');

  const [contractKits, instancePrivateArgs] = await Promise.all([
    contractKitsP,
    instancePrivateArgsP,
  ]);

  const mintHolderKit = Array.from(contractKits.values()).filter(
    kit => kit.label && kit.label.match(/BLD/),
  );
  assert(mintHolderKit, ',mintHolder contract kit not found');

  const { adminFacet, instance } = mintHolderKit[0];

  const privateArgs = instancePrivateArgs.get(instance);

  const upgradeResult = await E(adminFacet).upgradeContract(
    contractRef.bundleID,
    privateArgs,
  );
  trace('upgradeResult: ', upgradeResult);

  trace('Finished contract upgrade');
};

export const getManifestForUpgradingMintHolder = (
  _powers,
  { contractRef },
) => ({
  manifest: {
    [upgradeMintHolder.name]: {
      consume: {
        contractKits: true,
        instancePrivateArgs: true,
      },
    },
  },
  options: { contractRef },
});
