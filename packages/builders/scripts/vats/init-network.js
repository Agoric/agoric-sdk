import { makeHelpers } from '@agoric/deploy-script-support';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }) =>
  harden({
    sourceSpec: '@agoric/vats/src/proposals/network-proposal.js',
    getManifestCall: [
      'getManifestForNetwork',
      {
        networkRef: publishRef(install('@agoric/vats/src/vat-network.js')),
        ibcRef: publishRef(install('@agoric/vats/src/vat-ibc.js')),
      },
    ],
  });

export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('gov-network', defaultProposalBuilder);
};
