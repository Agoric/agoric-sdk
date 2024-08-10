import { makeHelpers } from '@agoric/deploy-script-support';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }) =>
  harden({
    sourceSpec: '@agoric/vats/src/proposals/upgrade-zoe-proposal.js',
    getManifestCall: [
      'getManifestForUpgradingZoe',
      {
        zoeRef: publishRef(install('@agoric/vats/src/vat-zoe.js')),
      },
    ],
  });

export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('upgrade-zoe', defaultProposalBuilder);
};
