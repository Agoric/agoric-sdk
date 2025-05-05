import { makeHelpers } from '@agoric/deploy-script-support';

/**
 * @file
 *   `agoric run scripts/smart-wallet/build-wallet-factory-with-orchestration-upgrade.js`
 * produces a proposal and permit file, as well as the necessary bundles. It
 * also prints helpful instructions for copying the files and installing them.
 */

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }) =>
  harden({
    sourceSpec:
      '@agoric/smart-wallet/src/proposals/upgrade-wallet-factory-with-orch-proposal.js',
    getManifestCall: [
      'getManifestForUpgradeWallet',
      {
        walletRef: publishRef(
          install('@agoric/smart-wallet/src/walletFactory.js'),
        ),
      },
    ],
  });

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('upgrade-wallet-factory', defaultProposalBuilder);
};
