import { makeHelpers } from '@agoric/deploy-script-support';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }) => {
  return harden({
    sourceSpec: '@agoric/orchestration/src/proposals/start-stakeOsmo.js',
    getManifestCall: [
      'getManifestForStakeOsmo',
      {
        installKeys: {
          stakeIca: publishRef(
            install('@agoric/orchestration/src/examples/stake-ica.contract.js'),
          ),
        },
      },
    ],
  });
};

export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('start-stakeOsmo', defaultProposalBuilder);
};
