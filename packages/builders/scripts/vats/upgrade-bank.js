import { makeHelpers } from '@agoric/deploy-script-support';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }) =>
  harden({
    sourceSpec: '@agoric/vats/src/proposals/upgrade-bank-proposal.js',
    getManifestCall: [
      'getManifestForUpgradingBank',
      {
        bankRef: publishRef(install('@agoric/vats/src/vat-bank.js')),
      },
    ],
  });

export default async (homeP, endowments) => {
  const { writeCoreProposal } = await makeHelpers(homeP, endowments);
  await writeCoreProposal('upgrade-bank', defaultProposalBuilder);
};
