/**
 * @file Proposal Builder: Upgrade walletFactory
 *
 * Usage:
 *   agoric run build-walletFactory-upgrade.js
 */

import { makeHelpers } from '@agoric/deploy-script-support';
import { getManifestForUpgrade } from '@agoric/smart-wallet/src/proposals/upgrade-walletFactory-proposal.js';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }) => {
  return harden({
    sourceSpec:
      '@agoric/smart-wallet/src/proposals/upgrade-walletFactory-proposal.js',
    getManifestCall: [
      getManifestForUpgrade.name,
      {
        walletFactoryRef: publishRef(
          install(
            '@agoric/smart-wallet/src/walletFactory.js',
            '../bundles/bundle-walletFactory.js',
            { persist: true },
          ),
        ),
      },
    ],
  });
};

export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('upgrade-walletFactory', defaultProposalBuilder);
};
