import { makeHelpers } from '@agoric/deploy-script-support';
import { getManifestForReplaceFeeDistributor } from '@agoric/inter-protocol/src/proposals/replace-fee-distributor.js';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async (_, opts) => {
  const {
    collectionIntervalValue,
    keywordShares: { RewardDistributorValue, ReserveValue },
  } = opts;
  console.log('OPTS', opts)
  return harden({
    sourceSpec:
      '@agoric/inter-protocol/src/proposals/replace-fee-distributor.js',
    getManifestCall: [
      getManifestForReplaceFeeDistributor.name,
      {
        collectionInterval:
          collectionIntervalValue && BigInt(collectionIntervalValue),
        keywordShares: {
          RewardDistributor:
            RewardDistributorValue && BigInt(RewardDistributorValue),
          Reserve: ReserveValue && BigInt(ReserveValue),
        },
      },
    ],
  });
};

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);

  await writeCoreEval('replace-feeDistributor-testing', utils =>
    defaultProposalBuilder(utils, {
      collectionIntervalValue: 5,
      keywordShares: {
        RewardDistributorValue: 0,
        ReserveValue: 1,
      },
    }),
  );
};
