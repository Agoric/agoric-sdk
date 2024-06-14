import { makeHelpers } from '@agoric/deploy-script-support';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }) =>
  harden({
    sourceSpec:
      '@agoric/inter-protocol/src/proposals/upgrade-scaledPriceAuthorities.js',
    getManifestCall: [
      'getManifestForUpgradeScaledPriceAuthorities',
      {
        scaledPARef: publishRef(
          install('@agoric/zoe/src/contracts/scaledPriceAuthority.js'),
        ),
      },
    ],
  });

export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);

  await writeCoreEval('upgradeScaledPriceAuthorities', defaultProposalBuilder);
};
