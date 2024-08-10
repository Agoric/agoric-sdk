import { makeHelpers } from '@agoric/deploy-script-support';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }) =>
  harden({
    sourceSpec: '@agoric/vats/src/proposals/zcf-only-proposal.js',
    getManifestCall: [
      'getManifestForUpgradingZcf',
      {
        zcfRef: publishRef(install('@agoric/zoe/src/contractFacet/vatRoot.js')),
      },
    ],
  });

export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('upgrade-zcf', defaultProposalBuilder);
};
