/**
 * @file Proposal Builder: Upgrade walletFactory
 *
 * Usage:
 *   agoric run build-walletFactory-upgrade.js
 */

import { makeHelpers } from '@agoric/deploy-script-support';
import { smartWalletSourceSpecRegistry } from '@agoric/smart-wallet/source-spec-registry.js';
import { getManifestForUpgrade } from '@agoric/smart-wallet/src/proposals/upgrade-walletFactory-proposal.js';
import { buildBundlePath } from '../lib/build-bundle.js';

/**
 * @import {CoreEvalBuilder} from '@agoric/deploy-script-support/src/externalTypes.js';
 * @import {DeployScriptFunction} from '@agoric/deploy-script-support/src/externalTypes.js';
 */

/** @type {CoreEvalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }) => {
  const walletFactory = smartWalletSourceSpecRegistry.walletFactory;
  const walletFactoryPath = await buildBundlePath(
    import.meta.url,
    walletFactory,
  );
  return harden({
    sourceSpec:
      '@agoric/smart-wallet/src/proposals/upgrade-walletFactory-proposal.js',
    getManifestCall: [
      getManifestForUpgrade.name,
      {
        walletFactoryRef: publishRef(
          install(walletFactory.packagePath, walletFactoryPath, {
            persist: true,
          }),
        ),
      },
    ],
  });
};

/** @type {DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('upgrade-walletFactory', defaultProposalBuilder);
};
