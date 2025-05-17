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
  const { contractRef, labelList } = options.options;
  assert(contractRef.bundleID, 'mintHolder bundleID not found');
  assert(labelList, 'mintHolder bank asset label list not found');

  trace(`Start mintHolder contract upgrade`);
  trace(`Assets: `, labelList);

  const [contractKits, instancePrivateArgs] = await Promise.all([
    contractKitsP,
    instancePrivateArgsP,
  ]);

  for (const assetLabel of labelList) {
    const mintHolderKit = Array.from(contractKits.values()).find(
      kit => kit.label && kit.label === assetLabel,
    );
    if (!mintHolderKit) {
      console.error(
        `ERROR: failed to upgrade ${assetLabel} mintHolder, contractKit not found`,
      );
      continue;
    }

    trace(`${assetLabel} mintHolderKit: `, mintHolderKit);

    const { publicFacet, adminFacet, instance } = mintHolderKit;

    /*
     * Ensure that publicFacet holds an issuer by verifying that has
     * the makeEmptyPurse method.
     */
    await E(publicFacet).makeEmptyPurse();

    const privateArgs = instancePrivateArgs.get(instance);

    const upgradeResult = await E(adminFacet).upgradeContract(
      contractRef.bundleID,
      privateArgs,
    );

    trace(`${assetLabel} upgrade result: `, upgradeResult);
  }

  trace(`Finished mintHolder contract upgrade`);
};

export const getManifestForUpgradingMintHolder = (
  { restoreRef },
  { contractRef, labelList },
) => ({
  manifest: {
    [upgradeMintHolder.name]: {
      consume: {
        contractKits: true,
        instancePrivateArgs: true,
      },
    },
  },
  installations: { mintHolder: restoreRef(contractRef) },
  options: { contractRef, labelList },
});
