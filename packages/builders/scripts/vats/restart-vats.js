import { makeHelpers } from '@agoric/deploy-script-support';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async () => {
  // An includelist isn't necessary because the collections are known to be complete (tested in test-vaults-upgrade.js)
  const skip = [
    // can be replaced instead of upgraded
    'auctioneer',
    'feeDistributor',
    // skip so vaultManager can have prices upon restart; these have been tested as restartable
    'scaledPriceAuthority-ATOM',
    // If this is killed, and the above is left alive, quoteNotifier throws
    'ATOM-USD_price_feed',
  ];

  return harden({
    sourceSpec: '@agoric/vats/src/proposals/restart-vats-proposal.js',
    getManifestCall: ['getManifestForRestart', harden({ skip })],
  });
};

export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('restart-vats', defaultProposalBuilder);
};
