import { startAirdrop } from './airdrop.proposal.js';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }) => {
  return harden({
    // Somewhat unorthodox, source the exports from this builder module
    sourceSpec: '@agoric/orchestration/examples/airdrop/airdrop.proposal.js',
    getManifestCall: [
      'getManifestForAirdrop',
      {
        installKeys: {
          tribblesAirdrop: publishRef(
            install(
              '@agoric/orchestration/examples/airdrop/airdrop.contract.js',
            ),
          ),
        },
      },
    ],
  });
};

export default async (homeP, endowments) => {
  // import dynamically so the module can work in CoreEval environment
  const dspModule = await import('@agoric/deploy-script-support');
  const { makeHelpers } = dspModule;
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval(startAirdrop.name, defaultProposalBuilder);
};
