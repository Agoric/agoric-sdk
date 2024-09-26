import { makeHelpers } from '@agoric/deploy-script-support';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async (
  { publishRef, install },
  ...args
) => {
  console.log('proposal builder:::', args);
  return harden({
    // Somewhat unorthodox, source the exports from this builder module
    sourceSpec:
      '@agoric/orchestration/src/examples/airdrop/airdrop.proposal.js',
    getManifestCall: [
      'getManifestForAirdrop',
      {
        installKeys: {
          tribblesAirdrop: publishRef(
            install(
              '@agoric/orchestration/src/examples/airdrop/airdrop.contract.js',
            ),
          ),
        },
      },
    ],
  });
};

export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('start-tribbles-airdrop', defaultProposalBuilder);
};
