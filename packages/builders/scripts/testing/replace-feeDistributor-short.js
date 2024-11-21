import { makeHelpers } from '@agoric/deploy-script-support';
import { getManifestForReplaceFeeDistributor } from '@agoric/inter-protocol/src/proposals/replace-fee-distributor.js';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async (_, opts) => {
  console.log('OPTS', opts);
  return harden({
    sourceSpec:
      '@agoric/inter-protocol/src/proposals/replace-fee-distributor.js',
    getManifestCall: [getManifestForReplaceFeeDistributor.name, { ...opts }],
  });
};

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);

  await writeCoreEval('replace-feeDistributor-testing', utils =>
    defaultProposalBuilder(utils, {
      collectionInterval: 30n,
      keywordShares: {
        RewardDistributor: 0n,
        Reserve: 1n,
      },
    }),
  );
};
