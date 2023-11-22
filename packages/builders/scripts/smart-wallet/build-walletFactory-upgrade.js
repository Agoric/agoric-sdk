/**
 * @file Proposal Builder: Upgrade walletFactory
 *
 * Usage:
 *   agoric run build-walletFactory-upgrade.js
 */

import { makeHelpers } from '@agoric/deploy-script-support';
import { getManifestForUpgrade } from '@agoric/smart-wallet/src/proposals/upgrade-wallet-factory-proposal.js';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').ProposalBuilder} */
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

/** @type {DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreProposal } = await makeHelpers(homeP, endowments);
  await writeCoreProposal('upgrade-walletFactory', defaultProposalBuilder);
};
